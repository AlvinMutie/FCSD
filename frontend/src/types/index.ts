export interface User {
  id: number;
  email: string;
  display_name: string;
  timezone: string;
  created_at: string;
}

export interface UserSettings {
  id: number;
  user_id: number;
  time_format: string;
  first_day_of_week: number;
  default_session_duration_mins: number;
  max_daily_study_hours: number;
  skills_daily_target_hours: number;
  career_weekly_apps_target: number;
  theme_appearance: string;
  accent_color: string;
  priority_weights: {
    deadline_urgency: number;
    importance: number;
    impact: number;
    workload_difficulty: number;
    risk_of_falling_behind: number;
  };
  dashboard_layout: {
    widgets: Array<{
      id: string;
      title: string;
      visible: boolean;
      order: number;
    }>;
  };
}

export interface AcademicTerm {
  id: number;
  user_id: number;
  name: string;
  start_date: string;
  end_date: string;
  effective_start_date?: string | null;
  study_start_date?: string | null;
  is_current: boolean;
  courses_count: number;
  total_weeks?: number;
  study_weeks?: number;
  today?: string;
}

export interface Course {
  id: number;
  term_id: number;
  code: string;
  title: string;
  lecturer_name?: string | null;
  lecturer_email?: string | null;
  difficulty_level: number;
  academic_importance: number;
  min_weekly_hours: number;
  target_weekly_hours: number;
  actual_weekly_hours: number;
  attention_gap: number;
  is_neglected: boolean;
  target_grade: string;
  is_archived: boolean;
  topics_count: number;
  mastered_topics_count: number;
  mastery_rate: number;
  assignments_count: number;
  assessments_count: number;
}

export interface CourseTopic {
  id: number;
  course_id: number;
  title: string;
  order_index: number;
  status: string; // 'Not Started' | 'Learning' | 'Practicing' | 'Needs Revision' | 'Understood' | 'Mastered'
  confidence_score: number; // 1 to 5
  last_revised_at?: string | null;
  notes?: string | null;
  revisions_count: number;
}

export interface AssignmentSubtask {
  id: number;
  assignment_id: number;
  title: string;
  estimated_mins: number;
  order_index: number;
  is_completed: boolean;
  completed_at?: string | null;
}

export interface Assignment {
  id: number;
  course_id: number;
  course_code?: string;
  course_title?: string;
  title: string;
  description?: string | null;
  assignment_type: string;
  assigned_date?: string | null;
  deadline?: string | null;
  has_explicit_time: boolean;
  estimated_effort_hours: number;
  actual_effort_hours: number;
  priority: number;
  status: string; // 'Not Started' | 'In Progress' | 'Submitted' | 'Completed' | 'Overdue'
  max_marks?: number | null;
  score_received?: number | null;
  source_system: string;
  source_url?: string | null;
  notes?: string | null;
  subtasks: AssignmentSubtask[];
  subtasks_count: number;
  completed_subtasks_count: number;
  created_at: string;
}

export interface Assessment {
  id: number;
  course_id: number;
  course_code?: string;
  course_title?: string;
  title: string;
  assessment_type: string; // 'CAT' | 'Exam' | 'Quiz'
  assessment_date: string;
  has_explicit_time: boolean;
  weight_percentage?: number | null;
  max_marks?: number | null;
  score_received?: number | null;
  preparation_progress: number; // 0 - 100
  notes?: string | null;
}

