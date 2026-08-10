// Configuração da API
const API_BASE_URL = 'https://g9msum3sd3.execute-api.us-east-1.amazonaws.com/dev';

// Helper para requisições
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// API de usuários
export const userApi = {
    getAll: () => apiRequest('/users'),
    getById: (id) => apiRequest(`/users/${id}`),
    create: (data) => apiRequest('/users', 'POST', data),
    update: (id, data) => apiRequest(`/users/${id}`, 'PUT', data),
    delete: (id) => apiRequest(`/users/${id}`, 'DELETE'),
};