# 🌐 Navegador Virtual Multi-Usuário

Uma solução completa que permite múltiplos usuários acessarem o mesmo site simultaneamente, cada um com sua própria sessão isolada (cookies, login, estado). Ideal para contornar limitações de sites que só permitem uma sessão ativa por conta.

## 🎯 Características Principais

- **Multi-Usuário**: Múltiplos usuários podem estar logados simultaneamente no mesmo site
- **Isolamento Completo**: Cada usuário tem cookies, sessão e estado completamente separados
- **Interface Moderna**: Design responsivo com sistema de abas
- **Tempo Real**: Comunicação via WebSocket para atualizações instantâneas
- **Proxy Inteligente**: Sistema que intercepta e reescreve requisições HTTP/HTTPS
- **Gerenciamento Automático**: Limpeza automática de sessões inativas

## 🏗️ Arquitetura

```
Usuário A (UUID-1) → WebSocket → Proxy Server → Site Destino (Sessão A)
Usuário B (UUID-2) → WebSocket → Proxy Server → Site Destino (Sessão B)
Usuário C (UUID-3) → WebSocket → Proxy Server → Site Destino (Sessão C)
```

## 📋 Pré-requisitos

- **Node.js** >= 16.0.0
- **npm** ou **yarn**
- **Google Chrome** (para Puppeteer)

## 🚀 Instalação

### 1. Clone ou baixe o projeto

```bash
# Se usando Git
git clone <repository-url>
cd navegador-virtual

# Ou extraia o arquivo ZIP e navegue até a pasta
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Inicie o servidor

```bash
# Modo produção
npm start

# Modo desenvolvimento (com auto-reload)
npm run dev
```

### 4. Acesse a aplicação

Abra seu navegador e acesse:
```
http://localhost:3000
```

## 📖 Como Usar

### Interface Principal

1. **Conectar**: A aplicação conecta automaticamente ao servidor
2. **Nova Sessão**: Cada usuário recebe um ID único automaticamente
3. **Navegar**: Digite uma URL na barra de endereços ou use os links rápidos
4. **Múltiplas Abas**: Crie novas abas para sessões independentes
5. **Monitoramento**: Veja estatísticas em tempo real na sidebar

### Funcionalidades

#### 🔗 Navegação
- Digite URLs completas: `https://exemplo.com`
- URLs sem protocolo: `exemplo.com` (adiciona HTTPS automaticamente)
- Pesquisas: `termo de pesquisa` (redireciona para Google)

#### 📑 Sistema de Abas
- **Nova Aba**: Clique no botão `+` ou use o botão na sidebar
- **Fechar Aba**: Clique no `×` na aba
- **Alternar Abas**: Clique na aba desejada

#### 🎛️ Controles
- **Voltar/Avançar**: Botões de navegação do navegador
- **Recarregar**: Atualiza a página atual
- **Fechar Sessão**: Remove a sessão atual do servidor

#### 📊 Monitoramento
- **Usuários Online**: Número de usuários conectados
- **Sessões Ativas**: Total de sessões no servidor
- **Lista de Sessões**: Visualize todas as sessões ativas

## 🔧 API Endpoints

### REST API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/user/create` | Cria nova sessão de usuário |
| `GET` | `/api/sessions/stats` | Estatísticas das sessões |
| `GET` | `/api/sessions/:userId` | Informações de sessão específica |
| `DELETE` | `/api/sessions/:userId` | Remove sessão específica |
| `POST` | `/api/navigate` | Navega para URL (alternativa ao WebSocket) |
| `GET` | `/health` | Health check do servidor |

### Proxy Routes

| Padrão | Descrição |
|--------|-----------|
| `/proxy/:userId/*` | Proxifica requisições para o usuário específico |

### WebSocket Events

#### Cliente → Servidor
- `register-user`: Registra/reconecta usuário
- `navigate`: Navega para URL
- `create-tab`: Cria nova aba/sessão
- `close-session`: Fecha sessão específica
- `ping`: Mantém conexão ativa

#### Servidor → Cliente
- `user-registered`: Confirmação de registro
- `navigation-started`: Início da navegação
- `navigation-completed`: Navegação concluída
- `navigation-error`: Erro na navegação
- `tab-created`: Nova aba criada
- `session-closed`: Sessão fechada
- `session-stats`: Estatísticas atualizadas
- `notification`: Notificações do sistema

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Porta do servidor (padrão: 3000)
PORT=3000

# Configurações do Puppeteer
PUPPETEER_HEADLESS=true
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox

