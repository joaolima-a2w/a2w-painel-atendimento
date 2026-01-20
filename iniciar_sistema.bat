@echo off
chcp 65001 >nul
color 0A
cls

echo ============================================================
echo  SISTEMA DE GESTÃO DE SENHAS A2W - v2.0
echo ============================================================
echo.
echo  Iniciando sistema completo...
echo.

REM ============================================================
REM VERIFICAR SE ESTÁ NA PASTA CORRETA
REM ============================================================
if not exist "backend" (
    echo ERRO: Pasta 'backend' não encontrada!
    echo Execute este script na raiz do projeto.
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ERRO: Pasta 'frontend' não encontrada!
    pause
    exit /b 1
)

REM ============================================================
REM OBTER IP DA MÁQUINA
REM ============================================================
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do set IP=%%a
set IP=%IP:~1%
echo IP da máquina: %IP%
echo.

REM ============================================================
REM BACKEND (API FASTAPI)
REM ============================================================
echo ============================================================
echo  INICIANDO BACKEND (FastAPI)
echo ============================================================
echo.

cd backend

REM Verificar se venv existe
if not exist "venv" (
    echo venv não encontrada. Criando...
    python -m venv venv
    echo venv criada!
)

REM Ativar venv e instalar dependências
call venv\Scripts\activate
echo venv ativada

REM Verificar se precisa instalar dependências
if not exist "venv\Lib\site-packages\fastapi" (
    echo Instalando dependências do backend...
    pip install -r requirements.txt
    playwright install chromium
    echo Dependências instaladas!
) else (
    echo Dependências já instaladas
)

REM Iniciar API em nova janela
echo Iniciando API FastAPI...
start "A2W API - Porta 8000" cmd /k "venv\Scripts\activate && uvicorn src.api.main:app --host 0.0.0.0 --port 8000"

timeout /t 5 /nobreak >nul
cd ..

REM ============================================================
REM FRONTEND (REACT)
REM ============================================================
echo.
echo ============================================================
echo  INICIANDO FRONTEND (React)
echo ============================================================
echo.

cd frontend

REM Verificar se node_modules existe
if not exist "node_modules" (
    echo Instalando dependências do frontend...
    call npm install
    echo Dependências instaladas!
) else (
    echo Dependências já instaladas
)

REM Build do frontend (PRODUÇÃO)
echo Gerando build de produção...
call npm run build

REM Instalar serve globalmente se não tiver
where serve >nul 2>&1
if errorlevel 1 (
    echo Instalando 'serve' globalmente...
    call npm install -g serve
)

REM Servir build em nova janela
echo Iniciando servidor frontend...
start "A2W Frontend - Porta 3000" cmd /k "serve -s dist -p 3000 -l 0.0.0.0"

cd ..

REM ============================================================
REM INFORMAÇÕES FINAIS
REM ============================================================
timeout /t 3 /nobreak >nul
cls
color 0A

echo.
echo ============================================================
echo  ✅ SISTEMA INICIADO COM SUCESSO!
echo ============================================================
echo.
echo  ACESSO LOCAL (nesta máquina):
echo     Frontend: http://localhost:3000
echo     API:      http://localhost:8000
echo     Docs API: http://localhost:8000/docs
echo.
echo  ACESSO NA REDE (outras máquinas da empresa):
echo     Frontend: http://%IP%:3000
echo     API:      http://%IP%:8000
echo.
echo  COMPARTILHE COM A EQUIPE:
echo     Acesse: http://%IP%:3000
echo.
echo ============================================================
echo  IMPORTANTE:
echo  - NÃO feche as janelas do CMD que abriram
echo  - Para parar: feche as janelas ou pressione Ctrl+C nelas
echo  - Firewall: libere as portas 3000 e 8000
echo ============================================================
echo.
pause
