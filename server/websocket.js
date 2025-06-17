const { Server } = require('socket.io');

/**
 * Gerenciador de WebSocket para comunicação em tempo real
 */
class WebSocketManager {
    constructor(server, sessionManager) {
        this.io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.sessionManager = sessionManager;
        this.connectedClients = new Map(); // socketId -> { userId, socket }
        this.userSockets = new Map(); // userId -> Set of socketIds
        
        this.setupEventHandlers();
        console.log('🔌 WebSocket Manager inicializado');
    }

    /**
     * Configura os manipuladores de eventos do WebSocket
     */
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔗 Cliente conectado: ${socket.id}`);
            
            // Evento: Registrar usuário
            socket.on('register-user', async (data) => {
                await this.handleUserRegistration(socket, data);
            });
            
            // Evento: Navegar para URL
            socket.on('navigate', async (data) => {
                await this.handleNavigation(socket, data);
            });
            
            // Evento: Executar JavaScript
            socket.on('execute-script', async (data) => {
                await this.handleScriptExecution(socket, data);
            });
            
            // Evento: Obter informações da sessão
            socket.on('get-session-info', async (data) => {
                await this.handleGetSessionInfo(socket, data);
            });
            
            // Evento: Criar nova aba
            socket.on('create-tab', async (data) => {
                await this.handleCreateTab(socket, data);
            });
            
            // Evento: Fechar aba/sessão
            socket.on('close-session', async (data) => {
                await this.handleCloseSession(socket, data);
            });
            
            // Evento: Ping para manter conexão viva
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: Date.now() });
            });
            
            // Evento: Desconexão
            socket.on('disconnect', () => {
                this.handleDisconnection(socket);
            });
        });
    }

    /**
     * Manipula o registro de um novo usuário
     */
    async handleUserRegistration(socket, data) {
        try {
            const { userId } = data;
            
            let sessionInfo;
            
            if (userId && this.sessionManager.getSession(userId)) {
                // Usuário existente reconectando
                const session = this.sessionManager.getSession(userId);
                sessionInfo = {
                    userId: session.userId,
                    userAgent: session.userAgent,
                    createdAt: session.createdAt,
                    activeUrl: session.activeUrl,
                    reconnected: true
                };
                console.log(`🔄 Usuário reconectado: ${userId}`);
            } else {
                // Novo usuário
                const result = await this.sessionManager.createUserSession();
                if (!result.success) {
                    socket.emit('registration-error', { 
                        error: result.error 
                    });
                    return;
                }
                sessionInfo = result.sessionInfo;
                console.log(`👤 Novo usuário registrado: ${sessionInfo.userId}`);
            }
            
            // Registrar conexão
            this.connectedClients.set(socket.id, {
                userId: sessionInfo.userId,
                socket: socket,
                connectedAt: new Date()
            });
            
            // Mapear usuário para sockets
            if (!this.userSockets.has(sessionInfo.userId)) {
                this.userSockets.set(sessionInfo.userId, new Set());
            }
            this.userSockets.get(sessionInfo.userId).add(socket.id);
            
            // Enviar confirmação
            socket.emit('user-registered', sessionInfo);
            
            // Broadcast estatísticas atualizadas
            this.broadcastSessionStats();
            
        } catch (error) {
            console.error('❌ Erro no registro de usuário:', error);
            socket.emit('registration-error', { 
                error: error.message 
            });
        }
    }

    /**
     * Manipula navegação para uma nova URL
     */
    async handleNavigation(socket, data) {
        try {
            const { userId, url } = data;
            
            if (!userId || !url) {
                socket.emit('navigation-error', { 
                    error: 'userId e url são obrigatórios' 
                });
                return;
            }
            
            const session = this.sessionManager.getSession(userId);
            if (!session) {
                socket.emit('navigation-error', { 
                    error: 'Sessão não encontrada' 
                });
                return;
            }
            
            // Emitir status de carregamento
            this.emitToUser(userId, 'navigation-started', { 
                url, 
                timestamp: Date.now() 
            });
            
            // Navegar usando Puppeteer
            const result = await session.navigateToUrl(url);
            
            if (result.success) {
                this.emitToUser(userId, 'navigation-completed', {
                    url: result.url,
                    title: result.title,
                    status: result.status,
                    timestamp: Date.now()
                });
                
                console.log(`🌐 Navegação bem-sucedida para ${result.url} (usuário: ${userId})`);
            } else {
                this.emitToUser(userId, 'navigation-error', {
                    url,
                    error: result.error,
                    timestamp: Date.now()
                });
                
                console.error(`❌ Erro na navegação para ${url} (usuário: ${userId}):`, result.error);
            }
            
        } catch (error) {
            console.error('❌ Erro na manipulação de navegação:', error);
            socket.emit('navigation-error', { 
                error: error.message 
            });
        }
    }

    /**
     * Manipula execução de JavaScript na página
     */
    async handleScriptExecution(socket, data) {
        try {
            const { userId, script } = data;
            
            if (!userId || !script) {
                socket.emit('script-error', { 
                    error: 'userId e script são obrigatórios' 
                });
                return;
            }
            
            const session = this.sessionManager.getSession(userId);
            if (!session) {
                socket.emit('script-error', { 
                    error: 'Sessão não encontrada' 
                });
                return;
            }
            
            const result = await session.executeScript(script);
            
            if (result.success) {
                socket.emit('script-result', {
                    result: result.result,
                    timestamp: Date.now()
                });
            } else {
                socket.emit('script-error', {
                    error: result.error,
                    timestamp: Date.now()
                });
            }
            
        } catch (error) {
            console.error('❌ Erro na execução de script:', error);
            socket.emit('script-error', { 
                error: error.message 
            });
        }
    }

    /**
     * Manipula solicitação de informações da sessão
     */
    async handleGetSessionInfo(socket, data) {
        try {
            const { userId } = data;
            
            const session = this.sessionManager.getSession(userId);
            if (!session) {
                socket.emit('session-info-error', { 
                    error: 'Sessão não encontrada' 
                });
                return;
            }
            
            const sessionInfo = {
                userId: session.userId,
                activeUrl: session.activeUrl,
                userAgent: session.userAgent,
                createdAt: session.createdAt,
                lastActivity: session.lastActivity,
                isActive: session.isActive
            };
            
            socket.emit('session-info', sessionInfo);
            
        } catch (error) {
            console.error('❌ Erro ao obter informações da sessão:', error);
            socket.emit('session-info-error', { 
                error: error.message 
            });
        }
    }

    /**
     * Manipula criação de nova aba (nova sessão)
     */
    async handleCreateTab(socket) {
        try {
            const result = await this.sessionManager.createUserSession();

            if (result.success) {
                socket.emit('tab-created', result.sessionInfo);
                this.broadcastSessionStats();
                console.log(`📑 Nova aba criada: ${result.sessionInfo.userId}`);
            } else {
                socket.emit('tab-creation-error', {
                    error: result.error
                });
            }
        } catch (error) {
            console.error('❌ Erro ao criar aba:', error);
            socket.emit('tab-creation-error', {
                error: 'Erro interno do servidor'
            });
            console.error('❌ Erro ao criar nova aba:', error);
            socket.emit('tab-creation-error', { 
                error: error.message 
            });
        }
    }

    /**
     * Manipula fechamento de sessão
     */
    async handleCloseSession(socket, data) {
        try {
            const { userId } = data;
            
            if (!userId) {
                socket.emit('close-session-error', { 
                    error: 'userId é obrigatório' 
                });
                return;
            }
            
            const removed = await this.sessionManager.removeSession(userId);
            
            if (removed) {
                // Remover mapeamentos de socket
                if (this.userSockets.has(userId)) {
                    this.userSockets.delete(userId);
                }
                
                socket.emit('session-closed', { userId });
                this.broadcastSessionStats();
                console.log(`🗑️ Sessão fechada via WebSocket: ${userId}`);
            } else {
                socket.emit('close-session-error', { 
                    error: 'Sessão não encontrada' 
                });
            }
            
        } catch (error) {
            console.error('❌ Erro ao fechar sessão:', error);
            socket.emit('close-session-error', { 
                error: error.message 
            });
        }
    }

    /**
     * Manipula desconexão de cliente
     */
    handleDisconnection(socket) {
        const clientInfo = this.connectedClients.get(socket.id);
        
        if (clientInfo) {
            const { userId } = clientInfo;
            
            // Remover da lista de clientes conectados
            this.connectedClients.delete(socket.id);
            
            // Remover do mapeamento de usuário para sockets
            if (this.userSockets.has(userId)) {
                this.userSockets.get(userId).delete(socket.id);
                
                // Se não há mais sockets para este usuário, remover o mapeamento
                if (this.userSockets.get(userId).size === 0) {
                    this.userSockets.delete(userId);
                }
            }
            
            console.log(`🔌 Cliente desconectado: ${socket.id} (usuário: ${userId})`);
            
            // Broadcast estatísticas atualizadas
            this.broadcastSessionStats();
        } else {
            console.log(`🔌 Cliente desconectado: ${socket.id}`);
        }
    }

    /**
     * Emite evento para todos os sockets de um usuário específico
     */
    emitToUser(userId, event, data) {
        const socketIds = this.userSockets.get(userId);
        if (socketIds) {
            socketIds.forEach(socketId => {
                const clientInfo = this.connectedClients.get(socketId);
                if (clientInfo) {
                    clientInfo.socket.emit(event, data);
                }
            });
        }
    }

    /**
     * Faz broadcast das estatísticas de sessão para todos os clientes
     */
    broadcastSessionStats() {
        const stats = this.sessionManager.getSessionStats();
        const connectionStats = {
            connectedClients: this.connectedClients.size,
            activeUsers: this.userSockets.size
        };
        
        this.io.emit('session-stats', {
            ...stats,
            ...connectionStats,
            timestamp: Date.now()
        });
    }

    /**
     * Envia notificação para todos os clientes
     */
    broadcastNotification(type, message, data = {}) {
        this.io.emit('notification', {
            type, // 'info', 'warning', 'error', 'success'
            message,
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Obtém estatísticas de conexão
     */
    getConnectionStats() {
        return {
            connectedClients: this.connectedClients.size,
            activeUsers: this.userSockets.size,
            connections: Array.from(this.connectedClients.values()).map(client => ({
                socketId: client.socket.id,
                userId: client.userId,
                connectedAt: client.connectedAt
            }))
        };
    }

    /**
     * Finaliza o WebSocket Manager
     */
    shutdown() {
        try {
            this.io.close();
            this.connectedClients.clear();
            this.userSockets.clear();
            console.log('🛑 WebSocket Manager finalizado');
        } catch (error) {
            console.error('❌ Erro ao finalizar WebSocket Manager:', error);
        }
    }
}

module.exports = WebSocketManager;