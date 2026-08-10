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

    if (!dom.form || !dom.lista) {
        console.error('Elementos do DOM não encontrados');
        return;
    }

    // ============================================
    // HELPERS DE FORMATAÇÃO
    // ============================================

    function formatarIdade(idade) {
        if (idade === null || idade === undefined) return null;
        const num = parseInt(idade);
        return isNaN(num) ? null : num;
    }

    function formatarValor(valor) {
        if (valor === null || valor === undefined) return 'N/A';
        const num = parseFloat(valor);
        return isNaN(num) ? 'N/A' : 'R$ ' + num.toFixed(2);
    }

    function formatarEndereco(endereco) {
        if (!endereco || typeof endereco !== 'object') return null;
        const partes = [];
        if (endereco.rua) partes.push(endereco.rua);
        if (endereco.cidade) partes.push(endereco.cidade);
        if (endereco.estado) partes.push(endereco.estado);
        if (endereco.cep) partes.push('CEP: ' + endereco.cep);
        return partes.length > 0 ? partes.join(' - ') : null;
    }

    function formatarPedidos(pedidos) {
        if (!Array.isArray(pedidos) || pedidos.length === 0) return null;
        return pedidos.length + ' pedido(s)';
    }

    function formatarInteresses(interesses) {
        if (!Array.isArray(interesses) || interesses.length === 0) return null;
        return interesses.join(', ');
    }

    // ============================================
    // RENDERIZAÇÃO
    // ============================================

    function renderizarLista() {
        utils.setLoading(dom.listStatus, false);

        const count = state.usuarios ? state.usuarios.length : 0;
        if (dom.userCount) {
            dom.userCount.textContent = '(' + count + ' usuário' + (count !== 1 ? 's' : '') + ')';
        }

        if (!state.usuarios || state.usuarios.length === 0) {
            dom.lista.innerHTML = 
                '<div class="empty-state">' +
                    '<div class="empty-state-icon">👤</div>' +
                    '<p>Nenhum usuário cadastrado.</p>' +
                '</div>';
            return;
        }

        const html = state.usuarios.map(function(u, index) {
            // Extrair campos com múltiplos fallbacks
            const userId = u.user_id || u.id || ('item_' + index);
            const nome = u.nome || u.name || 'Sem nome';
            const email = u.email || u.Email || '';
            const idade = formatarIdade(u.idade);
            const ativo = u.ativo === true || u.ativo === 'true';

            // Campos opcionais formatados
            const enderecoStr = formatarEndereco(u.endereco);
            const pedidosStr = formatarPedidos(u.pedidos);
            const interessesStr = formatarInteresses(u.interesses);

            // Badge de status
            const statusBadge = ativo ? 
                '<span class="badge-ativo">● Ativo</span>' : 
                (u.ativo === false ? '<span class="badge-inativo">○ Inativo</span>' : '');

            // Metadados visíveis
            const metaItems = [];
            if (idade) metaItems.push('🎂 ' + idade + ' anos');
            if (enderecoStr) metaItems.push('📍 ' + enderecoStr);
            if (pedidosStr) metaItems.push('🛒 ' + pedidosStr);
            if (interessesStr) metaItems.push('❤️ ' + interessesStr);

            const metaHtml = metaItems.map(function(item) {
                return '<span class="meta-tag">' + item + '</span>';
            }).join('');

            return 
                '<div class="user-card" data-id="' + utils.escapeHtml(String(userId)) + '">' +
                    '<div class="user-info">' +
                        '<div class="user-header">' +
                            '<h3>' + utils.escapeHtml(nome) + '</h3>' +
                            statusBadge +
                        '</div>' +
                        '<p class="user-email">' + utils.escapeHtml(email) + '</p>' +
                        '<div class="user-meta">' + metaHtml + '</div>' +
                        '<p class="user-id">🆔 ' + utils.escapeHtml(String(userId)) + '</p>' +
                    '</div>' +
                    '<div class="user-actions">' +
                        '<button class="btn btn-success btn-sm btn-editar" data-id="' + 
                            utils.escapeHtml(String(userId)) + '">✏️ Editar</button>' +
                        '<button class="btn btn-danger btn-sm btn-deletar" data-id="' + 
                            utils.escapeHtml(String(userId)) + '">🗑️ Deletar</button>' +
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
    }

    // ============================================
    // OPERAÇÕES CRUD
    // ============================================

    function carregarUsuarios() {
        utils.setLoading(dom.listStatus, true);

        userApi.getAll()
            .then(function(data) {
                console.log('Dados recebidos:', data);

                // Extrair array de usuários
                let users = [];
                if (data && Array.isArray(data.users)) {
                    users = data.users;
                } else if (Array.isArray(data)) {
                    users = data;
                }

                state.usuarios = users;
                logger.log('info', 'Usuários carregados', { count: users.length });
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
            idade: dom.idade.value ? parseInt(dom.idade.value) : null,
            ativo: true
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

        renderizarLista();
        dom.nome.focus();
    }

    function deletarUsuario(id) {
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

        renderizarLista();
    }

    // ============================================
    // INICIALIZAÇÃO
    // ============================================

    dom.form.addEventListener('submit', salvarUsuario);
    dom.btnCancelar.addEventListener('click', resetarFormulario);

    carregarUsuarios();
});