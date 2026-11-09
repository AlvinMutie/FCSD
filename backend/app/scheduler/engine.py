import json
from dataclasses import dataclass
from datetime import datetime, date, time, timedelta, timezone
from typing import List, Dict, Optional, Tuple
from ..models import (
    db,
    User,
    AcademicTerm,
    Course,
    Assignment,
    Assessment,
    AvailabilityRule,
    CalendarEvent,
    ScheduleVersion,
    Skill,
)

@dataclass
class SchedulableTask:
    id: str
    title: str
    category: str  # 'academic', 'skill', 'career', 'project'
    duration_mins: int
    priority_score: float
    deadline: Optional[datetime] = None
    course_code: Optional[str] = None
    explanation: str = ""
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None
    round_index: int = 0

class SchedulingEngine:
    def __init__(self, user: User):
        self.user = user
        self.settings = user.settings

    def get_priority_weights(self) -> Dict[str, float]:
        if self.settings:
            return self.settings.get_priority_weights()
        return {
            'deadline_urgency': 0.35,
            'importance': 0.25,
            'impact': 0.20,
            'workload_difficulty': 0.10,
            'risk_of_falling_behind': 0.10,
        }

    def compute_task_priority(
        self,
        deadline: Optional[datetime],
        importance: int = 3,
        difficulty: int = 3,
        attention_gap: float = 0.0,
        is_assessment_prep: bool = False,
        days_to_assessment: Optional[int] = None,
    ) -> float:
        weights = self.get_priority_weights()

        # D: Deadline urgency (0 to 1)
        d_score = 0.0
        if deadline:
            now = datetime.now()
            days_left = (deadline.replace(tzinfo=None) - now).total_seconds() / 86400.0
            if days_left <= 1:
                d_score = 1.0
            elif days_left <= 3:
                d_score = 0.8
            elif days_left <= 7:
                d_score = 0.6
            elif days_left <= 14:
                d_score = 0.4
            else:
                d_score = 0.2

        # U: Importance (1-5 normalized to 0-1)
        u_score = min(1.0, max(0.0, (importance - 1) / 4.0))

        # I: Impact (default to importance)
        i_score = u_score

        # W: Workload / difficulty (1-5 normalized to 0-1)
        w_score = min(1.0, max(0.0, (difficulty - 1) / 4.0))

        # R: Risk of falling behind (proportional to attention gap)
        r_score = min(1.0, attention_gap / 5.0)

        base_priority = (
            weights.get('deadline_urgency', 0.35) * d_score
            + weights.get('importance', 0.25) * u_score
            + weights.get('impact', 0.20) * i_score
            + weights.get('workload_difficulty', 0.10) * w_score
            + weights.get('risk_of_falling_behind', 0.10) * r_score
        )

        # Distinction boosts
        balance_boost = min(0.20, attention_gap * 0.05) if attention_gap > 0 else 0.0
        exam_boost = 0.0
        if is_assessment_prep and days_to_assessment is not None:
            if days_to_assessment <= 7:
                exam_boost = 0.30
            elif days_to_assessment <= 14:
                exam_boost = 0.15

        return round(base_priority + balance_boost + exam_boost, 3)

    def get_user_availability_intervals(self, start_date: date, days_count: int = 7) -> Dict[date, List[Tuple[datetime, datetime]]]:
        """
        Retrieves active availability rules for each day of the target period.
        Defaults to sensible 08:30-12:30 and 14:00-18:00 slots if user has not set explicit rules.
        """
        rules = AvailabilityRule.query.filter_by(user_id=self.user.id, is_active=True).all()
        rules_by_day = {}
        for r in rules:
            rules_by_day.setdefault(r.day_of_week, []).append((r.start_time, r.end_time))

        availability = {}
        for i in range(days_count):
            curr_date = start_date + timedelta(days=i)
            # Python weekday: Monday is 0, Sunday is 6.
            # Convert to: Sunday=0, Monday=1, ..., Saturday=6
            dow = (curr_date.weekday() + 1) % 7

            day_slots = []
            if dow in rules_by_day:
                for s_str, e_str in rules_by_day[dow]:
                    sh, sm = map(int, s_str.split(':'))
                    eh, em = map(int, e_str.split(':'))
                    day_slots.append((
                        datetime.combine(curr_date, time(sh, sm)),
                        datetime.combine(curr_date, time(eh, em))
                    ))
            else:
                # Default availability: 09:00 - 13:00 and 15:00 - 18:30 (Sundays lighter)
                if dow == 0:  # Sunday
                    day_slots.append((
                        datetime.combine(curr_date, time(14, 0)),
                        datetime.combine(curr_date, time(18, 0))
                    ))
                else:
                    day_slots.append((
                        datetime.combine(curr_date, time(8, 0)),
                        datetime.combine(curr_date, time(13, 0))
                    ))
                    day_slots.append((
                        datetime.combine(curr_date, time(15, 0)),
                        datetime.combine(curr_date, time(18, 30))
                    ))

            availability[curr_date] = day_slots

        return availability

    def gather_schedulable_tasks(self, start_date: date, end_date: date) -> List[SchedulableTask]:
        tasks: List[SchedulableTask] = []

        # 1. Academic Assessments (CATs & Exams preparation sessions)
        assessments = (
            Assessment.query.join(Course).join(AcademicTerm)
            .filter(
                AcademicTerm.user_id == self.user.id,
                Assessment.assessment_date >= datetime.combine(start_date, time.min),
                Assessment.assessment_date <= datetime.combine(end_date + timedelta(days=14), time.max)
            )
            .all()
        )
        for asm in assessments:
            days_left = max(1, (asm.assessment_date.date() - start_date).days)
            p = self.compute_task_priority(
                deadline=asm.assessment_date,
                importance=5,
                difficulty=4,
                is_assessment_prep=True,
                days_to_assessment=days_left
            )
            tasks.append(SchedulableTask(
                id=f"asm_{asm.id}",
                title=f"Assessment Prep: {asm.course.code} - {asm.title}",
                category='academic',
                duration_mins=90,
                priority_score=p + 0.4,
                deadline=asm.assessment_date,
                course_code=asm.course.code,
                explanation=f"Targeted preparation for upcoming {asm.assessment_type} in {days_left} days",
                related_entity_type='assessment',
                related_entity_id=asm.id,
                round_index=0
            ))

        # 2. Assignments needing effort
        assignments = (
            Assignment.query.join(Course).join(AcademicTerm)
            .filter(
                AcademicTerm.user_id == self.user.id,
                Assignment.status != 'Completed',
                Assignment.status != 'Submitted'
            )
            .all()
        )
        for a in assignments:
            remaining_hours = max(0.5, a.estimated_effort_hours - a.actual_effort_hours)
            sessions_needed = max(1, min(2, int(round((remaining_hours * 60) / 90))))
            for s_idx in range(sessions_needed):
                p = self.compute_task_priority(
                    deadline=a.deadline,
                    importance=a.priority,
                    difficulty=a.course.difficulty_level,
                    attention_gap=a.course.attention_gap
                )
                tasks.append(SchedulableTask(
                    id=f"asg_{a.id}_{s_idx}",
                    title=f"Assignment Session: {a.course.code} - {a.title}",
                    category='academic',
                    duration_mins=90,
                    priority_score=p + 0.2,
                    deadline=a.deadline,
                    course_code=a.course.code,
                    explanation=f"Work on assignment due {a.deadline.strftime('%b %d') if a.deadline else 'soon'}",
                    related_entity_type='assignment',
                    related_entity_id=a.id,
                    round_index=s_idx
                ))

        # 3. Academic Balanced Course Study & Unit Revision
        courses = Course.query.join(AcademicTerm).filter(
            AcademicTerm.user_id == self.user.id,
            Course.is_archived == False
        ).all()

        for c in courses:
            clean_title = c.title
            if c.code and c.code != 'SODEL UNIT' and not clean_title.startswith(c.code):
                display_name = f"{c.code}: {clean_title}"
            else:
                display_name = clean_title

            p = self.compute_task_priority(
                deadline=None,
                importance=c.academic_importance,
                difficulty=c.difficulty_level,
                attention_gap=c.attention_gap
            )

            # Session 1: Baseline Core Study (Round 0)
            tasks.append(SchedulableTask(
                id=f"crs_{c.id}_0",
                title=f"Study: {display_name}",
                category='academic',
                duration_mins=90,
                priority_score=p,
                course_code=c.code,
                explanation=f"Core concept study for {c.title}",
                related_entity_type='course',
                related_entity_id=c.id,
                round_index=0
            ))

            # Session 2: Unit Revision (Round 1 - Guaranteed for all units)
            tasks.append(SchedulableTask(
                id=f"crs_rev_{c.id}",
                title=f"Revision: {display_name}",
                category='academic',
                duration_mins=60,
                priority_score=p + 0.1,
                course_code=c.code,
                explanation=f"Dedicated active recall & revision session for {c.title}",
                related_entity_type='course',
                related_entity_id=c.id,
                round_index=1
            ))

            # Session 3: Practice & Problem Solving (Round 2)
            tasks.append(SchedulableTask(
                id=f"crs_{c.id}_1",
                title=f"Practice: {display_name}",
                category='academic',
                duration_mins=60,
                priority_score=p,
                course_code=c.code,
                explanation=f"Practical exercises and problem solving for {c.title}",
                related_entity_type='course',
                related_entity_id=c.id,
                round_index=2
            ))

            # Session 4: Adaptive Boost / Deep Revision for high difficulty/urgent units
            has_urgent_work = any(asm.course_id == c.id for asm in assessments) or any(a.course_id == c.id for a in assignments)
            qualifies_for_boost = (
                c.difficulty_level >= 4 or
                c.academic_importance >= 5 or
                c.attention_gap >= 4.0 or
                has_urgent_work
            )

            if qualifies_for_boost:
                # Additional deep study / worked problem session for challenging units
                tasks.append(SchedulableTask(
                    id=f"crs_{c.id}_study2",
                    title=f"Study: {display_name} (Problem Solving)",
                    category='academic',
                    duration_mins=90,
                    priority_score=p + 0.05,
                    course_code=c.code,
                    explanation=f"Deep problem solving & worked examples for {c.title}",
                    related_entity_type='course',
                    related_entity_id=c.id,
                    round_index=1
                ))
                tasks.append(SchedulableTask(
                    id=f"crs_{c.id}_2",
                    title=f"Deep Exam Prep: {display_name}",
                    category='academic',
                    duration_mins=60,
                    priority_score=p + 0.05,
                    course_code=c.code,
                    explanation=f"Adaptive distinction prep & difficult topics for {c.title}",
                    related_entity_type='course',
                    related_entity_id=c.id,
                    round_index=3
                ))

        # 4. User-Defined Custom Skills (1 hour each, distributed across other days)
        user_skills = Skill.query.filter_by(user_id=self.user.id).all()
        if user_skills:
            for sk in user_skills:
                # Determine number of 1-hour sessions per week based on user target
                sessions_count = max(1, min(4, int(round(sk.weekly_target_hours or 2.0))))
                p = self.compute_task_priority(deadline=None, importance=3, difficulty=3)
                for s_idx in range(sessions_count):
                    tasks.append(SchedulableTask(
                        id=f"skill_{sk.id}_{s_idx}",
                        title=f"Skill Practice: {sk.track_name}",
                        category='skill',
                        duration_mins=60,  # Exactly 1 hour each!
                        priority_score=p,
                        explanation=f"1-hour practical skill session ({sk.track_name}) interleaved into study days",
                        related_entity_type='skill',
                        related_entity_id=sk.id,
                        round_index=s_idx
                    ))
        else:
            # When user hasn't chosen any specific skills yet:
            # In the timetable it specifies "Skills Development" (1-hour interleaved sessions)
            generic_sessions_count = 3
            p = self.compute_task_priority(deadline=None, importance=3, difficulty=3)
            for s_idx in range(generic_sessions_count):
                tasks.append(SchedulableTask(
                    id=f"skill_generic_{s_idx}",
                    title="Skills Development",
                    category='skill',
                    duration_mins=60,  # Exactly 1 hour each!
                    priority_score=p,
                    explanation="1-hour self-directed skills development session interleaved into study days",
                    related_entity_type='skill',
                    related_entity_id=None,
                    round_index=s_idx
                ))

        # 5. Career & Job Applications (based on target weekly apps)
        career_target = min(2, self.settings.career_weekly_apps_target if self.settings else 2)
        for c_idx in range(career_target):
            p = self.compute_task_priority(deadline=None, importance=3, difficulty=2)
            tasks.append(SchedulableTask(
                id=f"career_{c_idx}",
                title="Career Activity: Search & Tailor Applications",
                category='career',
                duration_mins=60,
                priority_score=p,
                explanation="Pursuing internships and technical roles",
                related_entity_type='career',
                round_index=1
            ))

        return tasks

    @staticmethod
    def classify_course_domain(code: Optional[str], title: Optional[str]) -> str:
        """
        Classifies course into 'logic_heavy' vs 'descriptive_systems' for cognitive load pairing.
        """
        text = f"{code or ''} {title or ''}".upper()
        if any(k in text for k in ['CALC', 'MATH', 'DB', 'DATABASE', 'OOP', 'PROGRAMMING', 'MWC', 'WIRELESS', 'ALGORITHM']):
            return 'logic_heavy'
        return 'descriptive_systems'

    def _pack_week_slots(
        self,
        free_slots: List[Tuple[datetime, datetime]],
        week_tasks: List[SchedulableTask],
        version_id: int,
        week_label: str = "",
        last_course_date: Optional[Dict[int, date]] = None,
        course_study_date: Optional[Dict[int, date]] = None,
    ) -> Tuple[List[CalendarEvent], List[SchedulableTask]]:
        if last_course_date is None:
            last_course_date = {}
        if course_study_date is None:
            course_study_date = {}

        scheduled_events: List[CalendarEvent] = []
        unplaced_tasks = list(week_tasks)

        # Track daily allocations to guarantee the balanced 3-unit triad:
        # Max 3 units touched per day
        # Max 2 Study sessions per day
        # Max 1 Revision session per day
        # Max 1 Skill session per day
        day_course_ids: Dict[date, set] = {}
        day_study_count: Dict[date, int] = {}
        day_revision_count: Dict[date, int] = {}
        day_skill_count: Dict[date, int] = {}
        day_domain_types: Dict[date, set] = {}

        for slot_start, slot_end in free_slots:
            curr_pointer = slot_start
            while curr_pointer < slot_end and unplaced_tasks:
                curr_date = curr_pointer.date()
                if curr_date not in day_course_ids:
                    day_course_ids[curr_date] = set()
                    day_study_count[curr_date] = 0
                    day_revision_count[curr_date] = 0
                    day_skill_count[curr_date] = 0
                    day_domain_types[curr_date] = set()

                remaining_mins = int((slot_end - curr_pointer).total_seconds() / 60)
                if remaining_mins < 45:
                    break

                best_idx = None
                best_score = -9999.0

                for idx, t in enumerate(unplaced_tasks):
                    if t.duration_mins > remaining_mins:
                        continue

                    is_study = t.title.startswith("Study:")
                    is_revision = t.title.startswith("Revision:")
                    is_skill = (t.category == 'skill' or t.title.startswith("Skill") or "Skills Development" in t.title)
                    is_career = (t.category == 'career' or "Career" in t.title)

                    # 1. No course repeated twice on the same day
                    if t.related_entity_type == 'course' and t.related_entity_id:
                        if t.related_entity_id in day_course_ids[curr_date]:
                            continue
                        # 2. Strict limit: exactly 3 academic units touched per day
                        if len(day_course_ids[curr_date]) >= 3:
                            continue

                    # 3. Target: max 2 Study sessions per day
                    if is_study and day_study_count[curr_date] >= 2:
                        continue

                    # 4. Target: max 1 Revision session per day
                    if is_revision and day_revision_count[curr_date] >= 1:
                        continue

                    # 5. Target: max 1 Skill session per day
                    if is_skill and day_skill_count[curr_date] >= 1:
                        continue

                    # Base score from priority
                    score = t.priority_score * 10.0

                    # Time of day suitability:
                    # Morning slots (08:00 - 13:00): Core Study is prioritized first to guarantee at least 3 hours (two 90m blocks: 08:00 - 11:15)!
                    if curr_pointer.hour < 13:
                        if is_study:
                            if day_study_count[curr_date] < 2:
                                score += 80.0  # Lock in both 90m study blocks first (at least 3h daily study)
                            else:
                                score += 15.0
                        elif is_revision:
                            if day_study_count[curr_date] >= 2:
                                score += 60.0  # Once 3h study is placed, place 48h revision block before lunch
                            else:
                                score += 10.0
                    else:
                        if is_revision:
                            score += 45.0
                        elif is_skill:
                            score += 40.0
                        elif is_career:
                            score += 30.0
                        elif is_study:
                            score += 10.0

                    # 48-Hour Spaced Repetition Boost for Revision:
                    if is_revision and t.related_entity_id:
                        c_id = t.related_entity_id
                        if c_id in course_study_date:
                            study_d = course_study_date[c_id]
                            gap = (curr_date - study_d).days
                            if gap == 2:
                                score += 85.0  # Perfect 48-hour recall match!
                            elif gap == 3:
                                score += 55.0
                            elif gap == 4:
                                score += 35.0
                            elif gap < 2:
                                score -= 60.0  # Too soon to revise on same/next day
                        else:
                            score += 20.0  # Previous week or initial rotation

                    # Subject Pairing Boost for Study sessions (Logic + Descriptive):
                    if is_study and t.related_entity_id:
                        c_domain = self.classify_course_domain(t.course_code, t.title)
                        if day_study_count[curr_date] == 1:
                            if c_domain not in day_domain_types[curr_date]:
                                score += 35.0  # Cognitive balance: pair logic with descriptive
                            else:
                                score -= 15.0

                    # Spacing between study sessions across days
                    if t.related_entity_type == 'course' and t.related_entity_id in last_course_date:
                        gap_days = (curr_date - last_course_date[t.related_entity_id]).days
                        if gap_days >= 2:
                            score += 10.0
                        elif gap_days == 1:
                            score -= 10.0

                    if score > best_score:
                        best_score = score
                        best_idx = idx

                # Fallback: if strict quotas weren't met but we still have >= 60 mins open in slot
                if best_idx is None and remaining_mins >= 60:
                    for idx, t in enumerate(unplaced_tasks):
                        if t.duration_mins <= remaining_mins:
                            if t.related_entity_type == 'course' and t.related_entity_id:
                                if t.related_entity_id in day_course_ids[curr_date]:
                                    continue
                                if len(day_course_ids[curr_date]) >= 3:
                                    continue
                            score = t.priority_score
                            if score > best_score:
                                best_score = score
                                best_idx = idx

                if best_idx is not None:
                    chosen_task = unplaced_tasks.pop(best_idx)
                    task_end = curr_pointer + timedelta(minutes=chosen_task.duration_mins)

                    prefix = f"{week_label} " if week_label else ""
                    event = CalendarEvent(
                        user_id=self.user.id,
                        schedule_version_id=version_id,
                        title=chosen_task.title,
                        category=chosen_task.category,
                        start_time=curr_pointer,
                        end_time=task_end,
                        is_locked=False,
                        related_entity_type=chosen_task.related_entity_type,
                        related_entity_id=chosen_task.related_entity_id,
                        explanation=f"{prefix}{chosen_task.explanation}".strip()
                    )
                    scheduled_events.append(event)

                    # Update daily trackers
                    if chosen_task.related_entity_type == 'course' and chosen_task.related_entity_id:
                        c_id = chosen_task.related_entity_id
                        day_course_ids[curr_date].add(c_id)
                        last_course_date[c_id] = curr_date

                        if chosen_task.title.startswith("Study:"):
                            day_study_count[curr_date] += 1
                            course_study_date[c_id] = curr_date
                            c_dom = self.classify_course_domain(chosen_task.course_code, chosen_task.title)
                            day_domain_types[curr_date].add(c_dom)
                        elif chosen_task.title.startswith("Revision:"):
                            day_revision_count[curr_date] += 1

                    if chosen_task.category == 'skill' or chosen_task.title.startswith("Skill") or "Skills Development" in chosen_task.title:
                        day_skill_count[curr_date] += 1

                    curr_pointer = task_end + timedelta(minutes=15)
                else:
                    break

        return scheduled_events, unplaced_tasks

    def generate_semester_schedule(
        self,
        start_date: date,
        weeks: int = 16,
        auto_approve: bool = False
    ) -> Tuple[ScheduleVersion, List[CalendarEvent], Dict]:
        """
        Generate a full-semester schedule by repeating the weekly task template
        across `weeks` consecutive weeks. Each week uses actual calendar dates.
        Existing unlocked events in the full range are cleared first.
        """
        end_date = start_date + timedelta(weeks=weeks) - timedelta(days=1)

        # Clear all previous non-locked, non-completed events across the entire semester range
        CalendarEvent.query.filter(
            CalendarEvent.user_id == self.user.id,
            CalendarEvent.is_locked == False,
            CalendarEvent.is_completed == False,
            CalendarEvent.start_time >= datetime.combine(start_date, time.min),
            CalendarEvent.start_time <= datetime.combine(end_date, time.max)
        ).delete(synchronize_session=False)
        db.session.commit()

        # Create a single ScheduleVersion spanning the full semester
        version_num = ScheduleVersion.query.filter_by(user_id=self.user.id).count() + 1
        version = ScheduleVersion(
            user_id=self.user.id,
            version_number=version_num,
            start_date=start_date,
            end_date=end_date,
            status='ACTIVE' if auto_approve else 'DRAFT',
            generation_metrics_json=json.dumps({'weeks': weeks, 'mode': 'semester'})
        )
        db.session.add(version)
        db.session.flush()

        all_scheduled_events: List[CalendarEvent] = []
        combined_overload: Dict = {
            'is_overloaded': False,
            'total_available_hours': 0.0,
            'total_needed_hours': 0.0,
            'deficit_hours': 0.0,
            'suggestion': '',
            'weeks': weeks
        }

        # Track cross-week spacing and 48-hour revision recall per course
        last_course_date: Dict[int, date] = {}
        course_study_date: Dict[int, date] = {}

        for week_idx in range(weeks):
            week_start = start_date + timedelta(weeks=week_idx)
            week_end = week_start + timedelta(days=6)

            # Get this week's availability (7 days)
            availability = self.get_user_availability_intervals(week_start, days_count=7)

            # Load locked events in this week
            existing_locked = CalendarEvent.query.filter(
                CalendarEvent.user_id == self.user.id,
                CalendarEvent.is_locked == True,
                CalendarEvent.start_time >= datetime.combine(week_start, time.min),
                CalendarEvent.end_time <= datetime.combine(week_end, time.max)
            ).all()

            # Compute free slots for the week
            free_slots: List[Tuple[datetime, datetime]] = []
            total_available_hours = 0.0

            for day, intervals in sorted(availability.items()):
                for s_time, e_time in intervals:
                    overlaps = [
                        ev for ev in existing_locked
                        if not (ev.end_time <= s_time or ev.start_time >= e_time)
                    ]
                    if not overlaps:
                        free_slots.append((s_time, e_time))
                        total_available_hours += (e_time - s_time).total_seconds() / 3600.0
                    else:
                        overlaps.sort(key=lambda x: x.start_time)
                        pointer = s_time
                        for lk in overlaps:
                            if lk.start_time > pointer:
                                free_slots.append((pointer, lk.start_time))
                                total_available_hours += (lk.start_time - pointer).total_seconds() / 3600.0
                            pointer = max(pointer, lk.end_time)
                        if pointer < e_time:
                            free_slots.append((pointer, e_time))
                            total_available_hours += (e_time - pointer).total_seconds() / 3600.0

            free_slots.sort(key=lambda x: x[0])

            # Fresh task list for each week (recurring pattern)
            week_tasks = self.gather_schedulable_tasks(week_start, week_end)
            week_tasks.sort(key=lambda x: x.priority_score, reverse=True)

            total_needed_hours = sum(t.duration_mins / 60.0 for t in week_tasks)
            is_overloaded = total_needed_hours > total_available_hours

            combined_overload['total_available_hours'] += round(total_available_hours, 1)
            combined_overload['total_needed_hours'] += round(total_needed_hours, 1)
            if is_overloaded:
                combined_overload['is_overloaded'] = True

            # Pack tasks into the week's slots using the balanced triad engine
            week_events, _ = self._pack_week_slots(
                free_slots=free_slots,
                week_tasks=week_tasks,
                version_id=version.id,
                week_label=f"[Week {week_idx + 1}/{weeks}]",
                last_course_date=last_course_date,
                course_study_date=course_study_date,
            )
            all_scheduled_events.extend(week_events)

        combined_overload['deficit_hours'] = round(
            max(0.0, combined_overload['total_needed_hours'] - combined_overload['total_available_hours']), 1
        )
        combined_overload['suggestion'] = (
            f"Semester workload fits across {weeks} weeks ({round(combined_overload['total_available_hours'],0)}h available)."
            if not combined_overload['is_overloaded']
            else f"Some weeks are overloaded. Deficit: {combined_overload['deficit_hours']}h across {weeks} weeks."
        )

        version.generation_metrics_json = json.dumps(combined_overload)
        db.session.add_all(all_scheduled_events)
        db.session.commit()

        return version, all_scheduled_events, combined_overload

    def generate_weekly_schedule(
        self,
        start_date: date,
        auto_approve: bool = False
    ) -> Tuple[ScheduleVersion, List[CalendarEvent], Dict]:
        end_date = start_date + timedelta(days=6)
        availability = self.get_user_availability_intervals(start_date, days_count=7)

        # 0. Clear previous non-locked events in this date range to strictly avoid duplicates/overlaps
        CalendarEvent.query.filter(
            CalendarEvent.user_id == self.user.id,
            CalendarEvent.is_locked == False,
            CalendarEvent.is_completed == False,
            CalendarEvent.start_time >= datetime.combine(start_date, time.min),
            CalendarEvent.start_time <= datetime.combine(end_date, time.max)
        ).delete(synchronize_session=False)
        db.session.commit()

        # 1. Load existing locked events
        existing_locked = CalendarEvent.query.filter(
            CalendarEvent.user_id == self.user.id,
            CalendarEvent.is_locked == True,
            CalendarEvent.start_time >= datetime.combine(start_date, time.min),
            CalendarEvent.end_time <= datetime.combine(end_date, time.max)
        ).all()

        # Compute net available slots by subtracting locked events
        free_slots: List[Tuple[datetime, datetime]] = []
        total_available_hours = 0.0

        for day, intervals in availability.items():
            for s_time, e_time in intervals:
                curr_slot_start = s_time
                curr_slot_end = e_time

                # Check overlaps with locked events
                overlaps = [
                    ev for ev in existing_locked
                    if not (ev.end_time <= curr_slot_start or ev.start_time >= curr_slot_end)
                ]

                if not overlaps:
                    free_slots.append((curr_slot_start, curr_slot_end))
                    total_available_hours += (curr_slot_end - curr_slot_start).total_seconds() / 3600.0
                else:
                    # Carve around locked event
                    overlaps.sort(key=lambda x: x.start_time)
                    pointer = curr_slot_start
                    for lk in overlaps:
                        if lk.start_time > pointer:
                            free_slots.append((pointer, lk.start_time))
                            total_available_hours += (lk.start_time - pointer).total_seconds() / 3600.0
                        pointer = max(pointer, lk.end_time)
                    if pointer < curr_slot_end:
                        free_slots.append((pointer, curr_slot_end))
                        total_available_hours += (curr_slot_end - pointer).total_seconds() / 3600.0

        # Sort free slots chronologically
        free_slots.sort(key=lambda x: x[0])

        # 2. Gather tasks and compute demand
        all_tasks = self.gather_schedulable_tasks(start_date, end_date)
        total_needed_hours = sum(t.duration_mins / 60.0 for t in all_tasks)

        # 3. Overload Detection
        is_overloaded = total_needed_hours > total_available_hours
        overload_hours = max(0.0, round(total_needed_hours - total_available_hours, 1))
        overload_report = {
            'is_overloaded': is_overloaded,
            'total_available_hours': round(total_available_hours, 1),
            'total_needed_hours': round(total_needed_hours, 1),
            'deficit_hours': overload_hours,
            'suggestion': (
                f"Workload exceeds available time by {overload_hours}h. Prioritizing essential academic assessments and high-gap courses. Flexible skills sessions deferred."
                if is_overloaded else "Workload fits comfortably within your configured availability."
            )
        }

        # 4. Sort tasks by priority descending
        all_tasks.sort(key=lambda x: x.priority_score, reverse=True)

        # 5. Pack tasks into free slots with Balanced Triad & 48h Spaced Repetition
        version_num = ScheduleVersion.query.filter_by(user_id=self.user.id).count() + 1
        version = ScheduleVersion(
            user_id=self.user.id,
            version_number=version_num,
            start_date=start_date,
            end_date=end_date,
            status='ACTIVE' if auto_approve else 'DRAFT',
            generation_metrics_json=json.dumps(overload_report)
        )
        db.session.add(version)
        db.session.flush()

        # Pack tasks into free slots using the balanced triad engine
        scheduled_events, _ = self._pack_week_slots(
            free_slots=free_slots,
            week_tasks=all_tasks,
            version_id=version.id,
            week_label="",
            last_course_date={},
            course_study_date={}
        )

        db.session.add_all(scheduled_events)
        db.session.commit()

        return version, scheduled_events, overload_report

    def reschedule_my_day(self, target_date: date, reference_time: Optional[datetime] = None) -> Dict:
        """
        Executes 'Reschedule My Day':
        Preserves completed and locked sessions; re-packs remaining tasks into available open slots.
        """
        start_of_day = datetime.combine(target_date, time.min)
        end_of_day = datetime.combine(target_date, time.max)
        now = reference_time or datetime.now()

        # If daytime on the target day, reschedule from now; if late night (>20:00) or test time, use start_of_day
        if now.date() == target_date and now.hour < 20:
            effective_start = now
        else:
            effective_start = start_of_day

        # Get existing events for today
        events = CalendarEvent.query.filter(
            CalendarEvent.user_id == self.user.id,
            CalendarEvent.start_time >= start_of_day,
            CalendarEvent.end_time <= end_of_day
        ).all()

        locked_or_done = [e for e in events if e.is_locked or e.is_completed]
        flexible_events = [e for e in events if not e.is_locked and not e.is_completed and not e.is_skipped]

        avail = self.get_user_availability_intervals(target_date, days_count=1)
        today_intervals = avail.get(target_date, [])
        remaining_slots: List[Tuple[datetime, datetime]] = []

        for s_t, e_t in today_intervals:
            actual_start = max(s_t, effective_start)
            if actual_start < e_t:
                # subtract locked events
                overlaps = [
                    ev for ev in locked_or_done
                    if not (ev.end_time <= actual_start or ev.start_time >= e_t)
                ]
                if not overlaps:
                    remaining_slots.append((actual_start, e_t))
                else:
                    overlaps.sort(key=lambda x: x.start_time)
                    p = actual_start
                    for lk in overlaps:
                        if lk.start_time > p:
                            remaining_slots.append((p, lk.start_time))
                        p = max(p, lk.end_time)
                    if p < e_t:
                        remaining_slots.append((p, e_t))

        # Repack flexible events
        slot_idx = 0
        current_pointer = remaining_slots[0][0] if remaining_slots else None
        rescheduled_count = 0
        unfit_events = []

        for ev in flexible_events:
            duration = ev.end_time - ev.start_time
            placed = False

            while slot_idx < len(remaining_slots):
                s_limit, e_limit = remaining_slots[slot_idx]
                if current_pointer is None or current_pointer < s_limit:
                    current_pointer = s_limit

                cand_end = current_pointer + duration
                if cand_end <= e_limit:
                    ev.start_time = current_pointer
                    ev.end_time = cand_end
                    ev.explanation = f"Rescheduled via 'Reschedule My Day' to fit remaining capacity on {target_date.strftime('%a, %b %d')}"
                    current_pointer = cand_end + timedelta(minutes=10)
                    rescheduled_count += 1
                    placed = True
                    break
                else:
                    slot_idx += 1
                    current_pointer = None

            if not placed:
                unfit_events.append(ev.title)

        db.session.commit()

        return {
            'rescheduled_count': rescheduled_count,
            'locked_preserved_count': len(locked_or_done),
            'unfit_tasks': unfit_events,
            'message': f"Day successfully rescheduled. {rescheduled_count} flexible sessions moved to open slots."
        }
