const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');

// Importar módulos personalizados
const { SessionManager } = require('./sessions');
const CustomProxy = require('./proxy');
const WebSocketManager = require('./websocket');

/**
 * Servidor Principal do Navegador Virtual Multi-Usuário
 */
class VirtualBrowserServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.port = process.env.PORT || 3000;
        
        // Gerenciadores principais
        this.sessionManager = null;
        this.proxy = null;
        this.wsManager = null;
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * Configura middlewares do Express
     */
    setupMiddleware() {
        // CORS
        this.app.use(cors({
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE"],
            allowedHeaders: ["Content-Type", "Authorization"]
        }));

        // Parse JSON e URL encoded
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Servir arquivos estáticos
        this.app.use(express.static(path.join(__dirname, '../public')));

        // Log de requisições
        this.app.use((req, _res, next) => {
            const timestamp = new Date().toISOString();
            console.log(`📝 ${timestamp} - ${req.method} ${req.url}`);
            next();
        });
    }

    /**
     * Configura rotas da API
     */
    setupRoutes() {
        // Rota principal - servir interface
        this.app.get('/', (_req, res) => {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });

        // API: Criar nova sessão de usuário
        this.app.post('/api/user/create', async (_req, res) => {
            try {
                const result = await this.sessionManager.createUserSession();
                res.json(result);
            } catch (error) {
                console.error('❌ Erro ao criar usuário:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erro interno do servidor'
                });
            }
        });

        // API: Estatísticas das sessões
        this.app.get('/api/sessions/stats', (_req, res) => {
            try {
                const stats = this.sessionManager.getSessionStats();
                res.json({
                    success: true,
                    data: stats
                });
            } catch (error) {
                console.error('❌ Erro ao obter estatísticas:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // API: Obter informações de uma sessão específica
        this.app.get('/api/sessions/:userId', (req, res) => {
            try {
                const { userId } = req.params;
                const session = this.sessionManager.getSession(userId);
                
                if (!session) {
                    return res.status(404).json({
                        success: false,
                        error: 'Sessão não encontrada'
                    });
                }
                
                res.json({
                    success: true,
                    data: {
                        userId: session.userId,
                        activeUrl: session.activeUrl,
                        userAgent: session.userAgent,
                        createdAt: session.createdAt,
                        lastActivity: session.lastActivity,
                        isActive: session.isActive
                    }
                });
            } catch (error) {
                console.error('❌ Erro ao obter sessão:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // API: Remover sessão específica
        this.app.delete('/api/sessions/:userId', async (req, res) => {
            try {
                const { userId } = req.params;
                const removed = await this.sessionManager.removeSession(userId);
                
                if (removed) {
                    res.json({
                        success: true,
                        message: 'Sessão removida com sucesso'
                    });
                } else {
                    res.status(404).json({
                        success: false,
                        error: 'Sessão não encontrada'
                    });
                }
            } catch (error) {
                console.error('❌ Erro ao remover sessão:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Proxy Routes - Interceptar todas as requisições para /proxy/
        this.app.all('/proxy/:userId/*', async (req, res) => {
            try {
                const { userId } = req.params;

                // Extrair URL original
                const originalUrl = this.proxy.extractOriginalUrl(req.originalUrl);

                if (!originalUrl) {
                    return res.status(400).json({
                        error: 'URL inválida',
                        originalUrl: req.originalUrl
                    });
                }

                // Validar segurança da URL
                if (!this.proxy.isUrlSafe(originalUrl)) {
                    return res.status(403).json({
                        error: 'URL não permitida por motivos de segurança',
                        url: originalUrl
                    });
                }

                // Processar através do proxy
                await this.proxy.handleProxyRequest(req, res, userId, originalUrl);
                
            } catch (error) {
                console.error('❌ Erro na rota do proxy:', error);
                res.status(500).json({
                    error: 'Erro interno do proxy',
                    message: error.message
                });
            }
        });

        // API: Navegar diretamente (alternativa ao WebSocket)
        this.app.post('/api/navigate', async (req, res) => {
            try {
                const { userId, url } = req.body;
                
                if (!userId || !url) {
                    return res.status(400).json({
                        success: false,
                        error: 'userId e url são obrigatórios'
                    });
                }
                
                const session = this.sessionManager.getSession(userId);
                if (!session) {
                    return res.status(404).json({
                        success: false,
                        error: 'Sessão não encontrada'
                    });
                }
                
                const result = await session.navigateToUrl(url);
                res.json(result);
                
            } catch (error) {
                console.error('❌ Erro na navegação:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Health check
        this.app.get('/health', (_req, res) => {
            res.json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                sessions: this.sessionManager ? this.sessionManager.getSessionStats() : null
            });
        });

        // Rota 404 para APIs
        this.app.use('/api/*', (req, res) => {
            res.status(404).json({
                error: 'Endpoint não encontrado',
                path: req.originalUrl
            });
        });

        // Rota catch-all para servir o frontend
        this.app.get('*', (_req, res) => {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });
    }

    /**
     * Inicializa todos os componentes do servidor
     */
    async initialize() {
        try {
            console.log('🚀 Inicializando Navegador Virtual Multi-Usuário...');
            
            // Inicializar gerenciador de sessões
            console.log('📋 Inicializando SessionManager...');
            this.sessionManager = new SessionManager();
            const sessionInitialized = await this.sessionManager.initialize();
            
            if (!sessionInitialized) {
                throw new Error('Falha ao inicializar SessionManager');
            }
            
            // Inicializar proxy
            console.log('🌐 Inicializando CustomProxy...');
            this.proxy = new CustomProxy(this.sessionManager);
            
            // Inicializar WebSocket Manager
            console.log('🔌 Inicializando WebSocketManager...');
            this.wsManager = new WebSocketManager(this.server, this.sessionManager);
            
            console.log('✅ Todos os componentes inicializados com sucesso!');
            return true;
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            return false;
        }
    }

    /**
     * Inicia o servidor
     */
    async start() {
        try {
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('Falha na inicialização dos componentes');
            }
            
            this.server.listen(this.port, () => {
                console.log('\n🎉 ===================================');
                console.log('🌟 NAVEGADOR VIRTUAL MULTI-USUÁRIO');
                console.log('🎉 ===================================');
                console.log(`🚀 Servidor rodando na porta ${this.port}`);
                console.log(`🌐 Acesse: http://localhost:${this.port}`);
                console.log(`📊 Health Check: http://localhost:${this.port}/health`);
                console.log(`📈 API Stats: http://localhost:${this.port}/api/sessions/stats`);
                console.log('🎉 ===================================\n');
            });
            
            // Configurar handlers de finalização
            this.setupShutdownHandlers();
            
        } catch (error) {
            console.error('❌ Erro ao iniciar servidor:', error);
            process.exit(1);
        }
    }

    /**
     * Configura handlers para finalização limpa do servidor
     */
    setupShutdownHandlers() {
        const shutdown = async (signal) => {
            console.log(`\n🛑 Recebido sinal ${signal}. Finalizando servidor...`);
            
            try {
                // Fechar servidor HTTP
                this.server.close(() => {
                    console.log('🔌 Servidor HTTP fechado');
                });
                
                // Finalizar WebSocket Manager
                if (this.wsManager) {
                    this.wsManager.shutdown();
                }
                
                // Finalizar Session Manager
                if (this.sessionManager) {
                    await this.sessionManager.shutdown();
                }
                
                console.log('✅ Servidor finalizado com sucesso');
                process.exit(0);
                
            } catch (error) {
                console.error('❌ Erro durante finalização:', error);
                process.exit(1);
            }
        };
        
        // Capturar sinais de finalização
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        
        // Capturar erros não tratados
        process.on('uncaughtException', (error) => {
            console.error('❌ Erro não capturado:', error);
            shutdown('uncaughtException');
        });
        
        process.on('unhandledRejection', (reason) => {
            console.error('❌ Promise rejeitada não tratada:', reason);
            shutdown('unhandledRejection');
        });
    }
}

// Inicializar e executar servidor se este arquivo for executado diretamente
if (require.main === module) {
    const server = new VirtualBrowserServer();
    server.start();
}

module.exports = VirtualBrowserServer;