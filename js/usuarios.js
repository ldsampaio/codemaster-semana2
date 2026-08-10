import { userApi } from './api.js';

// Estado
let usuarios = [];
let editandoId = null;

// Elementos DOM
const form = document.getElementById('usuario-form');
const lista = document.getElementById('usuarios-lista');
const btnCancelar = document.getElementById('btn-cancelar');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarUsuarios();
    form.addEventListener('submit', salvarUsuario);
    btnCancelar.addEventListener('click', resetarFormulario);
});

// Carregar lista
async function carregarUsuarios() {
    try {
        lista.innerHTML = '<p>Carregando...</p>';
        const data = await userApi.getAll();
        usuarios = data.users || [];
        renderizarUsuarios();
    } catch (erro) {
        lista.innerHTML = `<p class="erro">Erro: ${erro.message}</p>`;
        console.error('Erro ao carregar:', erro);
    }
}

// Renderizar lista
function renderizarUsuarios() {
    if (usuarios.length === 0) {
        lista.innerHTML = '<p>Nenhum usuário cadastrado.</p>';
        return;
    }

    lista.innerHTML = usuarios.map(u => `
        <div class="usuario-card" data-id="${u.user_id}">
            <h3>${u.nome}</h3>
            <p>${u.email}</p>
            <p>Idade: ${u.idade || 'N/A'}</p>
            <button onclick="editarUsuario('${u.user_id}')">Editar</button>
            <button onclick="deletarUsuario('${u.user_id}')" class="btn-danger">Deletar</button>
        </div>
    `).join('');
}

// Salvar (criar ou atualizar)
async function salvarUsuario(evento) {
    evento.preventDefault();

    const dados = {
        user_id: editandoId || `u${Date.now()}`, // ID único se novo
        nome: document.getElementById('user-nome').value,
        email: document.getElementById('user-email').value,
        idade: parseInt(document.getElementById('user-idade').value) || null,
    };

    try {
        if (editandoId) {
            await userApi.update(editandoId, dados);
            alert('Usuário atualizado!');
        } else {
            await userApi.create(dados);
            alert('Usuário criado!');
        }

        resetarFormulario();
        carregarUsuarios();
    } catch (erro) {
        alert(`Erro ao salvar: ${erro.message}`);
    }
}

// Editar
window.editarUsuario = async (id) => {
    const usuario = usuarios.find(u => u.user_id === id);
    if (!usuario) return;

    document.getElementById('user-id').value = usuario.user_id;
    document.getElementById('user-nome').value = usuario.nome;
    document.getElementById('user-email').value = usuario.email;
    document.getElementById('user-idade').value = usuario.idade || '';

    editandoId = id;
    form.querySelector('button[type="submit"]').textContent = 'Atualizar';
};

// Deletar
window.deletarUsuario = async (id) => {
    if (!confirm('Tem certeza que deseja deletar?')) return;

    try {
        await userApi.delete(id);
        alert('Usuário deletado!');
        carregarUsuarios();
    } catch (erro) {
        alert(`Erro ao deletar: ${erro.message}`);
    }
};

// Resetar formulário
function resetarFormulario() {
    form.reset();
    editandoId = null;
    document.getElementById('user-id').value = '';
    form.querySelector('button[type="submit"]').textContent = 'Salvar';
}