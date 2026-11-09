import {
  User,
  UserSettings,
  DashboardOverview,
  AcademicTerm,
  Course,
  CourseTopic,
  Assignment,
  AssignmentSubtask,
  Assessment,
  AcademicResource,
  AcademicBalanceData,
  JobOpportunityItem,
  CVDocumentItem,
  InterviewPrepItem,
  OpportunitiesResponse,
  SkillsGapAnalysis,
} from '../types';

const BASE_URL = '/api';

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ user: User; settings: UserSettings }> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async register(email: string, password: string, display_name: string): Promise<{ user: User; settings: UserSettings }> {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, display_name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  },

  async logout(): Promise<void> {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },

  async getCurrentUser(): Promise<{ authenticated: boolean; user?: User; settings?: UserSettings }> {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      credentials: 'include',
    });
    if (!res.ok) return { authenticated: false };
    return res.json();
  },

  // Settings
  async getSettings(): Promise<{ user: User; settings: UserSettings }> {
    const res = await fetch(`${BASE_URL}/settings`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch settings');
    return data;
  },

  async updateSettings(payload: Partial<UserSettings> & { display_name?: string; timezone?: string }): Promise<{ user: User; settings: UserSettings }> {
    const res = await fetch(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update settings');
    return data;
  },

  // Dashboard
  async getDashboardOverview(): Promise<DashboardOverview> {
    const res = await fetch(`${BASE_URL}/dashboard/overview`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch dashboard overview');
    return data;
  },

  // Academics - Terms
  async getTerms(): Promise<{ terms: AcademicTerm[] }> {
    const res = await fetch(`${BASE_URL}/academics/terms`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch academic terms');
    return data;
  },

  async createTerm(payload: Partial<AcademicTerm>): Promise<{ term: AcademicTerm }> {
    const res = await fetch(`${BASE_URL}/academics/terms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create term');
    return data;
  },

  // Academics - Courses
  async getCourses(termId?: number): Promise<{ courses: Course[] }> {
    const url = termId ? `${BASE_URL}/academics/courses?term_id=${termId}` : `${BASE_URL}/academics/courses`;
    const res = await fetch(url, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch courses');
    return data;
  },

  async createCourse(payload: Partial<Course>): Promise<{ course: Course }> {
    const res = await fetch(`${BASE_URL}/academics/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create course');
    return data;
  },

  async updateCourse(id: number, payload: Partial<Course>): Promise<{ course: Course }> {
    const res = await fetch(`${BASE_URL}/academics/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update course');
    return data;
  },

  async deleteCourse(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/academics/courses/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete course');
  },

  // Academics - Topics & Revision
  async getCourseTopics(courseId: number): Promise<{ topics: CourseTopic[] }> {
    const res = await fetch(`${BASE_URL}/academics/courses/${courseId}/topics`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch topics');
    return data;
  },

  async createTopic(courseId: number, payload: { title: string; confidence_score?: number; notes?: string }): Promise<{ topic: CourseTopic }> {
    const res = await fetch(`${BASE_URL}/academics/courses/${courseId}/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create topic');
    return data;
  },

  async reviseTopic(topicId: number, payload: { duration_mins: number; confidence_after: number; notes?: string }): Promise<{ topic: CourseTopic; course: Course }> {
    const res = await fetch(`${BASE_URL}/academics/topics/${topicId}/revise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record revision');
    return data;
  },

  // Academics - Assignments & Subtasks
  async getAssignments(courseId?: number, status?: string): Promise<{ assignments: Assignment[] }> {
    const params = new URLSearchParams();
    if (courseId) params.append('course_id', courseId.toString());
    if (status) params.append('status', status);
    const res = await fetch(`${BASE_URL}/academics/assignments?${params.toString()}`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch assignments');
    return data;
  },

  async createAssignment(payload: any): Promise<{ assignment: Assignment }> {
    const res = await fetch(`${BASE_URL}/academics/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create assignment');
    return data;
  },

  async updateAssignment(id: number, payload: any): Promise<{ assignment: Assignment }> {
    const res = await fetch(`${BASE_URL}/academics/assignments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update assignment');
    return data;
  },

  async deleteAssignment(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/academics/assignments/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete assignment');
  },

  async addSubtask(assignmentId: number, title: string, estimatedMins = 60): Promise<{ subtask: AssignmentSubtask }> {
    const res = await fetch(`${BASE_URL}/academics/assignments/${assignmentId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title, estimated_mins: estimatedMins }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add subtask');
    return data;
  },

  async toggleSubtask(subtaskId: number): Promise<{ subtask: AssignmentSubtask }> {
    const res = await fetch(`${BASE_URL}/academics/subtasks/${subtaskId}/toggle`, {
      method: 'PATCH',
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to toggle subtask');
    return data;
  },

  // Academics - Assessments (CATs & Exams)
  async getAssessments(courseId?: number): Promise<{ assessments: Assessment[] }> {
    const url = courseId ? `${BASE_URL}/academics/assessments?course_id=${courseId}` : `${BASE_URL}/academics/assessments`;
    const res = await fetch(url, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch assessments');
    return data;
  },

  async createAssessment(payload: any): Promise<{ assessment: Assessment }> {
    const res = await fetch(`${BASE_URL}/academics/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create assessment');
    return data;
  },

  async updateAssessment(id: number, payload: any): Promise<{ assessment: Assessment }> {
    const res = await fetch(`${BASE_URL}/academics/assessments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update assessment');
    return data;
  },

  // Academics - Balance Engine
  async getAcademicBalance(): Promise<AcademicBalanceData> {
    const res = await fetch(`${BASE_URL}/academics/balance`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch academic balance');
    return data;
  },

  // Integrations & MyLife Bridge
  async getIntegrationStatus(): Promise<any> {
    const res = await fetch(`${BASE_URL}/integrations/sodel/status`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch integration status');
    return data;
  },

  async connectIntegration(): Promise<{ pairing_token: string }> {
    const res = await fetch(`${BASE_URL}/integrations/sodel/connect`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to connect integration');
    return data;
  },

  async disconnectIntegration(): Promise<void> {
    const res = await fetch(`${BASE_URL}/integrations/sodel/disconnect`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to disconnect');
  },

  async getPendingImports(status = 'ALL'): Promise<{ pending_imports: any[] }> {
    const res = await fetch(`${BASE_URL}/integrations/sodel/pending?status=${status}`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch pending imports');
    return data;
  },

  async reviewPendingImport(importId: number, decision: string, edits: any = {}): Promise<any> {
    const res = await fetch(`${BASE_URL}/integrations/sodel/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        import_id: importId,
        decision,
        ...edits,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to review import');
    return data;
  },

  async reviewBatchPendingImports(decision: 'APPROVE' | 'REJECT', itemType?: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/integrations/sodel/review-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        decision,
        item_type: itemType,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to execute batch import review');
    return data;
  },

  async getImportHistory(): Promise<{ history: any[] }> {
    const res = await fetch(`${BASE_URL}/integrations/sodel/history`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch history');
    return data;
  },

  // Scheduling Engine & Timetable
  async getAvailability(): Promise<{ rules: any[] }> {
    const res = await fetch(`${BASE_URL}/scheduler/availability`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch availability');
    return data;
  },

  async addAvailability(rule: { day_of_week: number; start_time: string; end_time: string }): Promise<{ rule: any }> {
    const res = await fetch(`${BASE_URL}/scheduler/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(rule),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add availability rule');
    return data;
  },

  async deleteAvailability(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/scheduler/availability/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete availability rule');
  },

  async generateWeeklySchedule(startDate?: string, autoApprove = true): Promise<any> {
    const res = await fetch(`${BASE_URL}/scheduler/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ start_date: startDate, auto_approve: autoApprove }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate weekly timetable');
    return data;
  },

  async clearCalendarEvents(startDate?: string, endDate?: string): Promise<{ message: string; deleted_count: number }> {
    const res = await fetch(`${BASE_URL}/scheduler/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ start_date: startDate, end_date: endDate }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to clear events');
    return data;
  },

  async rescheduleToday(targetDate?: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/scheduler/reschedule-today`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ target_date: targetDate }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reschedule today');
    return data;
  },

  async getCalendarEvents(start?: string, end?: string): Promise<{ events: any[] }> {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    const res = await fetch(`${BASE_URL}/scheduler/events?${params.toString()}`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch calendar events');
    return data;
  },

  async createCalendarEvent(payload: any): Promise<{ event: any }> {
    const res = await fetch(`${BASE_URL}/scheduler/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create event');
    return data;
  },

  async updateCalendarEvent(id: number, payload: any): Promise<{ event: any }> {
    const res = await fetch(`${BASE_URL}/scheduler/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update event');
    return data;
  },

  async deleteCalendarEvent(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/scheduler/events/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete event');
  },

  // Skills Development
  async getSkillsTracks(): Promise<{ tracks: any[]; total_weekly_target: number; total_weekly_logged: number; completion_percentage: number }> {
    const res = await fetch(`${BASE_URL}/skills/tracks`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch skill tracks');
    return data;
  },

  async updateSkillTrack(id: number, payload: any): Promise<{ track: any }> {
    const res = await fetch(`${BASE_URL}/skills/tracks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update track');
    return data;
  },

  async getSkillRoadmap(skillId: number): Promise<{ track: any; stages: any[] }> {
    const res = await fetch(`${BASE_URL}/skills/tracks/${skillId}/roadmap`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch roadmap');
    return data;
  },

  async addSkillStage(skillId: number, title: string): Promise<{ stage: any }> {
    const res = await fetch(`${BASE_URL}/skills/tracks/${skillId}/stages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add stage');
    return data;
  },

  async addSkillTask(stageId: number, payload: { title: string; estimated_hours: number; description?: string }): Promise<{ task: any }> {
    const res = await fetch(`${BASE_URL}/skills/stages/${stageId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add task');
    return data;
  },

  async toggleSkillTask(taskId: number): Promise<{ task: any }> {
    const res = await fetch(`${BASE_URL}/skills/tasks/${taskId}/toggle`, {
      method: 'PATCH',
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to toggle task');
    return data;
  },

  async getSkillSessions(skillId?: number): Promise<{ sessions: any[] }> {
    const url = skillId ? `${BASE_URL}/skills/sessions?skill_id=${skillId}` : `${BASE_URL}/skills/sessions`;
    const res = await fetch(url, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch learning sessions');
    return data;
  },

  async recordSkillSession(payload: any): Promise<{ session: any }> {
    const res = await fetch(`${BASE_URL}/skills/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record session');
    return data;
  },

  async getSkillEvidence(skillId?: number): Promise<{ evidence: any[] }> {
    const url = skillId ? `${BASE_URL}/skills/evidence?skill_id=${skillId}` : `${BASE_URL}/skills/evidence`;
    const res = await fetch(url, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch practical evidence');
    return data;
  },

  async addSkillEvidence(payload: any): Promise<{ evidence: any }> {
    const res = await fetch(`${BASE_URL}/skills/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add evidence');
    return data;
  },

  async deleteSkillEvidence(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/skills/evidence/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete evidence');
  },

  // ==========================================
  // Career & Job Management (Phase 7)
  // ==========================================

  async getOpportunities(stage?: string): Promise<OpportunitiesResponse> {
    const params = stage ? `?stage=${encodeURIComponent(stage)}` : '';
    const res = await fetch(`${BASE_URL}/career/opportunities${params}`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load opportunities');
    return data;
  },

  async createOpportunity(payload: {
    title: string; company: string; location?: string; job_type?: string;
    description?: string; requirements?: string; application_url?: string;
    closing_date?: string; priority?: number; pipeline_stage?: string; notes?: string;
  }): Promise<{ message: string; opportunity: JobOpportunityItem }> {
    const res = await fetch(`${BASE_URL}/career/opportunities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create opportunity');
    return data;
  },

  async updateOpportunityStage(id: number, pipeline_stage: string): Promise<{ message: string; opportunity: JobOpportunityItem }> {
    const res = await fetch(`${BASE_URL}/career/opportunities/${id}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pipeline_stage }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update stage');
    return data;
  },

  async deleteOpportunity(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/career/opportunities/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete opportunity');
  },

  async getCVs(): Promise<{ cv_documents: CVDocumentItem[] }> {
    const res = await fetch(`${BASE_URL}/career/cv-documents`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load CVs');
    return data;
  },

  async addCV(payload: { title: string; category?: string; file_path?: string; notes?: string }): Promise<{ message: string; cv_document: CVDocumentItem }> {
    const res = await fetch(`${BASE_URL}/career/cv-documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add CV');
    return data;
  },

  async deleteCV(id: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/career/cv-documents/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete CV');
  },

  async getInterviews(): Promise<{ interviews: InterviewPrepItem[] }> {
    const res = await fetch(`${BASE_URL}/career/interviews`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load interviews');
    return data;
  },

  async createInterview(payload: {
    opportunity_id: number; scheduled_at: string; interview_type?: string;
    company_research?: string; technical_questions?: string;
  }): Promise<{ message: string; interview: InterviewPrepItem }> {
    const res = await fetch(`${BASE_URL}/career/interviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create interview');
    return data;
  },

  async getSkillsGap(opportunityId: number): Promise<SkillsGapAnalysis> {
    const res = await fetch(`${BASE_URL}/career/skills-gap/${opportunityId}`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load skills gap');
    return data;
  },
};
