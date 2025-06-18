const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');

/**
 * Sistema de Proxy Personalizado para reescrever e interceptar requisições
 */
class CustomProxy {
    constructor(sessionManager) {
        this.sessionManager = sessionManager;
        this.baseProxyUrl = '/proxy';
    }

    /**
     * Processa uma requisição HTTP através do proxy
     */
    async handleProxyRequest(req, res, userId, targetUrl) {
        try {
            const session = this.sessionManager.getSession(userId);
            if (!session) {
                return res.status(404).json({ 
                    error: 'Sessão não encontrada',
                    userId 
                });
            }

            // Atualizar atividade da sessão
            session.lastActivity = new Date();

            // Determinar método HTTP
            const method = req.method.toLowerCase();
            const headers = this.prepareHeaders(req.headers, targetUrl, session);

            let requestConfig = {
                method,
                url: targetUrl,
                headers,
                timeout: 30000,
                maxRedirects: 5,
                validateStatus: () => true // Aceitar todos os status codes
            };

            // Adicionar dados do corpo para POST/PUT
            if (['post', 'put', 'patch'].includes(method) && req.body) {
                requestConfig.data = req.body;
            }

            // Adicionar cookies da sessão
            const cookies = await session.getCookiesForUrl(targetUrl);
            if (cookies) {
                requestConfig.headers['cookie'] = cookies;
            }

            console.log(`🌐 Proxy: ${method.toUpperCase()} ${targetUrl} (User: ${userId.substring(0, 8)}...)`);

            // Fazer a requisição
            const response = await axios(requestConfig);

            // Salvar cookies da resposta
            if (response.headers['set-cookie']) {
                await session.saveCookiesFromResponse(targetUrl, response.headers['set-cookie']);
            }

            // Processar resposta baseado no tipo de conteúdo
            const contentType = response.headers['content-type'] || '';
            
            if (contentType.includes('text/html')) {
                // Processar HTML
                const rewrittenHtml = this.rewriteHtml(response.data, targetUrl, userId);
                
                // Configurar headers da resposta
                res.set({
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
                
                res.send(rewrittenHtml);
            } else if (contentType.includes('text/css') || 
                       contentType.includes('javascript') || 
                       contentType.includes('text/javascript')) {
                // Processar conteúdo estático
                const processedContent = this.processStaticContent(
                    response.data, 
                    contentType, 
                    targetUrl, 
                    userId
                );
                
                res.set('Content-Type', contentType);
                res.send(processedContent);
            } else {
                // Outros tipos de conteúdo (imagens, etc.)
                res.set('Content-Type', contentType);
                res.send(response.data);
            }

        } catch (error) {
            console.error('❌ Erro no proxy:', error.message);
            
            if (error.code === 'ENOTFOUND') {
                res.status(404).json({
                    error: 'Site não encontrado',
                    url: targetUrl
                });
            } else if (error.code === 'ECONNREFUSED') {
                res.status(503).json({
                    error: 'Conexão recusada pelo servidor',
                    url: targetUrl
                });
            } else {
                res.status(500).json({
                    error: 'Erro interno do proxy',
                    message: error.message,
                    url: targetUrl
                });
            }
        }
    }

    /**
     * Prepara os headers para a requisição
     */
    prepareHeaders(originalHeaders, targetUrl, session) {
        const parsedUrl = url.parse(targetUrl);
        
        // Headers básicos
        const headers = {
            'User-Agent': originalHeaders['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': originalHeaders['accept'] || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': originalHeaders['accept-language'] || 'pt-BR,pt;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        };

        // Adicionar referer se disponível
        if (originalHeaders['referer']) {
            headers['Referer'] = originalHeaders['referer'];
        }

        // Adicionar host correto
        headers['Host'] = parsedUrl.host;

        // Remover headers problemáticos
        delete headers['host'];
        delete headers['connection'];
        delete headers['content-length'];
        delete headers['transfer-encoding'];
        delete headers['content-encoding'];
        delete headers['x-forwarded-for'];
        delete headers['x-forwarded-proto'];
        delete headers['x-forwarded-host'];
        delete headers['x-real-ip'];

        // Remover headers de segurança que podem causar problemas
        delete headers['content-security-policy'];
        delete headers['x-frame-options'];
        delete headers['strict-transport-security'];

        return headers;
    }

    /**
     * Reescreve o HTML para interceptar links e recursos
     */
    rewriteHtml(html, baseUrl, userId) {
        try {
            const $ = cheerio.load(html);
            const parsedBaseUrl = url.parse(baseUrl);
            const baseOrigin = `${parsedBaseUrl.protocol}//${parsedBaseUrl.host}`;

            // Reescrever links (href)
            $('a[href]').each((i, elem) => {
                const href = $(elem).attr('href');
                const newHref = this.rewriteUrl(href, baseOrigin, userId);
                $(elem).attr('href', newHref);
            });

            // Reescrever formulários (action)
            $('form[action]').each((i, elem) => {
                const action = $(elem).attr('action');
                const newAction = this.rewriteUrl(action, baseOrigin, userId);
                $(elem).attr('action', newAction);
            });

            // Reescrever recursos (src)
            $('img[src], script[src], link[href], iframe[src]').each((i, elem) => {
                const tagName = elem.tagName.toLowerCase();
                const attrName = tagName === 'link' ? 'href' : 'src';
                const srcValue = $(elem).attr(attrName);
                
                if (srcValue) {
                    const newSrc = this.rewriteUrl(srcValue, baseOrigin, userId);
                    $(elem).attr(attrName, newSrc);
                }
            });

            // Adicionar script para interceptar navegação via JavaScript
            const interceptScript = `
                <script>
                (function() {
                    const userId = '${userId}';
                    const proxyBase = '/proxy/' + userId + '/';
                    
                    // Interceptar cliques em links
                    document.addEventListener('click', function(e) {
                        const link = e.target.closest('a');
                        if (link && link.href && !link.href.startsWith(proxyBase)) {
                            e.preventDefault();
                            window.location.href = proxyBase + encodeURIComponent(link.href);
                        }
                    });
                    
                    // Interceptar submissão de formulários
                    document.addEventListener('submit', function(e) {
                        const form = e.target;
                        if (form.action && !form.action.startsWith(proxyBase)) {
                            form.action = proxyBase + encodeURIComponent(form.action);
                        }
                    });
                    
                    // Interceptar mudanças no window.location
                    const originalLocation = window.location;
                    Object.defineProperty(window, 'location', {
                        get: function() {
                            return originalLocation;
                        },
                        set: function(url) {
                            if (typeof url === 'string' && !url.startsWith(proxyBase)) {
                                originalLocation.href = proxyBase + encodeURIComponent(url);
                            } else {
                                originalLocation.href = url;
                            }
                        }
                    });
                })();
                </script>
            `;

            // Adicionar CSS para garantir que elementos fixos sejam exibidos
            const fixedElementsCSS = `
                <style>
                /* Garantir que elementos fixos sejam exibidos corretamente no iframe */
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                    min-height: 100vh !important;
                    overflow-x: auto !important;
                    overflow-y: auto !important;
                }

                /* Forçar elementos fixos a permanecerem visíveis */
                *[style*="position: fixed"],
                *[style*="position:fixed"],
                .fixed, .navbar-fixed, .header-fixed, .top-bar, .navigation-bar,
                .navbar, .header, .nav-bar, .navigation, .top-nav,
                .fixed-top, .sticky-top, .navbar-fixed-top, .navbar-fixed-bottom {
                    position: static !important;
                    top: auto !important;
                    left: auto !important;
                    right: auto !important;
                    bottom: auto !important;
                    width: 100% !important;
                    z-index: 1000 !important;
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    transform: none !important;
                }

                /* Garantir que barras de navegação sejam sempre visíveis */
                nav, .nav, .navbar, .header, .top-bar, .navigation {
                    position: static !important;
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    height: auto !important;
                    overflow: visible !important;
                }

                /* Prevenir que elementos sejam escondidos por JavaScript */
                .hidden, .hide, .d-none {
                    display: block !important;
                }

                /* Garantir que o body tenha altura suficiente */
                body {
                    min-height: 100vh !important;
                    position: relative !important;
                }
                </style>
            `;

            // Adicionar o CSS no head
            if ($('head').length > 0) {
                $('head').append(fixedElementsCSS);
            } else {
                $('html').prepend(fixedElementsCSS);
            }

            // Adicionar o script antes do fechamento do body
            if ($('body').length > 0) {
                $('body').append(interceptScript);
            } else {
                $('html').append(interceptScript);
            }

            return $.html();
        } catch (error) {
            console.error('❌ Erro ao reescrever HTML:', error);
            return html; // Retornar HTML original em caso de erro
        }
    }

    /**
     * Processa conteúdo estático (CSS, JS, etc.)
     */
    processStaticContent(content, contentType, baseUrl, userId) {
        try {
            if (contentType.includes('text/css')) {
                // Reescrever URLs em CSS
                return this.rewriteCssUrls(content, baseUrl, userId);
            } else if (contentType.includes('javascript') || contentType.includes('text/javascript')) {
                // Para JavaScript, apenas retornar o conteúdo original
                // Reescrita de JS é complexa e pode quebrar funcionalidades
                return content;
            }
            
            return content;
        } catch (error) {
            console.error('❌ Erro ao processar conteúdo estático:', error);
            return content;
        }
    }

    /**
     * Reescreve URLs em arquivos CSS
     */
    rewriteCssUrls(css, baseUrl, userId) {
        const parsedBaseUrl = url.parse(baseUrl);
        const baseOrigin = `${parsedBaseUrl.protocol}//${parsedBaseUrl.host}`;
        
        // Regex para encontrar URLs em CSS
        const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)/g;
        
        return css.replace(urlRegex, (match, urlPath) => {
            const newUrl = this.rewriteUrl(urlPath, baseOrigin, userId);
            return `url('${newUrl}')`;
        });
    }

    /**
     * Reescreve uma URL individual
     */
    rewriteUrl(originalUrl, baseOrigin, userId) {
        if (!originalUrl) return originalUrl;
        
        // Ignorar URLs que já são do proxy
        if (originalUrl.includes('/proxy/')) {
            return originalUrl;
        }
        
        // Ignorar URLs de dados e JavaScript
        if (originalUrl.startsWith('data:') || 
            originalUrl.startsWith('javascript:') || 
            originalUrl.startsWith('mailto:') ||
            originalUrl.startsWith('tel:')) {
            return originalUrl;
        }
        
        let fullUrl;
        
        if (originalUrl.startsWith('//')) {
            // URL protocol-relative
            fullUrl = 'https:' + originalUrl;
        } else if (originalUrl.startsWith('/')) {
            // URL absoluta (relativa ao domínio)
            fullUrl = baseOrigin + originalUrl;
        } else if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
            // URL completa
            fullUrl = originalUrl;
        } else {
            // URL relativa
            fullUrl = baseOrigin + '/' + originalUrl;
        }
        
        // Retornar URL reescrita para o proxy
        return `/proxy/${userId}/${encodeURIComponent(fullUrl)}`;
    }

    /**
     * Extrai a URL original de uma URL do proxy
     */
    extractOriginalUrl(proxyUrl) {
        const match = proxyUrl.match(/\/proxy\/[^\/]+\/(.+)/);
        if (match) {
            return decodeURIComponent(match[1]);
        }
        return null;
    }

    /**
     * Verifica se uma URL é segura para acesso
     */
    isUrlSafe(url) {
        try {
            const parsedUrl = new URL(url);
            
            // Em desenvolvimento, permitir localhost se a variável de ambiente estiver definida
            const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ALLOW_LOCALHOST === 'true';
            
            // Bloquear URLs locais/privadas (exceto em desenvolvimento)
            const hostname = parsedUrl.hostname.toLowerCase();
            const blockedHosts = [
                'localhost',
                '127.0.0.1',
                '0.0.0.0',
                '::1'
            ];
            
            if (!isDevelopment && blockedHosts.includes(hostname)) {
                return false;
            }
            
            // Bloquear redes privadas (exceto em desenvolvimento)
            if (!isDevelopment && (hostname.match(/^10\./) || 
                hostname.match(/^192\.168\./) || 
                hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./))) {
                return false;
            }
            
            // Permitir apenas HTTP e HTTPS
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = CustomProxy;