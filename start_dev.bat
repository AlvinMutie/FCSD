@echo off
echo Starting MyLife OS Development Environment...
start "MyLife OS - Backend" cmd /k "cd /d %~dp0backend && .\venv\Scripts\python.exe run.py"
start "MyLife OS - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Both services launched:
echo Backend:  http://127.0.0.1:5000
echo Frontend: http://localhost:5173
pause
