@echo off
chcp 1252 >nul
color 0A
cls

echo ============================================================
echo  SISTEMA DE GESTAO DE SENHAS A2W - v2.0
echo ============================================================
echo.
echo  Iniciando sistema completo...
echo.

if not exist "backend" (
    echo ERRO: Pasta 'backend' nao encontrada!
    echo Execute este script na raiz do projeto.
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ERRO: Pasta 'frontend' nao encontrada!
    pause
    exit /b 1
)

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do set IP=%%a
set IP=%IP:~1%
echo IP da maquina: %IP%
echo.

echo ============================================================
echo  INICIANDO BACKEND (FastAPI)
echo ============================================================
echo.

cd backend
if not exist "venv" (
    echo venv nao encontrada. Criando...
    python -m venv venv
)
call venv\Scripts\activate
echo Instalando dependencias...
pip install -r requirements.txt
playwright install chromium
start "A2W API" cmd /k "venv\Scripts\activate && uvicorn src.api.main:app --host 0.0.0.0 --port 8000"
cd ..

timeout /t 5 /nobreak >nul

echo.
echo ============================================================
echo  INICIANDO FRONTEND (React)
echo ============================================================
echo.

cd frontend
if not exist "node_modules" (
    echo Instalando dependencias do frontend...
    call npm install
)
echo Gerando build...
call npm run build
start "A2W Frontend" cmd /k "npm run preview -- --port 3001 --host 0.0.0.0"
cd ..

timeout /t 3 /nobreak >nul
cls
echo.
echo ============================================================
echo  SISTEMA INICIADO COM SUCESSO!
echo ============================================================
echo.
echo  ACESSO LOCAL:
echo     Frontend: http://localhost:3001
echo     API:      http://localhost:8000
echo.
echo  ACESSO NA REDE:
echo     Frontend: http://%IP%:3001
echo.
echo ============================================================
pause
