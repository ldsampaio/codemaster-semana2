/**
 * Módulo de Usuários - Controller da interface
 */

// Aguardar carregamento do DOM
document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // Verificar dependência
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

    // ============================================
    // ESTADO
    // ============================================

    const state = {
        usuarios: [],
        editandoId: null,
        carregando: false
    };

    // ============================================
    // DOM REFERENCES
    // ============================================

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
    // RENDERIZAÇÃO
    // ============================================

    function renderizarLista() {
        utils.setLoading(dom.listStatus, false);

        if (dom.userCount) {
            dom.userCount.textContent = '(' + state.usuarios.length + ' usuário' + 
                (state.usuarios.length !== 1 ? 's' : '') + ')';
        }

        if (state.usuarios.length === 0) {
            dom.lista.innerHTML = 
                '<div class="empty-state">' +
                    '<div class="empty-state-icon">👤</div>' +
                    '<p>Nenhum usuário cadastrado.</p>' +
                    '<p style="font-size: 0.875rem;">Crie seu primeiro usuário acima! 🚀</p>' +
                '</div>';
            return;
        }

        dom.lista.innerHTML = state.usuarios.map(function(u) {
            const isEditing = state.editandoId === u.user_id ? 'editing' : '';
            const disabled = state.editandoId ? 'disabled' : '';
            const idade = u.idade ? '🎂 ' + u.idade + ' anos' : '';
            const idCurto = String(u.user_id).substring(0, 8) + '...';

            return 
                '<div class="user-card ' + isEditing + '" data-id="' + utils.escapeHtml(u.user_id) + '">' +
                    '<div class="user-info">' +
                        '<h3>' + utils.escapeHtml(u.nome) + '</h3>' +
                        '<p>' + utils.escapeHtml(u.email) + '</p>' +
                        '<div class="user-meta">' +
                            (u.idade ? '<span>' + idade + '</span>' : '') +
                            '<span>🆔 ' + idCurto + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="user-actions">' +
                        '<button class="btn btn-success btn-sm btn-editar" data-id="' + 
                            utils.escapeHtml(u.user_id) + '" ' + disabled + '>✏️ Editar</button>' +
                        '<button class="btn btn-danger btn-sm btn-deletar" data-id="' + 
                            utils.escapeHtml(u.user_id) + '" ' + disabled + '>🗑️ Deletar</button>' +
                    '</div>' +
                '</div>';
        }).join('');

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
    }

    // ============================================
    // OPERAÇÕES CRUD
    // ============================================

    function carregarUsuarios() {
        utils.setLoading(dom.listStatus, true);

        userApi.getAll()
            .then(function(data) {
                state.usuarios = data.users || [];
                renderizarLista();
                logger.log('info', 'Usuários carregados', { count: state.usuarios.length });
            })
            .catch(function(erro) {
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
            .then(function() {
                const msg = state.editandoId ? 
                    '✅ Usuário atualizado com sucesso!' : 
                    '✅ Usuário criado com sucesso!';
                utils.mostrarAlerta('success', msg);
                resetarFormulario();
                return carregarUsuarios();
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
            return u.user_id === id;
        });

        if (!usuario) {
            utils.mostrarAlerta('error', 'Usuário não encontrado');
            return;
        }

        state.editandoId = id;

        dom.userId.value = usuario.user_id;
        dom.nome.value = usuario.nome;
        dom.email.value = usuario.email;
        dom.idade.value = usuario.idade || '';

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
            return u.user_id === id;
        });

        if (!usuario) return;

        if (!confirm('Tem certeza que deseja deletar "' + usuario.nome + '"?')) {
            return;
        }

        userApi.delete(id)
            .then(function() {
                utils.mostrarAlerta('success', '🗑️ Usuário deletado com sucesso!');
                return carregarUsuarios();
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
    // EVENT LISTENERS
    // ============================================

    dom.form.addEventListener('submit', salvarUsuario);
    dom.btnCancelar.addEventListener('click', resetarFormulario);

    // ============================================
    // INICIALIZAÇÃO
    // ============================================

    logger.log('info', 'Aplicação iniciada', { 
        apiUrl: config.API_BASE_URL,
        timestamp: new Date().toISOString()
    });

    carregarUsuarios();

    // Expor para debug
    window.UsuariosModule = {
        state: state,
        recarregar: carregarUsuarios,
        resetar: resetarFormulario
    };
});