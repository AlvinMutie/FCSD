# MyLife OS — Personal Productivity & Life-Management Platform

An integrated personal operating system designed for a **JKUAT SODeL BSc IT** student balancing university studies with a strict **Distinction-focused** target, 4 technical skills tracks (Python, Cybersecurity, Web Development, Networking), career growth, and personal well-being.

---

## 1. Key Capabilities
- **Modular Monolith**: React 19 + TypeScript + Vite frontend with a Python 3.13 + Flask + SQLAlchemy backend.
- **Distinction-Focused Academic Engine**: Equal attention baseline across all registered units, attention-gap calculations, topic mastery scoring (1-5), and spaced repetition schedules.
- **Deterministic Scheduling Engine**: Linear constraint & mathematical priority scoring ($P = 0.35D + 0.25U + 0.20I + 0.10W + 0.10R$) with honest overload detection and "Reschedule My Day".
- **MyLife Bridge (SODeL Integration)**: Read-only Chrome Manifest V3 extension with zero stored credentials, local pairing tokens, and a human-in-the-loop pending imports review manager.
- **Four Skills Tracks**: Python, Cybersecurity, Web Development, Networking with roadmap milestones, practical evidence tracking (GitHub/demos), and session reflections.
- **Career Workspace**: Opportunity tracking, multi-version CV management, interview preparation, and skills-gap analysis.

---

## 2. Directory Structure
```text
mylife-os/
├── backend/
│   ├── app/
│   │   ├── auth/            # Registration, login, session auth
│   │   ├── dashboard/       # Aggregated multi-domain metrics
│   │   ├── settings/        # Preferences & scheduler weights
│   │   ├── models/          # SQLAlchemy normalized entities
│   │   └── config.py        # Environment configuration
│   ├── requirements.txt
│   └── run.py               # Local Flask server entrypoint (port 5000)
├── frontend/
│   ├── src/
│   │   ├── components/      # Sidebar, Header, reusable UI atoms
│   │   ├── context/         # AuthContext with persistent session
│   │   ├── pages/           # Dashboard, Settings, Timetable, etc.
│   │   ├── services/        # API client
│   │   └── types/           # Strict TypeScript contracts
│   ├── index.html
│   └── package.json
├── mylife-bridge/           # Chrome Manifest V3 Extension (Phase 3)
├── tests/
│   └── backend/             # Pytest automated test suites
└── docs/                    # Architecture, Database, Roadmap, Scheduler docs
```

---

## 3. Quick Start (Local Development)

### Prerequisites
- Python 3.13+
- Node.js 20+ (Node v26.13.0 installed)
- Git

### 1. Backend Setup
```powershell
# Navigate to backend and activate virtualenv
cd backend
.\venv\Scripts\python.exe -m pip install -r requirements.txt

# Run the Flask API server
.\venv\Scripts\python.exe run.py
```
*Backend runs on `http://127.0.0.1:5000`.*
*Pre-seeded demo credentials:* `student@jkuat.ac.ke` / `Password123!`

### 2. Frontend Setup
```powershell
# In a second terminal window
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173` with proxy to the Flask backend.*

### 3. Run Automated Tests
```powershell
$env:PYTHONPATH = "."
.\backend\venv\Scripts\python.exe -m pytest tests/backend
```
