/**
 * Módulo de API - Cliente HTTP para backend serverless
 */

const CONFIG = window.APP_CONFIG || { API_BASE_URL: '' };

if (!CONFIG.API_BASE_URL) {
    console.error('APP_CONFIG.API_BASE_URL não definido');
}

const Logger = {
    logs: [],

    log: function(tipo, mensagem, dados) {
        const entry = {
            timestamp: new Date().toISOString(),
            tipo: tipo,
            mensagem: mensagem,
            dados: dados || null
        };
        this.logs.unshift(entry);
        if (this.logs.length > 50) this.logs.pop();
        this.atualizarDebug();
        console.log('[' + tipo + ']', mensagem, dados || '');
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

function apiRequest(endpoint, method, body) {
    method = method || 'GET';

    const url = CONFIG.API_BASE_URL + endpoint;
    const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    Logger.log('request', method + ' ' + endpoint, { url: url });

    return fetch(url, options)
        .then(function(response) {
            const status = response.status;

            return response.text().then(function(text) {
                Logger.log('response_raw', method + ' ' + endpoint + ' → ' + status, { 
                    status: status,
                    body: text.substring(0, 500)
                });

                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    data = { error: 'JSON inválido', raw: text.substring(0, 200) };
                }

                if (!response.ok) {
                    throw new Error(data.error || data.message || 'HTTP ' + status);
                }

                return data;
            });
        })
        .catch(function(erro) {
            Logger.log('error', method + ' ' + endpoint + ' falhou', { 
                mensagem: erro.message 
            });
            throw erro;
        });
}

const userApi = {
    getAll: function() { return apiRequest('/users'); },
    getById: function(id) { return apiRequest('/users/' + id); },
    create: function(data) { return apiRequest('/users', 'POST', data); },
    update: function(id, data) { return apiRequest('/users/' + id, 'PUT', data); },
    delete: function(id) { return apiRequest('/users/' + id, 'DELETE'); }
};

const Utils = {
    escapeHtml: function(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    },

    mostrarAlerta: function(tipo, mensagem, duracao) {
        duracao = duracao || 5000;
        const container = document.getElementById('alert-container');

        if (!container) {
            alert(mensagem);
            return;
        }

        const div = document.createElement('div');
        div.className = 'alert alert-' + tipo;

        const icon = tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️';
        div.innerHTML = '<span>' + icon + '</span><span>' + this.escapeHtml(mensagem) + '</span>';

        container.appendChild(div);

        setTimeout(function() {
            if (div.parentNode) div.parentNode.removeChild(div);
        }, duracao);
    },

    setLoading: function(elemento, carregando) {
        if (elemento) {
            elemento.style.display = carregando ? 'inline-flex' : 'none';
        }
    }
};

window.API = {
    config: CONFIG,
    logger: Logger,
    users: userApi,
    utils: Utils,
    request: apiRequest
};

console.log('API.js carregado. URL:', CONFIG.API_BASE_URL);