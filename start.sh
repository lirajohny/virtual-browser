#!/bin/bash

# Script de inicialização rápida do Navegador Virtual Multi-Usuário
# Autor: AI Assistant

echo "🚀 Iniciando Navegador Virtual Multi-Usuário..."

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale Node.js >= 16.0.0"
    exit 1
fi

# Verificar versão do Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js versão $NODE_VERSION encontrada. Requerido: >= $REQUIRED_VERSION"
    exit 1
fi

echo "✅ Node.js versão $NODE_VERSION encontrada"

# Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Erro ao instalar dependências"
        exit 1
    fi
    echo "✅ Dependências instaladas com sucesso"
else
    echo "✅ Dependências já instaladas"
fi

# Criar arquivo .env se não existir
if [ ! -f ".env" ]; then
    echo "⚙️ Criando arquivo de configuração..."
    cp .env.example .env
    echo "✅ Arquivo .env criado. Você pode editá-lo se necessário."
fi

# Verificar se a porta está livre
PORT=${PORT:-3000}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ Porta $PORT já está em uso. Tentando porta alternativa..."
    PORT=$((PORT + 1))
    export PORT
fi

echo "🌐 Iniciando servidor na porta $PORT..."
echo "📱 Acesse: http://localhost:$PORT"
echo "🛑 Para parar o servidor, pressione Ctrl+C"
echo ""

# Iniciar o servidor
npm start