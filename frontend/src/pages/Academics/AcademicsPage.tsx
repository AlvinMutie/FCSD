import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Plus,
  Clock,
  Layers,
  ChevronRight,
  TrendingUp,
  Star,
  FileText,
  CheckSquare,
  Square,
  Award,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  Course,
  CourseTopic,
  Assignment,
  Assessment,
  AcademicBalanceData,
  AcademicTerm,
} from '../../types';
import { SemesterSetupModal } from '../../components/SemesterSetupModal';

export const AcademicsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'balance' | 'courses' | 'assignments' | 'assessments'>('balance');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [balanceData, setBalanceData] = useState<AcademicBalanceData | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);

  // Selected course for topic inspection
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [courseTopics, setCourseTopics] = useState<CourseTopic[]>([]);

  // Modals state
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [showAddAssignmentModal, setShowAddAssignmentModal] = useState(false);
  const [showAddAssessmentModal, setShowAddAssessmentModal] = useState(false);
  const [showReviseModal, setShowReviseModal] = useState<CourseTopic | null>(null);

  // Form states
  const [newCourse, setNewCourse] = useState({
    code: '',
    title: '',
    lecturer_name: '',
    difficulty_level: 3,
    academic_importance: 4,
    min_weekly_hours: 4.0,
    target_weekly_hours: 6.0,
  });

  const [newTopic, setNewTopic] = useState({
    title: '',
    confidence_score: 1,
    notes: '',
  });

  const [newAssignment, setNewAssignment] = useState({
    course_id: 0,
    title: '',
    assignment_type: 'Assignment',
    deadline: '',
    estimated_effort_hours: 3.0,
    priority: 3,
    description: '',
    subtask1: '',
    subtask2: '',
    subtask3: '',
  });

  const [newAssessment, setNewAssessment] = useState({
    course_id: 0,
    title: '',
    assessment_type: 'CAT',
    assessment_date: '',
    weight_percentage: 15.0,
    notes: '',
  });

  const [reviseDuration, setReviseDuration] = useState(45);
  const [reviseConfidence, setReviseConfidence] = useState(4);
  const [reviseNotes, setReviseNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [bal, crs, asg, asm, trm] = await Promise.all([
        api.getAcademicBalance(),
        api.getCourses(),
        api.getAssignments(),
        api.getAssessments(),
        api.getTerms(),
      ]);
      setBalanceData(bal);
      setCourses(crs.courses);
      setAssignments(asg.assignments);
      setAssessments(asm.assessments);
      setTerms(trm.terms);

      if (crs.courses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(crs.courses[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load academic records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      api.getCourseTopics(selectedCourseId)
        .then((res) => setCourseTopics(res.topics))
        .catch((err) => console.error(err));
    }
  }, [selectedCourseId]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terms.length) return;
    try {
      await api.createCourse({
        term_id: terms[0].id,
        code: newCourse.code,
        title: newCourse.title,
        lecturer_name: newCourse.lecturer_name,
        difficulty_level: Number(newCourse.difficulty_level),
        academic_importance: Number(newCourse.academic_importance),
        min_weekly_hours: Number(newCourse.min_weekly_hours),
        target_weekly_hours: Number(newCourse.target_weekly_hours),
      });
      setShowAddCourseModal(false);
      setNewCourse({
        code: '',
        title: '',
        lecturer_name: '',
        difficulty_level: 3,
        academic_importance: 4,
        min_weekly_hours: 4.0,
        target_weekly_hours: 6.0,
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    try {
      await api.createTopic(selectedCourseId, {
        title: newTopic.title,
        confidence_score: Number(newTopic.confidence_score),
        notes: newTopic.notes,
      });
      setShowAddTopicModal(false);
      setNewTopic({ title: '', confidence_score: 1, notes: '' });
      const res = await api.getCourseTopics(selectedCourseId);
      setCourseTopics(res.topics);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRecordRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReviseModal) return;
    try {
      await api.reviseTopic(showReviseModal.id, {
        duration_mins: Number(reviseDuration),
        confidence_after: Number(reviseConfidence),
        notes: reviseNotes,
      });
      setShowReviseModal(null);
      setReviseNotes('');
      if (selectedCourseId) {
        const res = await api.getCourseTopics(selectedCourseId);
        setCourseTopics(res.topics);
      }
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const courseId = Number(newAssignment.course_id || (courses[0]?.id ?? 0));
    if (!courseId) return;

    const subtasks = [];
    if (newAssignment.subtask1.trim()) subtasks.push({ title: newAssignment.subtask1.trim(), estimated_mins: 60 });
    if (newAssignment.subtask2.trim()) subtasks.push({ title: newAssignment.subtask2.trim(), estimated_mins: 60 });
    if (newAssignment.subtask3.trim()) subtasks.push({ title: newAssignment.subtask3.trim(), estimated_mins: 60 });

    try {
      await api.createAssignment({
        course_id: courseId,
        title: newAssignment.title,
        assignment_type: newAssignment.assignment_type,
        deadline: newAssignment.deadline || undefined,
        estimated_effort_hours: Number(newAssignment.estimated_effort_hours),
        priority: Number(newAssignment.priority),
        description: newAssignment.description,
        subtasks,
      });
      setShowAddAssignmentModal(false);
      setNewAssignment({
        course_id: 0,
        title: '',
        assignment_type: 'Assignment',
        deadline: '',
        estimated_effort_hours: 3.0,
        priority: 3,
        description: '',
        subtask1: '',
        subtask2: '',
        subtask3: '',
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleSubtask = async (subtaskId: number) => {
    try {
      await api.toggleSubtask(subtaskId);
      const res = await api.getAssignments();
      setAssignments(res.assignments);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    const courseId = Number(newAssessment.course_id || (courses[0]?.id ?? 0));
    if (!courseId || !newAssessment.assessment_date) return;
    try {
      await api.createAssessment({
        course_id: courseId,
        title: newAssessment.title,
        assessment_type: newAssessment.assessment_type,
        assessment_date: newAssessment.assessment_date,
        weight_percentage: Number(newAssessment.weight_percentage),
        notes: newAssessment.notes,
      });
      setShowAddAssessmentModal(false);
      setNewAssessment({
        course_id: 0,
        title: '',
        assessment_type: 'CAT',
        assessment_date: '',
        weight_percentage: 15.0,
        notes: '',
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Academic Management</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              <span>Distinction Track</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            JKUAT SODeL BSc IT &bull; Equal Unit Attention &bull; Topic Mastery &bull; Balanced Planning
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('balance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'balance' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Balance & Distinction
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'courses' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Units & Topics ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'assignments' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Assignments ({assignments.length})
          </button>
          <button
            onClick={() => setActiveTab('assessments')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'assessments' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CATs & Exams ({assessments.length})
          </button>
        </div>
      </div>

      {/* Semester Period & Timeline Configuration Banner */}
      {terms.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-100">{terms[0].name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                  {terms[0].study_weeks ? `${terms[0].study_weeks} Study Weeks Active` : 'Nov 9 → Dec 31'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Official: <span className="text-slate-300">{terms[0].start_date}</span> → <span className="text-slate-300">{terms[0].end_date}</span>
                {' · '}Enrolled / Classes Started: <span className="text-indigo-300 font-semibold">{terms[0].effective_start_date || terms[0].study_start_date || terms[0].start_date}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSemesterModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 hover:text-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Configure Semester Timeline</span>
          </button>
        </div>
      )}

      {/* Semester Setup Modal */}
      <SemesterSetupModal
        isOpen={showSemesterModal}
        onClose={() => setShowSemesterModal(false)}
        onSaved={() => loadData()}
      />

      {/* TAB 1: ACADEMIC BALANCE & DISTINCTION TRACKER */}
      {activeTab === 'balance' && (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/20 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-slate-100 text-lg">Distinction Readiness Score</h3>
              </div>
              <p className="text-xs text-slate-400 max-w-xl">
                Calculated dynamically from topic mastery rates, adherence to unit minimum study floors, and spaced revision consistency across all registered courses.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-800/80 px-5 py-3 rounded-2xl border border-slate-700/60">
              <div className="text-right">
                <span className="text-3xl font-extrabold text-indigo-400">
                  {balanceData?.distinction_readiness_score ?? 0}%
                </span>
                <span className="block text-[11px] text-slate-400">Pacing for Distinction</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Award className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Attention Alerts */}
          {balanceData?.attention_alerts && balanceData.attention_alerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Academic Balance Safeguards</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {balanceData.attention_alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                      alert.severity === 'HIGH'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <span className="text-xs font-bold mr-1.5">{alert.code} Alert:</span>
                      <span className="text-xs">{alert.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unit Coverage & Attention Gaps Table */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-100">Semester Unit Coverage & Attention Gaps</h3>
                <p className="text-xs text-slate-400">Equal attention baseline with rolling weekly monitoring</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Total: {balanceData?.total_actual_hours}h / {balanceData?.total_target_hours}h target
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className={`p-4 rounded-xl border transition-all ${
                    course.is_neglected
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : course.attention_gap >= 2.0
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-slate-800/60 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-brand-400">{course.code}</span>
                    {course.is_neglected ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        NEGLECTED
                      </span>
                    ) : course.attention_gap >= 2.0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        BEHIND TARGET
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        BALANCED
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200 line-clamp-1 mb-3">{course.title}</h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Actual Hours:</span>
                      <span className="font-semibold text-slate-100">{course.actual_weekly_hours}h</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Target Hours:</span>
                      <span className="font-semibold text-slate-100">{course.target_weekly_hours}h</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Minimum Floor:</span>
                      <span className="font-semibold text-slate-100">{course.min_weekly_hours}h</span>
                    </div>
                    <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-700/50">
                      <span className="font-medium text-amber-300">Attention Gap:</span>
                      <span className="font-bold text-amber-400">{course.attention_gap}h</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-700/80 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        course.is_neglected ? 'bg-rose-500' : course.attention_gap >= 2.0 ? 'bg-amber-500' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, (course.actual_weekly_hours / (course.target_weekly_hours || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spaced Revision Queue */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-100">Spaced Revision Recommendations</h3>
                <p className="text-xs text-slate-400">Intelligent revision intervals to reinforce long-term concept retention</p>
              </div>
            </div>

            {balanceData?.spaced_revision_queue.length === 0 ? (
              <p className="text-xs text-slate-400 italic">All topics currently have solid confidence ratings!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {balanceData?.spaced_revision_queue.map((item) => (
                  <div
                    key={item.topic_id}
                    className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-indigo-400">{item.course_code}</span>
                        <span className="text-[11px] text-amber-400 font-medium">({item.reason})</span>
                      </div>
                      <h4 className="text-xs font-medium text-slate-200">{item.topic_title}</h4>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Confidence: {item.confidence_score}/5 &bull; Recommended: {item.recommended_mins} mins
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        setShowReviseModal({
                          id: item.topic_id,
                          course_id: 0,
                          title: item.topic_title,
                          order_index: 0,
                          status: item.status,
                          confidence_score: item.confidence_score,
                          revisions_count: 0,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      Log Revision
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: COURSES & TOPIC BREAKDOWN */}
      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Courses Sidebar List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-100 text-sm">Active Units ({courses.length})</h3>
              <button
                onClick={() => setShowAddCourseModal(true)}
                className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Unit</span>
              </button>
            </div>

            <div className="space-y-2">
              {courses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => setSelectedCourseId(course.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedCourseId === course.id
                      ? 'bg-brand-600/20 border-brand-500/50 text-slate-100 shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-brand-400">{course.code}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Diff: {course.difficulty_level}/5</span>
                  </div>
                  <h4 className="text-xs font-semibold line-clamp-1">{course.title}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span>{course.topics_count} Topics</span>
                    <span>{course.actual_weekly_hours}h / {course.target_weekly_hours}h target</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Topics for Selected Course */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-semibold text-slate-100">
                  {courses.find((c) => c.id === selectedCourseId)?.code} &bull; Topics & Mastery
                </h3>
                <p className="text-xs text-slate-400">
                  {courses.find((c) => c.id === selectedCourseId)?.title}
                </p>
              </div>

              <button
                onClick={() => setShowAddTopicModal(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Topic</span>
              </button>
            </div>

            {courseTopics.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No topics recorded for this course yet. Add topics to enable spaced revision.
              </div>
            ) : (
              <div className="space-y-2.5">
                {courseTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-100">{topic.title}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            topic.status === 'Mastered'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : topic.status === 'Understood'
                              ? 'bg-blue-500/20 text-blue-400'
                              : topic.status === 'Practicing'
                              ? 'bg-purple-500/20 text-purple-400'
                              : topic.status === 'Learning'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {topic.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>Confidence: {topic.confidence_score} / 5</span>
                        <span>&bull;</span>
                        <span>Revisions: {topic.revisions_count}</span>
                        {topic.last_revised_at && (
                          <>
                            <span>&bull;</span>
                            <span>Last revised: {new Date(topic.last_revised_at).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setShowReviseModal(topic)}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium shrink-0 cursor-pointer"
                    >
                      Revise & Score
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ASSIGNMENTS & SUBTASKS */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-100 text-sm">Coursework & Assignments ({assignments.length})</h3>
            <button
              onClick={() => setShowAddAssignmentModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Assignment</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-400">{assignment.course_code}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      assignment.status === 'Completed' || assignment.status === 'Submitted'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : assignment.status === 'In Progress'
                        ? 'bg-brand-500/20 text-brand-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {assignment.status}
                  </span>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-100 text-sm">{assignment.title}</h4>
                  {assignment.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{assignment.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Est: {assignment.estimated_effort_hours}h</span>
                  </div>
                  {assignment.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Due: {new Date(assignment.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Granular Subtasks Breakdown */}
                {assignment.subtasks && assignment.subtasks.length > 0 && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Subtasks ({assignment.completed_subtasks_count}/{assignment.subtasks_count})
                    </span>
                    <div className="space-y-1.5">
                      {assignment.subtasks.map((st) => (
                        <div
                          key={st.id}
                          onClick={() => handleToggleSubtask(st.id)}
                          className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-slate-100 transition-colors"
                        >
                          {st.is_completed ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                          <span className={st.is_completed ? 'line-through text-slate-500' : ''}>
                            {st.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CATS & FINAL EXAMINATIONS */}
      {activeTab === 'assessments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-100 text-sm">CATs & Final Examinations ({assessments.length})</h3>
            <button
              onClick={() => setShowAddAssessmentModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Assessment</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessments.map((asm) => (
              <div
                key={asm.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400">{asm.course_code}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                    {asm.assessment_type} ({asm.weight_percentage ?? 15}%)
                  </span>
                </div>

                <h4 className="font-semibold text-slate-100 text-sm">{asm.title}</h4>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>{new Date(asm.assessment_date).toLocaleDateString()}</span>
                </div>

                {asm.notes && <p className="text-xs text-slate-400">{asm.notes}</p>}

                <div className="pt-2">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Preparation Progress</span>
                    <span className="font-semibold text-slate-200">{asm.preparation_progress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full"
                      style={{ width: `${asm.preparation_progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Add Course */}
      {showAddCourseModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Add New Academic Unit</h3>
            <form onSubmit={handleCreateCourse} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Unit Code</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. ICS 2307"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Unit Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Computer Networks 1"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Lecturer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Kamau"
                  value={newCourse.lecturer_name}
                  onChange={(e) => setNewCourse({ ...newCourse, lecturer_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Min Floor (h/week)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newCourse.min_weekly_hours}
                    onChange={(e) => setNewCourse({ ...newCourse, min_weekly_hours: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Target (h/week)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newCourse.target_weekly_hours}
                    onChange={(e) => setNewCourse({ ...newCourse, target_weekly_hours: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddCourseModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
                >
                  Save Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Topic */}
      {showAddTopicModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Add Topic to Unit</h3>
            <form onSubmit={handleCreateTopic} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Topic Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Subnetting & CIDR Calculation"
                  value={newTopic.title}
                  onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Initial Confidence (1-5)</label>
                <select
                  value={newTopic.confidence_score}
                  onChange={(e) => setNewTopic({ ...newTopic, confidence_score: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                >
                  <option value={1}>1 - Do not understand it</option>
                  <option value={2}>2 - Understand very little</option>
                  <option value={3}>3 - Understand the basics</option>
                  <option value={4}>4 - Understand it well</option>
                  <option value={5}>5 - Can apply and explain independently</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddTopicModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Save Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Revise Topic */}
      {showReviseModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Record Study & Revision Session</h3>
            <p className="text-xs text-slate-400">Topic: {showReviseModal.title}</p>
            <form onSubmit={handleRecordRevision} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  step="5"
                  value={reviseDuration}
                  onChange={(e) => setReviseDuration(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Confidence After Study (1-5)</label>
                <select
                  value={reviseConfidence}
                  onChange={(e) => setReviseConfidence(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                >
                  <option value={1}>1 - Needs major revision</option>
                  <option value={2}>2 - Weak grasp</option>
                  <option value={3}>3 - Basics clear</option>
                  <option value={4}>4 - Strong understanding</option>
                  <option value={5}>5 - Fully mastered</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Study Notes / Key Takeaways</label>
                <textarea
                  rows={3}
                  value={reviseNotes}
                  onChange={(e) => setReviseNotes(e.target.value)}
                  placeholder="What was understood, key formulas, or questions remaining..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowReviseModal(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Log Revision & Update Hours
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Assignment */}
      {showAddAssignmentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-100 text-base">Create New Assignment & Subtasks</h3>
            <form onSubmit={handleCreateAssignment} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Academic Unit</label>
                <select
                  value={newAssignment.course_id}
                  onChange={(e) => setNewAssignment({ ...newAssignment, course_id: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Assignment Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Build an E-commerce Cart in React"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Deadline Date</label>
                  <input
                    type="date"
                    value={newAssignment.deadline}
                    onChange={(e) => setNewAssignment({ ...newAssignment, deadline: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Est. Effort (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newAssignment.estimated_effort_hours}
                    onChange={(e) => setNewAssignment({ ...newAssignment, estimated_effort_hours: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                  />
                </div>
              </div>
              {/* Subtasks Breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-semibold text-slate-300 block">Break into subtasks:</span>
                <input
                  type="text"
                  placeholder="Subtask 1: e.g. Research & requirements"
                  value={newAssignment.subtask1}
                  onChange={(e) => setNewAssignment({ ...newAssignment, subtask1: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                />
                <input
                  type="text"
                  placeholder="Subtask 2: e.g. Implementation"
                  value={newAssignment.subtask2}
                  onChange={(e) => setNewAssignment({ ...newAssignment, subtask2: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                />
                <input
                  type="text"
                  placeholder="Subtask 3: e.g. Testing & review"
                  value={newAssignment.subtask3}
                  onChange={(e) => setNewAssignment({ ...newAssignment, subtask3: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddAssignmentModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Assessment */}
      {showAddAssessmentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Add Assessment (CAT / Exam)</h3>
            <form onSubmit={handleCreateAssessment} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Academic Unit</label>
                <select
                  value={newAssessment.course_id}
                  onChange={(e) => setNewAssessment({ ...newAssessment, course_id: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. CAT 2: Subnetting & Routing"
                  value={newAssessment.title}
                  onChange={(e) => setNewAssessment({ ...newAssessment, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Type</label>
                  <select
                    value={newAssessment.assessment_type}
                    onChange={(e) => setNewAssessment({ ...newAssessment, assessment_type: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="CAT">CAT</option>
                    <option value="Exam">Final Exam</option>
                    <option value="Quiz">Quiz</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Weight (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={newAssessment.weight_percentage}
                    onChange={(e) => setNewAssessment({ ...newAssessment, weight_percentage: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Assessment Date</label>
                <input
                  required
                  type="date"
                  value={newAssessment.assessment_date}
                  onChange={(e) => setNewAssessment({ ...newAssessment, assessment_date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddAssessmentModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Save Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
