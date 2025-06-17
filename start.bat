@echo off
REM Script de inicialização rápida do Navegador Virtual Multi-Usuário
REM Autor: AI Assistant

echo 🚀 Iniciando Navegador Virtual Multi-Usuário...

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não encontrado. Por favor, instale Node.js ^>= 16.0.0
    pause
    exit /b 1
)

echo ✅ Node.js encontrado

REM Verificar se as dependências estão instaladas
if not exist "node_modules" (
    echo 📦 Instalando dependências...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar dependências
        pause
        exit /b 1
    )
    echo ✅ Dependências instaladas com sucesso
) else (
    echo ✅ Dependências já instaladas
)

REM Criar arquivo .env se não existir
if not exist ".env" (
    echo ⚙️ Criando arquivo de configuração...
    copy .env.example .env >nul
    echo ✅ Arquivo .env criado. Você pode editá-lo se necessário.
)

REM Definir porta padrão
if "%PORT%"=="" set PORT=3000

echo 🌐 Iniciando servidor na porta %PORT%...
echo 📱 Acesse: http://localhost:%PORT%
echo 🛑 Para parar o servidor, pressione Ctrl+C
echo.

REM Iniciar o servidor
npm start

pause