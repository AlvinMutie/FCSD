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
    }>;
    upcoming_assignments: Array<{
      id: number;
      title: string;
      course_code: string;
      deadline: string;
      priority: number;
    }>;
    upcoming_assessments: Array<{
      id: number;
      title: string;
      course_code: string;
      assessment_date: string;
      assessment_type: string;
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
