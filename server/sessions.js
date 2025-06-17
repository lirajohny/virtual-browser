const { v4: uuidv4 } = require('uuid');
const { CookieJar } = require('tough-cookie');
const puppeteer = require('puppeteer');

/**
 * Classe para gerenciar sessões individuais de usuários
 */
class UserSession {
    constructor(userId) {
        this.userId = userId;
        this.cookieJar = new CookieJar();
        this.browserContext = null;
        this.page = null;
        this.activeUrl = '';
        this.userAgent = this.generateRandomUserAgent();
        this.createdAt = new Date();
        this.lastActivity = new Date();
        this.isActive = true;
    }

    /**
     * Gera um User-Agent aleatório para simular diferentes navegadores
     */
    generateRandomUserAgent() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    /**
     * Inicializa o contexto do navegador Puppeteer
     */
    async initializeBrowser(browser) {
        try {
            this.browserContext = await browser.createIncognitoBrowserContext();
            this.page = await this.browserContext.newPage();
            
            // Configurar User-Agent
            await this.page.setUserAgent(this.userAgent);
            
            // Configurar viewport
            await this.page.setViewport({ width: 1366, height: 768 });
            
            // Interceptar requisições para aplicar cookies
            await this.page.setRequestInterception(true);
            
            this.page.on('request', async (request) => {
                const headers = { ...request.headers() };
                
                // Aplicar cookies da sessão
                const cookies = await this.getCookiesForUrl(request.url());
                if (cookies) {
                    headers['cookie'] = cookies;
                }
                
                request.continue({ headers });
            });

            // Capturar respostas para salvar cookies
            this.page.on('response', async (response) => {
                const setCookieHeader = response.headers()['set-cookie'];
                if (setCookieHeader) {
                    await this.saveCookiesFromResponse(response.url(), setCookieHeader);
                }
            });

            console.log(`✅ Navegador inicializado para usuário ${this.userId}`);
            return true;
        } catch (error) {
            console.error(`❌ Erro ao inicializar navegador para usuário ${this.userId}:`, error);
            return false;
        }
    }

    /**
     * Navega para uma URL específica
     */
    async navigateToUrl(url) {
        try {
            if (!this.page) {
                throw new Error('Navegador não inicializado');
            }

            this.lastActivity = new Date();
            this.activeUrl = url;

            const response = await this.page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            const content = await this.page.content();
            const title = await this.page.title();

            return {
                success: true,
                content,
                title,
                url: this.page.url(),
                status: response.status()
            };
        } catch (error) {
            console.error(`❌ Erro na navegação para ${url}:`, error);
            return {
                success: false,
                error: error.message,
                url
            };
        }
    }

