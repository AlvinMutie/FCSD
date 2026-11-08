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
};