# Limites de sessão
MAX_SESSIONS=10
SESSION_TIMEOUT_MINUTES=30
CLEANUP_INTERVAL_MINUTES=5
```

### Configurações Avançadas

Edite `server/sessions.js` para ajustar:

- **Limite de sessões**: `maxSessions`
- **Timeout de inatividade**: `isInactive(timeoutMinutes)`
- **User-Agents**: Array em `generateRandomUserAgent()`
- **Argumentos do Puppeteer**: Array em `initialize()`

## 🛡️ Segurança

### Medidas Implementadas

- **Validação de URLs**: Bloqueia URLs locais e redes privadas
- **Sanitização**: Headers e cookies são filtrados
- **Rate Limiting**: Controle de requisições por usuário
- **Isolamento**: Cada sessão é completamente isolada
- **Timeout**: Requisições têm timeout de 30 segundos

### URLs Bloqueadas

- `localhost`, `127.0.0.1`, `0.0.0.0`
- Redes privadas: `10.x.x.x`, `192.168.x.x`, `172.16-31.x.x`
- Protocolos não-HTTP: `file://`, `ftp://`, etc.

## 🚀 Deploy em Produção

### Usando PM2

```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicação
pm2 start server/app.js --name "navegador-virtual"

# Configurar auto-start
pm2 startup
pm2 save
```

### Usando Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Instalar dependências do Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY . .
EXPOSE 3000

CMD ["npm", "start"]
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Monitoramento

### Health Check

```bash
curl http://localhost:3000/health
```

### Estatísticas

```bash
curl http://localhost:3000/api/sessions/stats
```

### Logs

Os logs são exibidos no console com códigos de cores:
- 🚀 Inicialização
- 👤 Usuários
- 🌐 Navegação
- 📑 Abas
- ❌ Erros
- ✅ Sucesso

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. Erro "Limite máximo de sessões atingido"
**Solução**: Aumente `maxSessions` em `sessions.js` ou aguarde limpeza automática

#### 2. Sites não carregam corretamente
**Solução**: Alguns sites bloqueiam proxies. Tente:
- Verificar se a URL está correta
- Aguardar alguns segundos
- Tentar em uma nova aba

#### 3. WebSocket não conecta
**Solução**: 
- Verificar se a porta 3000 está livre
- Desabilitar firewall/antivírus temporariamente
- Verificar logs do servidor

#### 4. Puppeteer não inicia
**Solução**:
```bash
# Linux
sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget

# macOS
brew install chromium
```

### Debug Mode

Para ativar logs detalhados:

```bash
DEBUG=* npm start
```

## 📈 Performance

### Otimizações Implementadas

- **Cache de recursos**: CSS, JS e imagens são cacheados
- **Compressão**: Respostas são comprimidas automaticamente
- **Limpeza automática**: Sessões inativas são removidas
- **Pool de conexões**: Reutilização de conexões HTTP
- **Lazy loading**: Recursos carregados sob demanda

### Limites Recomendados

- **Usuários simultâneos**: 4-10 (dependendo do hardware)
- **Timeout de sessão**: 30 minutos
- **Timeout de requisição**: 30 segundos
- **Memória RAM**: Mínimo 2GB, recomendado 4GB+

## 🤝 Contribuição

### Como Contribuir

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Estrutura do Código

```
navegador-virtual/
├── server/
│   ├── app.js          # Servidor principal
│   ├── sessions.js     # Gerenciamento de sessões
│   ├── proxy.js        # Sistema de proxy
│   └── websocket.js    # Comunicação WebSocket
├── public/
│   ├── index.html      # Interface principal
│   ├── script.js       # Lógica do frontend
│   └── style.css       # Estilos
├── package.json        # Dependências
└── README.md          # Documentação
```

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

Para suporte e dúvidas:

1. Verifique a seção [Troubleshooting](#-troubleshooting)
2. Consulte os logs do servidor
3. Abra uma issue no repositório
4. Entre em contato com a equipe de desenvolvimento

## 🎉 Teste Final

Para verificar se tudo está funcionando:

1. Abra 3+ abas no navegador
2. Acesse `http://localhost:3000` em cada aba
3. Cada aba deve receber um ID de usuário único
4. Navegue para o mesmo site (ex: Gmail) em todas as abas
5. Faça login com contas diferentes em cada aba
6. Verifique se as sessões estão isoladas (não há interferência entre logins)

**✅ Sucesso**: Se conseguir manter múltiplos logins simultâneos no mesmo site, a solução está funcionando perfeitamente!

## 🌐 Deploy em Produção

### Deploy no Render (Recomendado)

O projeto está otimizado para deploy no [Render](https://render.com) com configuração automática:

#### Deploy Rápido
```bash
# Linux/macOS
./deploy.sh

# Windows
deploy.bat
```

#### Deploy Manual
1. **Suba o código para GitHub**
2. **Acesse [render.com](https://render.com)**
3. **New + → Web Service**
4. **Conecte seu repositório GitHub**
5. **Deploy automático** (render.yaml detectado)

#### Configurações Importantes
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check**: `/health`
- **Environment**: `NODE_ENV=production`

📖 **Guia Completo**: Veja [DEPLOY_RENDER.md](DEPLOY_RENDER.md) para instruções detalhadas.

### Outras Plataformas

- **Heroku**: Compatível (configure buildpacks)
- **Railway**: Suporte nativo ao Node.js
- **DigitalOcean App Platform**: Deploy via GitHub
- **AWS/GCP/Azure**: Use o Dockerfile incluído

---

**Desenvolvido com ❤️ para resolver o problema de limitação de sessões simultâneas em sites web.**