@echo off
REM Agendador de Reversão de Senhas - 19h
cd /d "%~dp0"
call venv\Scripts\activate.bat
python scripts\reverter_senhas_19h.py
pause
