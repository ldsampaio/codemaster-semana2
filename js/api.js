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

    log(tipo, mensagem, dados = null) {
        const entry = {
            timestamp: new Date().toISOString(),
            tipo,
            mensagem,
            dados
        };
        this.logs.unshift(entry);
        if (this.logs.length > 50) this.logs.pop();
        this.atualizarDebug();
    },

    atualizarDebug() {
        const el = document.getElementById('debug-logs');
        if (!el) return;

        el.textContent = this.logs.map(l => 
            `[${l.timestamp}] ${l.tipo.toUpperCase()}: ${l.mensagem}` +
            (l.dados ? '\n' + JSON.stringify(l.dados, null, 2) : '')
        ).join('\n---\n');
    },

    getLogs() {
        return [...this.logs];
    }
};

// ============================================
// HTTP CLIENT
// ============================================

async function apiRequest(endpoint, method = 'GET', body = null) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    Logger.log('request', `${method} ${endpoint}`, { url, body });

    try {
        const response = await fetch(url, options);
        const data = await response.json().catch(() => ({ 
            error: 'Resposta não-JSON',
            raw: await response.text().catch(() => null)
        }));

        Logger.log('response', `${method} ${endpoint} → ${response.status}`, { 
            status: response.status, 
            data 
        });

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        return data;
    } catch (erro) {
        Logger.log('error', `${method} ${endpoint} falhou`, { 
            mensagem: erro.message 
        });
        throw erro;
    }
}

// ============================================
// API EXPOSITA
// ============================================

const userApi = {
    getAll: () => apiRequest('/users'),
    getById: (id) => apiRequest(`/users/${id}`),
    create: (data) => apiRequest('/users', 'POST', data),
    update: (id, data) => apiRequest(`/users/${id}`, 'PUT', data),
    delete: (id) => apiRequest(`/users/${id}`, 'DELETE'),
};

// ============================================
// UTILITÁRIOS
// ============================================

const Utils = {
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    mostrarAlerta(tipo, mensagem, duracao = 5000) {
        const container = document.getElementById('alert-container');
        if (!container) {
            console.error('Container de alertas não encontrado');
            alert(mensagem); // fallback
            return;
        }

        const div = document.createElement('div');
        div.className = `alert alert-${tipo}`;
        div.innerHTML = `
            <span>${tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️'}</span>
            <span>${this.escapeHtml(mensagem)}</span>
        `;

        container.appendChild(div);

        if (duracao > 0) {
            setTimeout(() => div.remove(), duracao);
        }

        return div;
    },

    setLoading(elemento, carregando) {
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