# Use uma imagem Node.js oficial com Chromium
FROM node:18-alpine

# Instalar dependências do sistema para Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Configurar Puppeteer para usar Chromium instalado
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências (usar npm install ao invés de npm ci)
RUN npm install --omit=dev && npm cache clean --force

# Copiar código da aplicação
COPY . .

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Mudar propriedade dos arquivos
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["npm", "start"]