export interface AcademicResource {
  id: number;
  course_id: number;
  course_code?: string;
  topic_id?: number | null;
  title: string;
  resource_type: string; // 'URL' | 'PDF' | 'Video' | 'Note'
  file_path?: string | null;
  external_url?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface AcademicBalanceData {
  term: AcademicTerm | null;
  courses: Course[];
  total_target_hours: number;
  total_actual_hours: number;
  attention_alerts: Array<{
    course_id: number;
    code: string;
    title: string;
    severity: 'HIGH' | 'MEDIUM';
    message: string;
  }>;
  distinction_readiness_score: number;
  spaced_revision_queue: Array<{
    topic_id: number;
    topic_title: string;
    course_code: string;
    course_title: string;
    confidence_score: number;
    status: string;
    reason: string;
    recommended_mins: number;
  }>;
}

export interface SkillTrack {
  id: number;
  user_id: number;
  track_name: string;
  current_level: string;
  weekly_target_hours: number;
  color_hex: string;
  total_hours_logged: number;
  weekly_hours_logged: number;
  stages_count: number;
  tasks_count: number;
  completed_tasks_count: number;
  task_completion_rate: number;
  evidence_count: number;
}

export interface LearningTaskItem {
  id: number;
  stage_id: number;
  title: string;
  description?: string | null;
  estimated_hours: number;
  is_completed: boolean;
  completed_at?: string | null;
}

export interface LearningStageItem {
  id: number;
  skill_id: number;
  title: string;
  order_index: number;
  status: string;
  tasks: LearningTaskItem[];
  tasks_count: number;
  completed_count: number;
}

export interface LearningSessionItem {
  id: number;
  skill_id: number;
  skill_track?: string | null;
  task_id?: number | null;
  session_date: string;
  duration_mins: number;
  topic_studied: string;
  key_learnings?: string | null;
  difficulties_faced?: string | null;
  next_steps?: string | null;
}

export interface LearningEvidenceItem {
  id: number;
  skill_id: number;
  skill_track?: string | null;
  title: string;
  evidence_type: 'GitHub' | 'Project' | 'Screenshot' | 'Demo' | 'Certificate';
  url_or_path: string;
  description?: string | null;
  date_achieved: string;
}

export interface AvailabilityRuleItem {
  id: number;
  user_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface CalendarEventItem {
  id: number;
  user_id: number;
  schedule_version_id?: number | null;
  title: string;
  category: 'academic' | 'skill' | 'career' | 'project' | 'personal' | 'rest';
  start_time: string;
  end_time: string;
  is_locked: boolean;
  is_completed: boolean;
  is_skipped: boolean;
  related_entity_type?: string | null;
  related_entity_id?: number | null;
  explanation?: string | null;
  notes?: string | null;
}

export interface OverloadReport {
  is_overloaded: boolean;
  total_available_hours: number;
  total_needed_hours: number;
  deficit_hours: number;
  suggestion: string;
}

export interface ScheduleVersionItem {
  id: number;
  user_id: number;
  version_number: number;
  start_date: string;
  end_date: string;
  status: string;
  metrics: OverloadReport;
  events_count: number;
  created_at: string;
}

export interface PendingImportItem {
  id: number;
  user_id: number;
  source_system: string;
  source_url: string;
  item_type: string;
  normalized_title: string;
  normalized_course_code?: string | null;
  normalized_deadline?: string | null;
  has_explicit_time: boolean;
  status: string; // 'Pending Review' | 'Approved' | 'Rejected' | 'Needs Attention'
  potential_duplicate_id?: number | null;
  changes_diff?: any | null;
  raw_data?: any;
  created_at: string;
  reviewed_at?: string | null;
}

export interface ImportHistoryItem {
  id: number;
  target_table: string;
  target_record_id: number;
  action_taken: string;
  timestamp: string;
  item_title: string;
  source_url: string;
  item_type: string;
}

export interface IntegrationStatus {
  connected: boolean;
  pairing_token?: string | null;
  last_sync_at?: string | null;
  pending_count: number;
}

export interface DashboardOverview {
  date: string;
  timezone: string;
  todays_focus: {
    daily_priorities: string[];
    scheduled_sessions_count: number;
    completed_sessions_count: number;
    completion_percentage: number;
    next_session: any | null;
    overdue_count: number;
  };
  academic_overview: {
    active_units_count: number;
    units: Array<{
      id: number;
      code: string;
      title: string;
      target_hours: number;
      actual_hours: number;
      attention_gap: number;
      is_neglected?: boolean;
    }>;
    upcoming_assignments: Array<{
      id: number;
      title: string;
      course_code: string;
      deadline: string;
      priority: number;
      status: string;
    }>;
    upcoming_assessments: Array<{
      id: number;
      title: string;
      course_code: string;
      assessment_date: string;
      assessment_type: string;
      preparation_progress: number;
    }>;
    attention_alerts: string[];
  };
  skills_overview: {
    weekly_target_hours: number;
    completed_hours_week: number;
    remaining_hours_week: number;
    tracks: Array<{
      track: string;
      hours_week: number;
      target_week: number;
      level: string;
    }>;
  };
  career_overview: {
    saved_count: number;
    in_progress_count: number;
    interviews_count: number;
    weekly_applications: number;
    target_weekly_applications: number;
  };
  time_allocation: Array<{
    name: string;
    hours: number;
    color: string;
  }>;
  dashboard_layout: UserSettings['dashboard_layout'];
}

// ==========================================
// Career & Job Management (Phase 7)
// ==========================================

export type PipelineStage = 'Saved' | 'Preparing' | 'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Withdrawn';
export type JobType = 'Internship' | 'Attachment' | 'Entry-level' | 'Junior Developer' | 'IT Support' | 'Networking' | 'Cybersecurity' | 'Other';
export type CVCategory = 'General IT' | 'IT Support' | 'Networking' | 'Junior Developer' | 'Cybersecurity';
export type InterviewType = 'Technical' | 'HR' | 'Assessment' | 'Panel';

export interface JobOpportunityItem {
  id: number;
  user_id: number;
  title: string;
  company: string;
  location: string;
  job_type: JobType;
  description: string | null;
  requirements: string | null;
  application_url: string | null;
  closing_date: string | null;
  priority: number;
  pipeline_stage: PipelineStage;
  notes: string | null;
  has_application: boolean;
  created_at: string;
}

export interface CVDocumentItem {
  id: number;
  user_id: number;
  title: string;
  category: CVCategory;
  file_path: string | null;
  notes: string | null;
  updated_at: string;
}

export interface ApplicationItem {
  id: number;
  job_id: number;
  applied_date: string | null;
  cv_document_id: number | null;
  cover_letter_text: string | null;
  contact_person: string | null;
  contact_email: string | null;
  notes: string | null;
  interviews_count: number;
}

export interface ChecklistItem {
  item: string;
  done: boolean;
}

export interface InterviewPrepItem {
  id: number;
  application_id: number;
  scheduled_at: string;
  interview_type: InterviewType;
  checklist: ChecklistItem[];
  company_research: string | null;
  technical_questions: string | null;
  feedback: string | null;
}

export interface SkillsGapMatch {
  skill: string;
  status: 'Strong Match' | 'Developing';
  detail: string;
}

export interface SkillsGapItemType {
  skill: string;
  suggestion: string;
}

export interface SkillsGapAnalysis {
  opportunity: JobOpportunityItem;
  matched_skills: SkillsGapMatch[];
  gap_skills: SkillsGapItemType[];
  readiness_indicator: 'High Match' | 'Moderate Match' | 'Prerequisites Needed';
}

export interface OpportunitiesResponse {
  opportunities: JobOpportunityItem[];
  stage_counts: Record<string, number>;
  total_count: number;
}