    /**
     * Executa JavaScript na página
     */
    async executeScript(script) {
        try {
            if (!this.page) {
                throw new Error('Navegador não inicializado');
            }

            this.lastActivity = new Date();
            const result = await this.page.evaluate(script);
            return { success: true, result };
        } catch (error) {
            console.error(`❌ Erro ao executar script:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtém cookies para uma URL específica
     */
    async getCookiesForUrl(url) {
        try {
            const cookies = await this.cookieJar.getCookieString(url);
            return cookies;
        } catch (error) {
            console.error('Erro ao obter cookies:', error);
            return null;
        }
    }

    /**
     * Salva cookies de uma resposta HTTP
     */
    async saveCookiesFromResponse(url, setCookieHeaders) {
        try {
            if (Array.isArray(setCookieHeaders)) {
                for (const cookieHeader of setCookieHeaders) {
                    await this.cookieJar.setCookie(cookieHeader, url);
                }
            } else {
                await this.cookieJar.setCookie(setCookieHeaders, url);
            }
        } catch (error) {
            console.error('Erro ao salvar cookies:', error);
        }
    }

    /**
     * Limpa a sessão e libera recursos
     */
    async cleanup() {
        try {
            if (this.page) {
                await this.page.close();
            }
            if (this.browserContext) {
                await this.browserContext.close();
            }
            this.isActive = false;
            console.log(`🧹 Sessão ${this.userId} limpa com sucesso`);
        } catch (error) {
            console.error(`❌ Erro ao limpar sessão ${this.userId}:`, error);
        }
    }

    /**
     * Verifica se a sessão está inativa há muito tempo
     */
    isInactive(timeoutMinutes = 30) {
        const now = new Date();
        const diffMinutes = (now - this.lastActivity) / (1000 * 60);
        return diffMinutes > timeoutMinutes;
    }
}

/**
 * Gerenciador principal de todas as sessões de usuários
 */
class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.browser = null;
        this.cleanupInterval = null;
        this.maxSessions = 10; // Limite máximo de sessões simultâneas
    }

    /**
     * Inicializa o navegador principal
     */
    async initialize() {
        try {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });

            // Iniciar limpeza automática de sessões inativas
            this.startCleanupInterval();
            
            console.log('🚀 SessionManager inicializado com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar SessionManager:', error);
            return false;
        }
    }

    /**
     * Cria uma nova sessão de usuário
     */
    async createUserSession() {
        try {
            if (this.sessions.size >= this.maxSessions) {
                throw new Error('Limite máximo de sessões atingido');
            }

            const userId = uuidv4();
            const session = new UserSession(userId);
            
            const initialized = await session.initializeBrowser(this.browser);
            if (!initialized) {
                throw new Error('Falha ao inicializar navegador da sessão');
            }

            this.sessions.set(userId, session);
            console.log(`👤 Nova sessão criada: ${userId} (Total: ${this.sessions.size})`);
            
            return {
                success: true,
                userId,
                sessionInfo: {
                    userId,
                    userAgent: session.userAgent,
                    createdAt: session.createdAt
                }
            };
        } catch (error) {
            console.error('❌ Erro ao criar sessão:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Obtém uma sessão específica
     */
    getSession(userId) {
        return this.sessions.get(userId);
    }

    /**
     * Remove uma sessão específica
     */
    async removeSession(userId) {
        const session = this.sessions.get(userId);
        if (session) {
            await session.cleanup();
            this.sessions.delete(userId);
            console.log(`🗑️ Sessão removida: ${userId} (Total: ${this.sessions.size})`);
            return true;
        }
        return false;
    }

    /**
     * Obtém estatísticas das sessões ativas
     */
    getSessionStats() {
        const activeSessions = Array.from(this.sessions.values()).filter(s => s.isActive);
        return {
            totalSessions: this.sessions.size,
            activeSessions: activeSessions.length,
            maxSessions: this.maxSessions,
            sessions: activeSessions.map(s => ({
                userId: s.userId,
                activeUrl: s.activeUrl,
                createdAt: s.createdAt,
                lastActivity: s.lastActivity,
                userAgent: s.userAgent
            }))
        };
    }

    /**
     * Inicia o intervalo de limpeza automática
     */
    startCleanupInterval() {
        this.cleanupInterval = setInterval(async () => {
            await this.cleanupInactiveSessions();
        }, 5 * 60 * 1000); // A cada 5 minutos
    }

    /**
     * Limpa sessões inativas
     */
    async cleanupInactiveSessions() {
        const inactiveSessions = [];
        
        for (const [userId, session] of this.sessions) {
            if (session.isInactive()) {
                inactiveSessions.push(userId);
            }
        }

        for (const userId of inactiveSessions) {
            await this.removeSession(userId);
        }

        if (inactiveSessions.length > 0) {
            console.log(`🧹 ${inactiveSessions.length} sessões inativas removidas`);
        }
    }

    /**
     * Finaliza o gerenciador e limpa todos os recursos
     */
    async shutdown() {
        try {
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
            }

            // Limpar todas as sessões
            for (const [, session] of this.sessions) {
                await session.cleanup();
            }
            this.sessions.clear();

            // Fechar navegador principal
            if (this.browser) {
                await this.browser.close();
            }

            console.log('🛑 SessionManager finalizado');
        } catch (error) {
            console.error('❌ Erro ao finalizar SessionManager:', error);
        }
    }
}

module.exports = { SessionManager, UserSession };