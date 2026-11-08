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
                        datetime.combine(curr_date, time(9, 0)),
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
                priority_score=p,
                deadline=asm.assessment_date,
                course_code=asm.course.code,
                explanation=f"Targeted preparation for upcoming {asm.assessment_type} in {days_left} days",
                related_entity_type='assessment',
                related_entity_id=asm.id
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
            sessions_needed = max(1, int(round((remaining_hours * 60) / 90)))
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
                    priority_score=p,
                    deadline=a.deadline,
                    course_code=a.course.code,
                    explanation=f"Work on assignment due {a.deadline.strftime('%b %d') if a.deadline else 'soon'}",
                    related_entity_type='assignment',
                    related_entity_id=a.id
                ))

        # 3. Academic Balanced Course Study (Ensure every course meets distinction target)
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

            gap = c.attention_gap
            sessions_to_schedule = max(1, min(3, int(round((gap * 60) / 90)))) if gap > 0 else 1
            for s_idx in range(sessions_to_schedule):
                p = self.compute_task_priority(
                    deadline=None,
                    importance=c.academic_importance,
                    difficulty=c.difficulty_level,
                    attention_gap=c.attention_gap
                )
                tasks.append(SchedulableTask(
                    id=f"crs_{c.id}_{s_idx}",
                    title=f"Study: {display_name}",
                    category='academic',
                    duration_mins=90,
                    priority_score=p,
                    course_code=c.code,
                    explanation=f"Dedicated study coverage for {c.title}",
                    related_entity_type='course',
                    related_entity_id=c.id
                ))

        # 4. Technical Skills Tracks (4 tracks: Python, Cyber, Web, Net)
        skill_tracks = [
            ('Python', 3.0),
            ('Cybersecurity', 3.0),
            ('Web Development', 3.0),
            ('Networking', 3.0),
        ]
        for track_name, weekly_target in skill_tracks:
            sessions_count = max(1, min(2, int(round(weekly_target / 1.5))))
            for s_idx in range(sessions_count):
                p = self.compute_task_priority(deadline=None, importance=3, difficulty=3)
                tasks.append(SchedulableTask(
                    id=f"skill_{track_name}_{s_idx}",
                    title=f"Technical Skill Track: {track_name}",
                    category='skill',
                    duration_mins=90,
                    priority_score=p,
                    explanation=f"Weekly technical proficiency building ({track_name})",
                    related_entity_type='skill'
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
                related_entity_type='career'
            ))

        return tasks

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

        # 5. Pack tasks into free slots
        scheduled_events: List[CalendarEvent] = []
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

        slot_idx = 0
        current_slot_pointer = None

        for task in all_tasks:
            task_duration = timedelta(minutes=task.duration_mins)
            placed = False

            while slot_idx < len(free_slots) and not placed:
                slot_start, slot_end = free_slots[slot_idx]
                if current_slot_pointer is None or current_slot_pointer < slot_start:
                    current_slot_pointer = slot_start

                task_end = current_slot_pointer + task_duration
                if task_end <= slot_end:
                    event = CalendarEvent(
                        user_id=self.user.id,
                        schedule_version_id=version.id,
                        title=task.title,
                        category=task.category,
                        start_time=current_slot_pointer,
                        end_time=task_end,
                        is_locked=False,
                        related_entity_type=task.related_entity_type,
                        related_entity_id=task.related_entity_id,
                        explanation=task.explanation
                    )
                    scheduled_events.append(event)
                    current_slot_pointer = task_end + timedelta(minutes=15)
                    placed = True
                else:
                    slot_idx += 1
                    current_slot_pointer = None

            if slot_idx >= len(free_slots):
                break  # Reached capacity, remaining lower priority tasks deferred

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
