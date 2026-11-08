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
  is_current: boolean;
  courses_count: number;
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
