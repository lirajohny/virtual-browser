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

            console.log(`🌐 Proxy ${method.toUpperCase()} ${targetUrl} para usuário ${userId}`);

            // Fazer a requisição
            const response = await axios(requestConfig);

            // Salvar cookies da resposta
            if (response.headers['set-cookie']) {
                await session.saveCookiesFromResponse(targetUrl, response.headers['set-cookie']);
            }

            // Processar resposta baseada no tipo de conteúdo
            const contentType = response.headers['content-type'] || '';
            
            if (contentType.includes('text/html')) {
                // Reescrever HTML
                const rewrittenHtml = this.rewriteHtml(response.data, targetUrl, userId);
                res.set(this.prepareResponseHeaders(response.headers));
                res.send(rewrittenHtml);
            } else if (contentType.includes('application/json')) {
                // Passar JSON diretamente
                res.set(this.prepareResponseHeaders(response.headers));
                res.json(response.data);
            } else {
                // Outros tipos de conteúdo (CSS, JS, imagens, etc.)
                const processedContent = this.processStaticContent(
                    response.data, 
                    contentType, 
                    targetUrl, 
                    userId
                );
                
                res.set(this.prepareResponseHeaders(response.headers));
                res.send(processedContent);
            }

        } catch (error) {
            console.error(`❌ Erro no proxy para ${targetUrl}:`, error.message);
            
            res.status(500).json({
                error: 'Erro no proxy',
                message: error.message,
                targetUrl,
                userId
            });
        }
    }

    /**
     * Prepara headers para a requisição
     */
    prepareHeaders(originalHeaders, targetUrl, session) {
        const parsedUrl = url.parse(targetUrl);
        
        const headers = {
            'User-Agent': session.userAgent,
            'Accept': originalHeaders.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
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
        if (session.activeUrl && session.activeUrl !== targetUrl) {
            headers['Referer'] = session.activeUrl;
        }

        // Adicionar host correto
        if (parsedUrl.host) {
            headers['Host'] = parsedUrl.host;
        }

        // Copiar headers específicos da requisição original
        const allowedHeaders = [
            'authorization',
            'content-type',
            'content-length',
            'x-requested-with'
        ];

        allowedHeaders.forEach(headerName => {
            if (originalHeaders[headerName]) {
                headers[headerName] = originalHeaders[headerName];
            }
        });

        return headers;
    }

    /**
     * Prepara headers para a resposta
     */
    prepareResponseHeaders(originalHeaders) {
        const headers = {};
        
        // Headers permitidos para passar adiante
        const allowedHeaders = [
            'content-type',
            'content-length',
            'cache-control',
            'expires',
            'last-modified',
            'etag'
        ];

        allowedHeaders.forEach(headerName => {
            if (originalHeaders[headerName]) {
                headers[headerName] = originalHeaders[headerName];
            }
        });

        // Remover headers que podem causar problemas
        delete headers['content-security-policy'];
        delete headers['x-frame-options'];
        delete headers['strict-transport-security'];

        return headers;
    }

    /**
     * Reescreve HTML para funcionar através do proxy
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
     * Valida se uma URL é segura para acessar
     */
    isUrlSafe(url) {
        try {
            const parsedUrl = new URL(url);
            
            // Bloquear URLs locais/privadas
            const hostname = parsedUrl.hostname.toLowerCase();
            const blockedHosts = [
                'localhost',
                '127.0.0.1',
                '0.0.0.0',
                '::1'
            ];
            
            if (blockedHosts.includes(hostname)) {
                return false;
            }
            
            // Bloquear redes privadas
            if (hostname.match(/^10\./) || 
                hostname.match(/^192\.168\./) || 
                hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
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