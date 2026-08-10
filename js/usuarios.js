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
        carregando: false
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

    // DEBUG: Verificar elementos DOM
    console.log('DOM elements:', {
        form: !!dom.form,
        lista: !!dom.lista,
        listaId: dom.lista ? dom.lista.id : 'null',
        listaParent: dom.lista ? dom.lista.parentNode.tagName : 'null'
    });

    if (!dom.form || !dom.lista) {
        console.error('Elementos do DOM não encontrados');
        return;
    }

    // ============================================
    // RENDERIZAÇÃO SIMPLIFICADA
    // ============================================

    function renderizarLista() {
        console.log('renderizarLista chamada, usuarios:', state.usuarios);

        utils.setLoading(dom.listStatus, false);

        const count = state.usuarios ? state.usuarios.length : 0;
        console.log('Count:', count);

        if (dom.userCount) {
            dom.userCount.textContent = '(' + count + ' usuário' + (count !== 1 ? 's' : '') + ')';
        }

        if (!state.usuarios || state.usuarios.length === 0) {
            console.log('Nenhum usuário, mostrando empty state');
            dom.lista.innerHTML = 
                '<div class="empty-state">' +
                    '<div class="empty-state-icon">👤</div>' +
                    '<p>Nenhum usuário cadastrado.</p>' +
                '</div>';
            return;
        }

        // Tentar renderizar cada usuário
        let html = '';

        try {
            state.usuarios.forEach(function(u, index) {
                console.log('Renderizando usuário', index, ':', u);

                // Extrair campos com fallbacks seguros
                const userId = u.user_id || u.id || ('item_' + index);
                const nome = u.nome || 'Sem nome';
                const email = u.email || '';

                // Construir card simples
                const card = 
                    '<div class="user-card" data-id="' + utils.escapeHtml(String(userId)) + '">' +
                        '<div class="user-info">' +
                            '<h3>' + utils.escapeHtml(String(nome)) + '</h3>' +
                            '<p>' + utils.escapeHtml(String(email)) + '</p>' +
                            '<p style="font-size:0.75rem;color:#9ca3af;">ID: ' + utils.escapeHtml(String(userId)) + '</p>' +
                        '</div>' +
                        '<div class="user-actions">' +
                            '<button class="btn btn-success btn-sm btn-editar" data-id="' + 
                                utils.escapeHtml(String(userId)) + '">✏️ Editar</button>' +
                            '<button class="btn btn-danger btn-sm btn-deletar" data-id="' + 
                                utils.escapeHtml(String(userId)) + '">🗑️ Deletar</button>' +
                        '</div>' +
                    '</div>';

                html += card;
            });

            console.log('HTML gerado, length:', html.length);
            console.log('Primeiros 200 chars:', html.substring(0, 200));

        } catch (erro) {
            console.error('Erro ao gerar HTML:', erro);
            html = '<div class="alert alert-error">Erro ao renderizar: ' + utils.escapeHtml(erro.message) + '</div>';
        }

        // Inserir no DOM
        console.log('Inserindo HTML no DOM...');
        dom.lista.innerHTML = html;
        console.log('HTML inserido. innerHTML length:', dom.lista.innerHTML.length);

        // Verificar se foi inserido
        if (dom.lista.children.length === 0) {
            console.error('Nenhum filho inserido! HTML:', html);
        } else {
            console.log('Filhos inseridos:', dom.lista.children.length);
        }

        // Bind de eventos
        const btnEditar = dom.lista.querySelectorAll('.btn-editar');
        const btnDeletar = dom.lista.querySelectorAll('.btn-deletar');

        console.log('Botoes encontrados - Editar:', btnEditar.length, 'Deletar:', btnDeletar.length);

        btnEditar.forEach(function(btn) {
            btn.addEventListener('click', function() {
                iniciarEdicao(btn.dataset.id);
            });
        });

        btnDeletar.forEach(function(btn) {
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
                console.log('Dados recebidos (raw):', data);

                // Extrair array de usuários
                let users = [];
                if (data && Array.isArray(data.users)) {
                    users = data.users;
                } else if (Array.isArray(data)) {
                    users = data;
                }

                console.log('Array extraído:', users);
                state.usuarios = users;

                logger.log('info', 'Usuários carregados', { count: users.length });

                // Chamar renderização
                renderizarLista();
            })
            .catch(function(erro) {
                console.error('Erro:', erro);
                utils.mostrarAlerta('error', 'Erro ao carregar: ' + erro.message);
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
            idade: dom.idade.value ? parseInt(dom.idade.value) : null
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
                utils.mostrarAlerta('success', state.editandoId ? 'Atualizado!' : 'Criado!');
                resetarFormulario();
                carregarUsuarios();
            })
            .catch(function(erro) {
                utils.mostrarAlerta('error', 'Erro: ' + erro.message);
            })
            .finally(function() {
                state.carregando = false;
                dom.btnSubmit.disabled = false;
                utils.setLoading(dom.formStatus, false);
            });
    }

    function iniciarEdicao(id) {
        console.log('Iniciar edição:', id);

        const usuario = state.usuarios.find(function(u) {
            return (u.user_id || u.id) === id;
        });

        if (!usuario) {
            utils.mostrarAlerta('error', 'Usuário não encontrado');
            return;
        }

        state.editandoId = id;

        dom.userId.value = usuario.user_id || usuario.id || id;
        dom.nome.value = usuario.nome || '';
        dom.email.value = usuario.email || '';
        dom.idade.value = usuario.idade || '';

        dom.formIcon.textContent = '✏️';
        dom.formTitle.textContent = 'Editar Usuário';
        dom.btnSubmit.textContent = '💾 Atualizar';
        dom.btnCancelar.style.display = 'inline-flex';

        dom.nome.focus();
    }

    function deletarUsuario(id) {
        console.log('Deletar:', id);

        const usuario = state.usuarios.find(function(u) {
            return (u.user_id || u.id) === id;
        });

        if (!usuario) return;

        const nome = usuario.nome || 'este usuário';

        if (!confirm('Deletar "' + nome + '"?')) return;

        userApi.delete(id)
            .then(function() {
                utils.mostrarAlerta('success', 'Deletado!');
                carregarUsuarios();
            })
            .catch(function(erro) {
                utils.mostrarAlerta('error', 'Erro: ' + erro.message);
            });
    }

    function resetarFormulario() {
        dom.form.reset();
        state.editandoId = null;

        dom.formIcon.textContent = '➕';
        dom.formTitle.textContent = 'Novo Usuário';
        dom.btnSubmit.textContent = '💾 Salvar';
        dom.btnCancelar.style.display = 'none';
    }

    // ============================================
    // INICIALIZAÇÃO
    // ============================================

    dom.form.addEventListener('submit', salvarUsuario);
    dom.btnCancelar.addEventListener('click', resetarFormulario);

    console.log('Iniciando carregamento...');
    carregarUsuarios();
});