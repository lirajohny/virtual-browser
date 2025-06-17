/**
 * Cliente JavaScript para o Navegador Virtual Multi-Usuário
 */
class VirtualBrowserClient {
    constructor() {
        this.socket = null;
        this.currentUserId = null;
        this.tabs = new Map(); // tabId -> { userId, title, url, active }
        this.activeTabId = null;
        this.isConnected = false;
        
        this.init();
    }

    /**
     * Inicializa o cliente
     */
    async init() {
        try {
            console.log('🚀 Inicializando cliente...');
            
            this.setupEventListeners();
            await this.connectWebSocket();
            
            console.log('✅ Cliente inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            this.showNotification('Erro na inicialização', 'error');
        }
    }

    /**
     * Conecta ao WebSocket
     */
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io();
                
                // Eventos de conexão
                this.socket.on('connect', () => {
                    console.log('🔗 Conectado ao WebSocket');
                    this.isConnected = true;
                    this.updateConnectionStatus('connected');
                    this.registerUser();
                    resolve();
                });
                
                this.socket.on('disconnect', () => {
                    console.log('🔌 Desconectado do WebSocket');
                    this.isConnected = false;
                    this.updateConnectionStatus('disconnected');
                });
                
                this.socket.on('connect_error', (error) => {
                    console.error('❌ Erro de conexão WebSocket:', error);
                    this.updateConnectionStatus('disconnected');
                    reject(error);
                });
                
                // Eventos de usuário
                this.socket.on('user-registered', (data) => {
                    this.handleUserRegistered(data);
                });
                
                this.socket.on('registration-error', (data) => {
                    this.showError('Erro no registro', data.error);
                });
                
                // Eventos de navegação
                this.socket.on('navigation-started', (data) => {
                    this.handleNavigationStarted(data);
                });
                
                this.socket.on('navigation-completed', (data) => {
                    this.handleNavigationCompleted(data);
                });
                
                this.socket.on('navigation-error', (data) => {
                    this.handleNavigationError(data);
                });
                
                // Eventos de abas
                this.socket.on('tab-created', (data) => {
                    this.handleTabCreated(data);
                });
                
                this.socket.on('tab-creation-error', (data) => {
                    this.showError('Erro ao criar aba', data.error);
                });
                
                // Eventos de sessão
                this.socket.on('session-closed', (data) => {
                    this.handleSessionClosed(data);
                });
                
                this.socket.on('session-stats', (data) => {
                    this.updateSessionStats(data);
                });
                
                // Eventos de notificação
                this.socket.on('notification', (data) => {
                    this.showNotification(data.message, data.type);
                });
                
                // Ping/Pong para manter conexão
                this.socket.on('pong', () => {
                    // Conexão ativa
                });

                // Timeout de conexão
                setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new Error('Timeout na conexão WebSocket'));
                    }
                }, 10000);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Registra o usuário no servidor
     */
    registerUser() {
        // Tentar recuperar userId do localStorage
        const savedUserId = localStorage.getItem('virtualBrowser_userId');
        
        this.socket.emit('register-user', {
            userId: savedUserId
        });
    }

    /**
     * Manipula o registro bem-sucedido do usuário
     */
    handleUserRegistered(data) {
        console.log('👤 Usuário registrado:', data);
        
        this.currentUserId = data.userId;
        localStorage.setItem('virtualBrowser_userId', data.userId);
        
        // Atualizar interface
        this.updateUserInfo(data);
        
        // Criar primeira aba se não existir
        if (this.tabs.size === 0) {
            this.createTab(data.userId, 'Nova Aba', '');
        }
        
        this.showNotification(
            data.reconnected ? 'Reconectado com sucesso!' : 'Bem-vindo! Sessão criada.',
            'success'
        );
    }

    /**
     * Atualiza informações do usuário na interface
     */
    updateUserInfo(data) {
        document.getElementById('user-id').textContent = data.userId.substring(0, 8) + '...';
        document.getElementById('created-at').textContent = new Date(data.createdAt).toLocaleString();
        document.getElementById('last-activity').textContent = 'Agora';
    }

    /**
     * Atualiza status da conexão
     */
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        const statusText = statusElement.querySelector('span');
        
        statusElement.className = `connection-status ${status}`;
        
        switch (status) {
            case 'connected':
                statusText.textContent = 'Conectado';
                break;
            case 'disconnected':
                statusText.textContent = 'Desconectado';
                break;
            case 'connecting':
                statusText.textContent = 'Conectando...';
                break;
        }
    }

    /**
     * Atualiza estatísticas de sessão
     */
    updateSessionStats(data) {
        document.getElementById('active-users').textContent = data.activeUsers || 0;
        document.getElementById('active-sessions').textContent = data.activeSessions || 0;
        
        // Atualizar lista de sessões
        this.updateSessionsList(data.sessions || []);
    }

    /**
     * Atualiza lista de sessões ativas
     */
    updateSessionsList(sessions) {
        const container = document.getElementById('sessions-container');
        container.innerHTML = '';
        
        sessions.forEach(session => {
            const sessionElement = document.createElement('div');
            sessionElement.className = `session-item ${session.userId === this.currentUserId ? 'current' : ''}`;
            
            sessionElement.innerHTML = `
                <div class="session-info">
                    <strong>ID:</strong> ${session.userId.substring(0, 8)}...
                </div>
                <div class="session-url">${session.activeUrl || 'Nenhuma URL'}</div>
            `;
            
            container.appendChild(sessionElement);
        });
    }

    /**
     * Configura event listeners da interface
     */
    setupEventListeners() {
        // Barra de endereços
        const urlInput = document.getElementById('url-input');
        const goBtn = document.getElementById('go-btn');
        
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.navigateToUrl(urlInput.value);
            }
        });
        
        goBtn.addEventListener('click', () => {
            this.navigateToUrl(urlInput.value);
        });
        
        // Botões de navegação
        document.getElementById('back-btn').addEventListener('click', () => {
            this.goBack();
        });
        
        document.getElementById('forward-btn').addEventListener('click', () => {
            this.goForward();
        });
        
        document.getElementById('reload-btn').addEventListener('click', () => {
            this.reloadPage();
        });
        
        // Controles da sidebar
        document.getElementById('new-tab-btn').addEventListener('click', () => {
            this.createNewTab();
        });
        
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshCurrentTab();
        });
        
        document.getElementById('close-session-btn').addEventListener('click', () => {
            this.closeCurrentSession();
        });
        
        // Botão de nova aba
        document.getElementById('new-tab-button').addEventListener('click', () => {
            this.createNewTab();
        });
        
        // Quick links
        document.querySelectorAll('.quick-link').forEach(link => {
            link.addEventListener('click', () => {
                const url = link.getAttribute('data-url');
                this.navigateToUrl(url);
            });
        });
        
        // Modais
        this.setupModalListeners();
    }

    /**
     * Configura listeners dos modais
     */
    setupModalListeners() {
        // Modal de erro
        const errorModal = document.getElementById('error-modal');
        const errorClose = document.getElementById('error-modal-close');
        const errorOk = document.getElementById('error-modal-ok');
        
        [errorClose, errorOk].forEach(btn => {
            btn.addEventListener('click', () => {
                errorModal.classList.add('hidden');
            });
        });
        
        // Modal de confirmação
        const confirmModal = document.getElementById('confirm-modal');
        const confirmClose = document.getElementById('confirm-modal-close');
        const confirmCancel = document.getElementById('confirm-modal-cancel');
        
        [confirmClose, confirmCancel].forEach(btn => {
            btn.addEventListener('click', () => {
                confirmModal.classList.add('hidden');
            });
        });
        
        // Fechar modal clicando fora
        [errorModal, confirmModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }

    /**
     * Navega para uma URL
     */
    navigateToUrl(url) {
        if (!url || !this.currentUserId) {
            return;
        }
        
        // Adicionar protocolo se não existir
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            // Se parece com uma pesquisa, usar Google
            if (!url.includes('.') || url.includes(' ')) {
                url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
            } else {
                url = 'https://' + url;
            }
        }
        
        console.log('🌐 Navegando para:', url);
        
        // Atualizar barra de endereços
        document.getElementById('url-input').value = url;
        
        // Mostrar loading
        this.showLoading(true);
        
        // Navegar via proxy
        this.navigateViaProxy(url);
    }

    /**
     * Navega via proxy HTTP
     */
    navigateViaProxy(url) {
        if (!this.currentUserId) {
            this.showError('Erro', 'Usuário não registrado');
            return;
        }
        
        const proxyUrl = `/proxy/${this.currentUserId}/${encodeURIComponent(url)}`;
        const contentFrame = document.getElementById('content-frame');
        
        // Ocultar tela de boas-vindas
        document.getElementById('welcome-screen').classList.add('hidden');
        
        // Mostrar iframe
        contentFrame.style.display = 'block';
        contentFrame.src = proxyUrl;
        
        // Atualizar aba ativa
        if (this.activeTabId) {
            const tab = this.tabs.get(this.activeTabId);
            if (tab) {
                tab.url = url;
                this.updateTabTitle(this.activeTabId, this.extractDomainFromUrl(url));
            }
        }
        
        // Ocultar loading após um tempo
        setTimeout(() => {
            this.showLoading(false);
        }, 2000);
    }

    /**
     * Manipula início da navegação
     */
    handleNavigationStarted(data) {
        console.log('🌐 Navegação iniciada:', data.url);
        this.showLoading(true);
    }

    /**
     * Manipula navegação completada
     */
    handleNavigationCompleted(data) {
        console.log('✅ Navegação completada:', data);
        this.showLoading(false);
        
        // Atualizar aba ativa
        if (this.activeTabId) {
            const tab = this.tabs.get(this.activeTabId);
            if (tab) {
                tab.url = data.url;
                tab.title = data.title || this.extractDomainFromUrl(data.url);
                this.updateTabTitle(this.activeTabId, tab.title);
            }
        }
        
        // Atualizar barra de endereços
        document.getElementById('url-input').value = data.url;
    }

    /**
     * Manipula erro na navegação
     */
    handleNavigationError(data) {
        console.error('❌ Erro na navegação:', data);
        this.showLoading(false);
        this.showError('Erro na Navegação', data.error);
    }

    /**
     * Cria uma nova aba
     */
    createTab(userId, title, url) {
        const tabId = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        const tab = {
            id: tabId,
            userId: userId,
            title: title || 'Nova Aba',
            url: url || '',
            active: false
        };
        
        this.tabs.set(tabId, tab);
        this.renderTab(tab);
        
        // Ativar a aba se for a primeira
        if (this.tabs.size === 1) {
            this.activateTab(tabId);
        }
        
        return tabId;
    }

    /**
     * Renderiza uma aba na interface
     */
    renderTab(tab) {
        const tabsContainer = document.getElementById('tabs-container');
        
        const tabElement = document.createElement('div');
        tabElement.className = 'tab';
        tabElement.setAttribute('data-tab-id', tab.id);
        
        tabElement.innerHTML = `
            <span class="tab-title">${tab.title}</span>
            <button class="tab-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Event listeners
        tabElement.addEventListener('click', (e) => {
            if (!e.target.closest('.tab-close')) {
                this.activateTab(tab.id);
            }
        });
        
        tabElement.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(tab.id);
        });
        
        tabsContainer.appendChild(tabElement);
    }

    /**
     * Ativa uma aba
     */
    activateTab(tabId) {
        // Desativar todas as abas
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        this.tabs.forEach(tab => {
            tab.active = false;
        });
        
        // Ativar aba selecionada
        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement) {
            tabElement.classList.add('active');
        }
        
        const tab = this.tabs.get(tabId);
        if (tab) {
            tab.active = true;
            this.activeTabId = tabId;
            this.currentUserId = tab.userId;
            
            // Atualizar barra de endereços
            document.getElementById('url-input').value = tab.url || '';
            
            // Navegar se houver URL
            if (tab.url) {
                this.navigateViaProxy(tab.url);
            } else {
                // Mostrar tela de boas-vindas
                document.getElementById('welcome-screen').classList.remove('hidden');
                document.getElementById('content-frame').style.display = 'none';
            }
        }
    }

    /**
     * Fecha uma aba
     */
    closeTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;
        
        // Remover da interface
        const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement) {
            tabElement.remove();
        }
        
        // Remover do mapa
        this.tabs.delete(tabId);
        
        // Se era a aba ativa, ativar outra
        if (this.activeTabId === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.activateTab(remainingTabs[0]);
            } else {
                this.activeTabId = null;
                this.currentUserId = null;
                document.getElementById('welcome-screen').classList.remove('hidden');
                document.getElementById('content-frame').style.display = 'none';
            }
        }
        
        // Fechar sessão no servidor se necessário
        if (tab.userId !== this.currentUserId) {
            this.socket.emit('close-session', { userId: tab.userId });
        }
    }

    /**
     * Atualiza título de uma aba
     */
    updateTabTitle(tabId, title) {
        const tab = this.tabs.get(tabId);
        if (tab) {
            tab.title = title;
            
            const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
            if (tabElement) {
                const titleElement = tabElement.querySelector('.tab-title');
                titleElement.textContent = title;
            }
        }
    }

    /**
     * Cria uma nova aba com nova sessão
     */
    createNewTab() {
        this.socket.emit('create-tab', {});
    }

    /**
     * Manipula criação de nova aba
     */
    handleTabCreated(data) {
        console.log('📑 Nova aba criada:', data);
        const tabId = this.createTab(data.userId, 'Nova Aba', '');
        this.activateTab(tabId);
        this.showNotification('Nova aba criada!', 'success');
    }

    /**
     * Manipula fechamento de sessão
     */
    handleSessionClosed(data) {
        console.log('🗑️ Sessão fechada:', data.userId);
        
        // Encontrar e fechar aba correspondente
        for (const [tabId, tab] of this.tabs) {
            if (tab.userId === data.userId) {
                this.closeTab(tabId);
                break;
            }
        }
    }

    /**
     * Atualiza a página atual
     */
    refreshCurrentTab() {
        if (this.activeTabId) {
            const tab = this.tabs.get(this.activeTabId);
            if (tab && tab.url) {
                this.navigateViaProxy(tab.url);
            }
        }
    }

    /**
     * Fecha a sessão atual
     */
    closeCurrentSession() {
        if (!this.currentUserId) return;
        
        this.showConfirm(
            'Tem certeza que deseja fechar esta sessão?',
            () => {
                this.socket.emit('close-session', { userId: this.currentUserId });
            }
        );
    }

    /**
     * Volta para a página anterior
     */
    goBack() {
        const contentFrame = document.getElementById('content-frame');
        if (contentFrame.contentWindow) {
            contentFrame.contentWindow.history.back();
        }
    }

    /**
     * Avança para a próxima página
     */
    goForward() {
        const contentFrame = document.getElementById('content-frame');
        if (contentFrame.contentWindow) {
            contentFrame.contentWindow.history.forward();
        }
    }

    /**
     * Recarrega a página atual
     */
    reloadPage() {
        const contentFrame = document.getElementById('content-frame');
        if (contentFrame.src) {
            contentFrame.src = contentFrame.src;
        }
    }

    /**
     * Mostra/oculta overlay de loading
     */
    showLoading(show) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (show) {
            loadingOverlay.classList.remove('hidden');
        } else {
            loadingOverlay.classList.add('hidden');
        }
    }

    /**
     * Mostra uma notificação
     */
    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications-container');
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        notification.innerHTML = `
            <div>${message}</div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Event listener para fechar
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        container.appendChild(notification);
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Mostra modal de erro
     */
    showError(title, message) {
        document.getElementById('error-title').textContent = title;
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-modal').classList.remove('hidden');
    }

    /**
     * Mostra modal de confirmação
     */
    showConfirm(message, onConfirm) {
        document.getElementById('confirm-message').textContent = message;
        
        const confirmModal = document.getElementById('confirm-modal');
        const confirmOk = document.getElementById('confirm-modal-ok');
        
        // Remover listeners anteriores
        const newConfirmOk = confirmOk.cloneNode(true);
        confirmOk.parentNode.replaceChild(newConfirmOk, confirmOk);
        
        // Adicionar novo listener
        newConfirmOk.addEventListener('click', () => {
            confirmModal.classList.add('hidden');
            if (onConfirm) onConfirm();
        });
        
        confirmModal.classList.remove('hidden');
    }

    /**
     * Extrai domínio de uma URL
     */
    extractDomainFromUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (error) {
            return url.substring(0, 30) + '...';
        }
    }

    /**
     * Envia ping para manter conexão
     */
    startPingInterval() {
        setInterval(() => {
            if (this.isConnected && this.socket) {
                this.socket.emit('ping');
            }
        }, 30000); // A cada 30 segundos
    }
}

// Inicializar cliente quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.virtualBrowserClient = new VirtualBrowserClient();
});

// Prevenir fechamento acidental da página
window.addEventListener('beforeunload', (e) => {
    if (window.virtualBrowserClient && window.virtualBrowserClient.tabs.size > 0) {
        const message = 'Você tem sessões ativas. Tem certeza que deseja sair?';
        e.preventDefault();
        return message;
    }
});