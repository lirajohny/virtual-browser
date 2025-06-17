@echo off
REM Script de Deploy Automatizado para Render (Windows)
REM Autor: AI Assistant

echo 🚀 Preparando deploy para Render...

REM Verificar se estamos em um repositório Git
if not exist ".git" (
    echo ❌ Este não é um repositório Git. Inicializando...
    git init
    echo ✅ Repositório Git inicializado
)

REM Verificar se há mudanças para commit
git status --porcelain > temp_status.txt
set /p status_check=<temp_status.txt
del temp_status.txt

if not "%status_check%"=="" (
    echo 📝 Adicionando arquivos ao Git...
    git add .
    
    echo 💬 Digite a mensagem do commit (ou pressione Enter para usar padrão):
    set /p commit_message=
    
    if "%commit_message%"=="" (
        set commit_message=feat: atualização para deploy no Render
    )
    
    git commit -m "%commit_message%"
    echo ✅ Commit realizado: %commit_message%
) else (
    echo ✅ Nenhuma mudança para commit
)

REM Verificar se há remote configurado
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo 🔗 Configure o repositório remoto:
    echo    git remote add origin https://github.com/seu-usuario/navegador-virtual.git
    echo    git push -u origin main
    echo.
    echo 📋 Depois acesse:
    echo    1. https://render.com
    echo    2. New + ^> Web Service
    echo    3. Connect GitHub repository
    echo    4. Deploy automaticamente!
    pause
    exit /b 0
)

REM Push para o repositório
echo 📤 Enviando para GitHub...
git push origin main

if %errorlevel% equ 0 (
    echo ✅ Código enviado para GitHub com sucesso!
    echo.
    echo 🌐 Próximos passos:
    echo    1. Acesse https://render.com
    echo    2. Conecte seu repositório GitHub
    echo    3. O deploy será automático (render.yaml detectado^)
    echo.
    echo 📊 Monitoramento:
    echo    - Logs: Dashboard do Render
    echo    - Health: https://seu-app.onrender.com/health
    echo    - App: https://seu-app.onrender.com
    echo.
    echo 🎉 Deploy iniciado! Aguarde alguns minutos...
) else (
    echo ❌ Erro ao enviar para GitHub
    echo 💡 Verifique:
    echo    - Conexão com internet
    echo    - Permissões do repositório
    echo    - Configuração do remote
)

pause