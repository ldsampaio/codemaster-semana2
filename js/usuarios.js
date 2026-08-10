/**
 * Módulo de Usuários - Controller da interface
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    if (!window.API) {
        console.error('Módulo API não carregado');
        alert('Erro: Módulo API não carregado');
        return;
    }

    const API = window.API;
    const userApi = API.users;
    const utils = API.utils;
    const logger = API.logger;
    const config = API.config;

    console.log('Inicializando usuarios.js. API URL:', config.API_BASE_URL);

    const state = {
        usuarios: [],
        editandoId: null,
        carregando: false,
        respostaBruta: null
    };

    const dom = {
        form: document.getElementById('usuario-form'),
        formIcon: document.getElementById('form-icon'),
        formTitle: document.getElementById('form-title'),
        formStatus: document.getElementById('form-status'),
        btnSubmit: document.getElementById('btn-submit'),
        btnCancelar: document.getElementById('btn-cancelar'),
        listStatus: document.getElementById('list-status'),
        userCount: document.getElementById('user-count'),
        lista: document.getElementById('usuarios-lista'),
        userId: document.getElementById('user-id'),
        nome: document.getElementById('user-nome'),
        email: document.getElementById('user-email'),
        idade: document.getElementById('user-idade')
    };

    if (!dom.form || !dom.lista) {
        console.error('Elementos do DOM não encontrados');
        return;
    }

    // ============================================
    // RENDERIZAÇÃO FLEXÍVEL
    // ============================================

    function renderizarLista() {
        utils.setLoading(dom.listStatus, false);

        const count = state.usuarios ? state.usuarios.length : 0;
        if (dom.userCount) {
            dom.userCount.textContent = '(' + count + ' usuário' + (count !== 1 ? 's' : '') + ')';
        }

        // Se não houver usuários
        if (!state.usuarios || state.usuarios.length === 0) {
            dom.lista.innerHTML = 
                '<div class="empty-state">' +
                    '<div class="empty-state-icon">👤</div>' +
                    '<p>Nenhum usuário cadastrado.</p>' +
                    '<p style="font-size: 0.875rem;">Crie seu primeiro usuário acima! 🚀</p>' +
                '</div>';
            return;
        }

        // Tentar renderizar como cards, se falhar mostrar JSON
        try {
            const html = state.usuarios.map(function(u, index) {
                // Verificar se u é um objeto válido
                if (!u || typeof u !== 'object') {
                    return '<div class="user-card">Item inválido: ' + utils.escapeHtml(String(u)) + '</div>';
                }

                const isEditing = state.editandoId === u.user_id ? 'editing' : '';
                const disabled = state.editandoId ? 'disabled' : '';

                // Extrair campos com fallback seguro
                const userId = u.user_id || u.id || ('item_' + index);
                const nome = u.nome || u.name || u.Nome || 'Sem nome';
                const email = u.email || u.Email || u.mail || 'Sem email';
                const idade = u.idade || u.age || u.Idade;

                const idadeStr = idade ? '🎂 ' + idade + ' anos' : '';
                const idCurto = String(userId).substring(0, 12) + (String(userId).length > 12 ? '...' : '');

                return 
                    '<div class="user-card ' + isEditing + '" data-id="' + utils.escapeHtml(String(userId)) + '">' +
                        '<div class="user-info">' +
                            '<h3>' + utils.escapeHtml(String(nome)) + '</h3>' +
                            '<p>' + utils.escapeHtml(String(email)) + '</p>' +
                            '<div class="user-meta">' +
                                (idadeStr ? '<span>' + idadeStr + '</span>' : '') +
                                '<span>🆔 ' + utils.escapeHtml(idCurto) + '</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="user-actions">' +
                            '<button class="btn btn-success btn-sm btn-editar" data-id="' + 
                                utils.escapeHtml(String(userId)) + '" ' + disabled + '>✏️ Editar</button>' +
                            '<button class="btn btn-danger btn-sm btn-deletar" data-id="' + 
                                utils.escapeHtml(String(userId)) + '" ' + disabled + '>🗑️ Deletar</button>' +
                        '</div>' +
                    '</div>';
            }).join('');

            dom.lista.innerHTML = html;

            // Bind de eventos
            dom.lista.querySelectorAll('.btn-editar').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    iniciarEdicao(btn.dataset.id);
                });
            });

            dom.lista.querySelectorAll('.btn-deletar').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    deletarUsuario(btn.dataset.id);
                });
            });

        } catch (erro) {
            console.error('Erro ao renderizar:', erro);
            // Fallback: mostrar JSON
            mostrarComoJSON();
        }
    }

    function mostrarComoJSON() {
        let html = '<div style="background:#f5f5f5;padding:1rem;border-radius:8px;">';
        html += '<h3 style="margin-bottom:0.5rem;">Dados recebidos (modo debug):</h3>';
        html += '<pre style="background:#1e293b;color:#e5e7eb;padding:1rem;border-radius:4px;overflow:auto;max-height:400px;font-size:0.75rem;">';
        html += utils.escapeHtml(JSON.stringify(state.usuarios, null, 2));
        html += '</pre>';

        if (state.respostaBruta) {
            html += '<h4 style="margin-top:1rem;margin-bottom:0.5rem;">Resposta bruta da API:</h4>';
            html += '<pre style="background:#451a03;color:#fed7aa;padding:1rem;border-radius:4px;overflow:auto;max-height:200px;font-size:0.75rem;">';
            html += utils.escapeHtml(JSON.stringify(state.respostaBruta, null, 2));
            html += '</pre>';
        }

        html += '</div>';
        dom.lista.innerHTML = html;
    }

    // ============================================
    // OPERAÇÕES CRUD
    // ============================================

    function carregarUsuarios() {
        utils.setLoading(dom.listStatus, true);

        userApi.getAll()
            .then(function(data) {
                console.log('Dados recebidos:', data);
                state.respostaBruta = data;

                // Tentar extrair array de usuários de várias formas possíveis
                let users = null;

                if (Array.isArray(data)) {
                    users = data;
                } else if (data && Array.isArray(data.users)) {
                    users = data.users;
                } else if (data && Array.isArray(data.Users)) {
                    users = data.Users;
                } else if (data && Array.isArray(data.items)) {
                    users = data.items;
                } else if (data && Array.isArray(data.Items)) {
                    users = data.Items;
                } else if (data && typeof data === 'object') {
                    // Tentar encontrar qualquer array no objeto
                    for (var key in data) {
                        if (Array.isArray(data[key])) {
                            users = data[key];
                            console.log('Array encontrado na chave:', key);
                            break;
                        }
                    }
                }

                if (!users) {
                    console.warn('Não foi possível extrair array de usuários. Estrutura:', data);
                    users = [];
                }

                state.usuarios = users;
                logger.log('info', 'Usuários carregados', { 
                    count: users.length,
                    estrutura: Object.keys(data || {})
                });

                renderizarLista();
            })
            .catch(function(erro) {
                console.error('Erro ao carregar:', erro);
                utils.mostrarAlerta('error', 'Erro ao carregar: ' + erro.message);
                dom.lista.innerHTML = 
                    '<div class="empty-state">' +
                        '<div class="empty-state-icon">❌</div>' +
                        '<p>Erro ao carregar usuários.</p>' +
                        '<p style="font-size: 0.875rem;">' + utils.escapeHtml(erro.message) + '</p>' +
                    '</div>';
            });
    }

    function salvarUsuario(evento) {
        evento.preventDefault();

        if (state.carregando) return;
        state.carregando = true;

        dom.btnSubmit.disabled = true;
        utils.setLoading(dom.formStatus, true);

        const dados = {
            user_id: state.editandoId || ('u' + Date.now()),
            nome: dom.nome.value.trim(),
            email: dom.email.value.trim(),
            idade: parseInt(dom.idade.value) || null
        };

        if (!dados.nome || !dados.email) {
            utils.mostrarAlerta('error', 'Nome e e-mail são obrigatórios');
            state.carregando = false;
            dom.btnSubmit.disabled = false;
            utils.setLoading(dom.formStatus, false);
            return;
        }

        const operacao = state.editandoId ? 
            userApi.update(state.editandoId, dados) : 
            userApi.create(dados);

        operacao
            .then(function(resposta) {
                const msg = state.editandoId ? 
                    '✅ Usuário atualizado!' : 
                    '✅ Usuário criado!';
                utils.mostrarAlerta('success', msg);
                resetarFormulario();
                carregarUsuarios();
            })
            .catch(function(erro) {
                utils.mostrarAlerta('error', '❌ Erro ao salvar: ' + erro.message);
            })
            .finally(function() {
                state.carregando = false;
                dom.btnSubmit.disabled = false;
                utils.setLoading(dom.formStatus, false);
            });
    }

    function iniciarEdicao(id) {
        const usuario = state.usuarios.find(function(u) {
            return (u.user_id || u.id) === id;
        });

        if (!usuario) {
            utils.mostrarAlerta('error', 'Usuário não encontrado: ' + id);
            return;
        }

        state.editandoId = id;

        dom.userId.value = usuario.user_id || usuario.id || id;
        dom.nome.value = usuario.nome || usuario.name || '';
        dom.email.value = usuario.email || usuario.Email || '';
        dom.idade.value = usuario.idade || usuario.age || '';

        dom.formIcon.textContent = '✏️';
        dom.formTitle.textContent = 'Editar Usuário';
        dom.btnSubmit.textContent = '💾 Atualizar';
        dom.btnCancelar.style.display = 'inline-flex';

        renderizarLista();
        dom.nome.focus();

        logger.log('info', 'Iniciada edição', { user_id: id });
    }

    function deletarUsuario(id) {
        const usuario = state.usuarios.find(function(u) {
            return (u.user_id || u.id) === id;
        });

        if (!usuario) {
            utils.mostrarAlerta('error', 'Usuário não encontrado');
            return;
        }

        const nome = usuario.nome || usuario.name || 'este usuário';

        if (!confirm('Deletar "' + nome + '"?')) {
            return;
        }

        userApi.delete(id)
            .then(function() {
                utils.mostrarAlerta('success', '🗑️ Deletado!');
                carregarUsuarios();
            })
            .catch(function(erro) {
                utils.mostrarAlerta('error', '❌ Erro ao deletar: ' + erro.message);
            });
    }

    function resetarFormulario() {
        dom.form.reset();
        state.editandoId = null;

        dom.formIcon.textContent = '➕';
        dom.formTitle.textContent = 'Novo Usuário';
        dom.btnSubmit.textContent = '💾 Salvar';
        dom.btnCancelar.style.display = 'none';

        renderizarLista();
    }

    // ============================================
    // INICIALIZAÇÃO
    // ============================================

    dom.form.addEventListener('submit', salvarUsuario);
    dom.btnCancelar.addEventListener('click', resetarFormulario);

    logger.log('info', 'Aplicação iniciada', { 
        apiUrl: config.API_BASE_URL
    });

    carregarUsuarios();

    window.UsuariosModule = {
        state: state,
        recarregar: carregarUsuarios,
        resetar: resetarFormulario,
        mostrarJSON: mostrarComoJSON
    };
});