# MyLife OS — Phase-by-Phase Roadmap

## Phase 0: Project Inspection & Planning (Current Phase)
- [x] Inspect directory and verify local tooling (Git, Python 3.13, Node 26.13, npm 11.20).
- [x] System architecture specification (`docs/architecture.md`).
- [x] Relational schema and database design (`docs/database-design.md`).
- [x] Deterministic scheduling engine and academic balance specification (`docs/scheduling-engine.md`).
- [x] Initialize Git repository with proper `.gitignore`.
- [x] Finalize implementation roadmap and milestone 1 definition.

---

## Phase 1: Foundation & Dashboard
- **Backend**:
  - Python Flask modular monolith setup with application factory.
  - SQLAlchemy models for Users, Settings, Dashboard Preferences.
  - Authentication (password hashing via Werkzeug/Bcrypt, session auth / JWT).
  - Seed default user & settings.
- **Frontend**:
  - React 19 + TypeScript + Vite project configuration.
  - Tailwind CSS with dark mode as default and accessible contrast.
  - Collapsible responsive sidebar navigation (Desktop + Mobile).
  - Navigation sections: Overview, Timetable, Academics, Skills, Career, Projects, Analytics, Integrations, Settings.
  - Dashboard overview widgets: Today's Focus, Academic Overview, Skills Overview, Career Overview, Time Allocation chart.
  - Persistent dashboard customization (widget toggle / reorder).

---

## Phase 2: Academic Management & Distinction Tracker
- Terms, Courses, Assignments, Subtasks, Assessments, Topics, and Academic Resources CRUD.
- Distinction Tracker: Minimum & target study hours, Topic mastery rating (1-5), Spaced revision planner.
- Academic Coverage Dashboard: Visual indicator of unit neglect, attention gap, upcoming CATs/exams.

---

## Phase 3: MyLife Bridge Chrome Extension
- Chrome Manifest V3 extension structure (`mylife-bridge/`).
- Page-type detector (Course, Assignment, Assessment, Announcement, Overview).
- Content scripts and modular extractors for JKUAT SODeL.
- Pairing token security protocol with local MyLife OS backend.
- Extraction preview & guided sync workflow.

---

## Phase 4: Import Manager & Provenance Review
- Dedicated Pending Imports UI.
- Staging review: Approve, Edit & Approve, Reject, Needs Attention.
- Duplicate detection and deadline-difference detector.
- Source provenance audit trail.

---

## Phase 5: Adaptive Scheduling Engine
- Flexible availability builder (per-day time ranges, rest periods).
- Deterministic priority scoring engine with Attention Gap & Exam Proximity boosts.
- Weekly timetable generator with FullCalendar integration.
- "Reschedule My Day" engine with conflict and overload detection.
- Schedule versioning and approval workflow.

---

## Phase 6: Skills Development Workspace
- 4 tracks: Python, Cybersecurity, Web Development, Networking.
- Stage-by-stage learning roadmaps, task lists, and milestone progress.
- Study session logger with reflections (Learned, Difficulties, Next steps).
- Practical evidence repository (GitHub repos, demos, write-ups).

---

## Phase 7: Career & Job Management
- Opportunities tracking pipeline (Kanban and List view).
- Multi-version CV document manager and cover letters.
- Interview preparation checklists and technical questions.
- Skills-gap analyzer matching job requirements against tracked skills and project evidence.

---

## Phase 8: Projects & Analytics (Life Balance Monitor)
- Projects workspace linked to skills and courses.
- Weekly Analytics & Recharts visualizations.
- Life Balance Monitor: Proactive neglect warnings and balanced distribution score.
- Structured Weekly Review workflow with timetable regeneration.

---

## Phase 9: Verification, Polish & Release
- Automated backend unit & integration tests (`pytest`).
- Frontend component & integration verification.
- Database backup/export/restore tools.
- Production readiness documentation & user guide.
