#!/bin/bash

# Script de Deploy Automatizado para Render
# Autor: AI Assistant

echo "🚀 Preparando deploy para Render..."

# Verificar se estamos em um repositório Git
if [ ! -d ".git" ]; then
    echo "❌ Este não é um repositório Git. Inicializando..."
    git init
    echo "✅ Repositório Git inicializado"
fi

# Verificar se há mudanças para commit
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Adicionando arquivos ao Git..."
    git add .
    
    echo "💬 Digite a mensagem do commit (ou pressione Enter para usar padrão):"
    read -r commit_message
    
    if [ -z "$commit_message" ]; then
        commit_message="feat: atualização para deploy no Render"
    fi
    
    git commit -m "$commit_message"
    echo "✅ Commit realizado: $commit_message"
else
    echo "✅ Nenhuma mudança para commit"
fi

# Verificar se há remote configurado
if ! git remote get-url origin >/dev/null 2>&1; then
    echo "🔗 Configure o repositório remoto:"
    echo "   git remote add origin https://github.com/seu-usuario/navegador-virtual.git"
    echo "   git push -u origin main"
    echo ""
    echo "📋 Depois acesse:"
    echo "   1. https://render.com"
    echo "   2. New + > Web Service"
    echo "   3. Connect GitHub repository"
    echo "   4. Deploy automaticamente!"
    exit 0
fi

# Push para o repositório
echo "📤 Enviando para GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Código enviado para GitHub com sucesso!"
    echo ""
    echo "🌐 Próximos passos:"
    echo "   1. Acesse https://render.com"
    echo "   2. Conecte seu repositório GitHub"
    echo "   3. O deploy será automático (render.yaml detectado)"
    echo ""
    echo "📊 Monitoramento:"
    echo "   - Logs: Dashboard do Render"
    echo "   - Health: https://seu-app.onrender.com/health"
    echo "   - App: https://seu-app.onrender.com"
    echo ""
    echo "🎉 Deploy iniciado! Aguarde alguns minutos..."
else
    echo "❌ Erro ao enviar para GitHub"
    echo "💡 Verifique:"
    echo "   - Conexão com internet"
    echo "   - Permissões do repositório"
    echo "   - Configuração do remote"
fi