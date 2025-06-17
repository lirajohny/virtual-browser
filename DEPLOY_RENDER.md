# 🚀 Deploy no Render - Guia Completo

Este guia te ajudará a hospedar o Navegador Virtual Multi-Usuário no Render gratuitamente.

## 📋 Pré-requisitos

- Conta no [Render](https://render.com) (gratuita)
- Conta no [GitHub](https://github.com) (gratuita)
- Código do projeto no GitHub

## 🔧 Preparação do Projeto

### 1. Subir Código para GitHub

```bash
# Inicializar repositório Git (se ainda não foi feito)
git init

# Adicionar arquivos
git add .

# Fazer commit
git commit -m "feat: projeto navegador virtual multi-usuário"

# Adicionar repositório remoto (substitua pela sua URL)
git remote add origin https://github.com/seu-usuario/navegador-virtual.git

# Enviar para GitHub
git push -u origin main
```

### 2. Estrutura de Arquivos Necessária

Certifique-se de que estes arquivos estão no repositório:
- ✅ `package.json` (com dependências corretas)
- ✅ `render.yaml` (configuração automática)
- ✅ `Dockerfile` (opcional, para Docker)
- ✅ `.env.example` (exemplo de variáveis)
- ✅ Todos os arquivos do projeto

## 🌐 Deploy no Render

### Método 1: Deploy Automático (Recomendado)

1. **Acesse o Render**:
   - Vá para [render.com](https://render.com)
   - Faça login com GitHub

2. **Criar Novo Serviço**:
   - Clique em "New +"
   - Selecione "Web Service"

3. **Conectar Repositório**:
   - Conecte sua conta GitHub
   - Selecione o repositório do projeto
   - Clique em "Connect"

4. **Configuração Automática**:
   - O Render detectará o `render.yaml`
   - As configurações serão aplicadas automaticamente
   - Clique em "Create Web Service"

### Método 2: Configuração Manual

Se preferir configurar manualmente:

1. **Configurações Básicas**:
   - **Name**: `navegador-virtual`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

2. **Variáveis de Ambiente**:
   ```
   NODE_ENV=production
   PUPPETEER_HEADLESS=true
   PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage
   MAX_SESSIONS=5
   SESSION_TIMEOUT_MINUTES=30
   CLEANUP_INTERVAL_MINUTES=5
   ```

3. **Configurações Avançadas**:
   - **Health Check Path**: `/health`
   - **Auto-Deploy**: `Yes`

## ⚙️ Configurações de Produção

### Variáveis de Ambiente Importantes

| Variável | Valor Recomendado | Descrição |
|----------|-------------------|-----------|
| `NODE_ENV` | `production` | Ambiente de produção |
| `PUPPETEER_HEADLESS` | `true` | Executar Puppeteer sem interface |
| `PUPPETEER_ARGS` | `--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage` | Argumentos para Chromium |
| `MAX_SESSIONS` | `5` | Máximo de sessões (Render Free tem limitações) |
| `SESSION_TIMEOUT_MINUTES` | `30` | Timeout de sessões inativas |
| `CLEANUP_INTERVAL_MINUTES` | `5` | Intervalo de limpeza |

### Limitações do Plano Gratuito

- **RAM**: 512MB (limitado para Puppeteer)
- **CPU**: Compartilhado
- **Sessões Simultâneas**: Recomendado máximo 3-5
- **Sleep**: Serviço "dorme" após 15min de inatividade

## 🔍 Monitoramento e Logs

### Verificar Deploy

1. **Status do Deploy**:
   - Acompanhe os logs durante o build
   - Verifique se não há erros

2. **Health Check**:
   ```bash
   curl https://seu-app.onrender.com/health
   ```

3. **Logs em Tempo Real**:
   - No dashboard do Render
   - Aba "Logs"

### Problemas Comuns

#### 1. Erro de Memória (Out of Memory)
```
FATAL ERROR: Reached heap limit Allocation failed
```
**Solução**: Reduzir `MAX_SESSIONS` para 2-3

#### 2. Puppeteer não Inicia
```
Error: Failed to launch the browser process
```
**Solução**: Verificar variáveis `PUPPETEER_*`

#### 3. Timeout no Build
**Solução**: Otimizar `package.json`, remover dependências desnecessárias

## 🚀 Otimizações para Produção

### 1. Reduzir Uso de Memória

Edite `server/sessions.js`:
```javascript
// Reduzir limite de sessões
this.maxSessions = 3; // Ao invés de 10

// Timeout mais agressivo
isInactive(timeoutMinutes = 15) // Ao invés de 30
```

### 2. Configurar Puppeteer para Render

As configurações já estão otimizadas no código:
```javascript
args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--single-process', // Para produção
    '--memory-pressure-off'
]
```

### 3. Health Check Personalizado

O endpoint `/health` já está configurado e retorna:
```json
{
  "status": "OK",
  "timestamp": "2024-01-XX",
  "uptime": 123.45,
  "memory": {...},
  "sessions": {...}
}
```

## 🌍 Acesso ao Aplicativo

Após o deploy bem-sucedido:

1. **URL do Aplicativo**:
   ```
   https://seu-app-name.onrender.com
   ```

2. **Teste de Funcionamento**:
   - Abra múltiplas abas
   - Cada aba deve receber um ID único
   - Teste navegação para diferentes sites

## 🔧 Manutenção

### Atualizações Automáticas

- Qualquer push para `main` triggera novo deploy
- Render rebuilda automaticamente
- Zero downtime durante atualizações

### Monitoramento

1. **Dashboard Render**:
   - CPU, RAM, Network usage
   - Logs em tempo real
   - Métricas de performance

2. **Health Checks**:
   - Render monitora `/health` automaticamente
   - Reinicia serviço se não responder

## 💰 Custos

### Plano Gratuito (Free Tier)
- **Custo**: $0/mês
- **Limitações**: 512MB RAM, sleep após inatividade
- **Ideal para**: Testes, demos, uso pessoal

### Plano Pago (Starter)
- **Custo**: ~$7/mês
- **Recursos**: 1GB RAM, sem sleep
- **Ideal para**: Uso profissional, mais usuários

## 🆘 Troubleshooting

### Logs Úteis

```bash
# Ver logs do deploy
# No dashboard Render > Logs

# Verificar health
curl https://seu-app.onrender.com/health

# Testar WebSocket
# Abrir DevTools > Network > WS
```

### Problemas Frequentes

1. **App não carrega**: Verificar logs de build
2. **Puppeteer falha**: Verificar variáveis de ambiente
3. **Memória insuficiente**: Reduzir MAX_SESSIONS
4. **WebSocket não conecta**: Verificar CORS e headers

## 🎉 Pronto!

Seu Navegador Virtual Multi-Usuário agora está rodando no Render! 

**URL de exemplo**: `https://navegador-virtual-abc123.onrender.com`

### Próximos Passos

1. **Teste completo** com múltiplos usuários
2. **Configure domínio customizado** (opcional)
3. **Monitore performance** no dashboard
4. **Considere upgrade** se precisar de mais recursos

---

**🚀 Seu projeto está online e funcionando!**