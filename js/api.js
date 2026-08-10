/**
 * Módulo de API - Cliente HTTP para backend serverless
 */

// Verificar se config existe
const CONFIG = window.APP_CONFIG || { API_BASE_URL: '' };

if (!CONFIG.API_BASE_URL) {
    console.error('APP_CONFIG.API_BASE_URL não definido. Verifique o script de configuração no HTML.');
}

// ============================================
// LOGGER
// ============================================

const Logger = {
    logs: [],

    log: function(tipo, mensagem, dados) {
        dados = dados || null;
        const entry = {
            timestamp: new Date().toISOString(),
            tipo: tipo,
            mensagem: mensagem,
            dados: dados
        };
        this.logs.unshift(entry);
        if (this.logs.length > 50) this.logs.pop();
        this.atualizarDebug();
    },

    atualizarDebug: function() {
        const el = document.getElementById('debug-logs');
        if (!el) return;

        el.textContent = this.logs.map(function(l) {
            let msg = '[' + l.timestamp + '] ' + l.tipo.toUpperCase() + ': ' + l.mensagem;
            if (l.dados) {
                msg += '\n' + JSON.stringify(l.dados, null, 2);
            }
            return msg;
        }).join('\n---\n');
    },

    getLogs: function() {
        return this.logs.slice();
    }
};

// ============================================
// HTTP CLIENT
// ============================================

function apiRequest(endpoint, method, body) {
    method = method || 'GET';
    body = body || null;

    const url = CONFIG.API_BASE_URL + endpoint;
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    Logger.log('request', method + ' ' + endpoint, { url: url, body: body });

    return fetch(url, options)
        .then(function(response) {
            // Log da resposta
            Logger.log('response', method + ' ' + endpoint + ' → ' + response.status, { 
                status: response.status
            });

            // Clonar resposta para tentar JSON
            const clone = response.clone();

            return response.json()
                .then(function(data) {
                    if (!response.ok) {
                        throw new Error(data.error || 'HTTP ' + response.status);
                    }
                    return data;
                })
                .catch(function(err) {
                    // Se não for JSON, tentar texto
                    return clone.text()
                        .then(function(text) {
                            throw new Error('Resposta não-JSON: ' + text.substring(0, 100));
                        })
                        .catch(function() {
                            throw new Error('Erro ao parsear resposta: ' + err.message);
                        });
                });
        })
        .catch(function(erro) {
            Logger.log('error', method + ' ' + endpoint + ' falhou', { 
                mensagem: erro.message 
            });
            throw erro;
        });
}

// ============================================
// API EXPOSITA
// ============================================

const userApi = {
    getAll: function() { return apiRequest('/users'); },
    getById: function(id) { return apiRequest('/users/' + id); },
    create: function(data) { return apiRequest('/users', 'POST', data); },
    update: function(id, data) { return apiRequest('/users/' + id, 'PUT', data); },
    delete: function(id) { return apiRequest('/users/' + id, 'DELETE'); }
};

// ============================================
// UTILITÁRIOS
// ============================================

const Utils = {
    escapeHtml: function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    mostrarAlerta: function(tipo, mensagem, duracao) {
        duracao = duracao || 5000;
        const container = document.getElementById('alert-container');

        if (!container) {
            console.error('Container de alertas não encontrado');
            alert(mensagem);
            return;
        }

        const div = document.createElement('div');
        div.className = 'alert alert-' + tipo;

        const icon = tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️';
        div.innerHTML = '<span>' + icon + '</span><span>' + this.escapeHtml(mensagem) + '</span>';

        container.appendChild(div);

        if (duracao > 0) {
            setTimeout(function() {
                if (div.parentNode) div.parentNode.removeChild(div);
            }, duracao);
        }

        return div;
    },

    setLoading: function(elemento, carregando) {
        if (elemento) {
            elemento.style.display = carregando ? 'inline-flex' : 'none';
        }
    }
};

// ============================================
// EXPORTAÇÃO GLOBAL
// ============================================

window.API = {
    config: CONFIG,
    logger: Logger,
    users: userApi,
    utils: Utils,
    request: apiRequest
};

console.log('API.js carregado com sucesso. URL:', CONFIG.API_BASE_URL);