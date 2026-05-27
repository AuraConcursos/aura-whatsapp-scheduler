async function carregarGrupos() {
  const resposta = await fetch('/grupos');
  const grupos = await resposta.json();

  const select = document.getElementById('grupo');
  select.innerHTML = '';

  grupos.forEach(grupo => {
    const option = document.createElement('option');
    option.value = grupo;
    option.textContent = grupo;
    select.appendChild(option);
  });
}

async function carregarAgendamentos() {
  const resposta = await fetch('/agendamentos');
  const agendamentos = await resposta.json();

  const lista = document.getElementById('listaAgendamentos');
  lista.innerHTML = '';

  if (agendamentos.length === 0) {
    lista.innerHTML = '<p>Nenhum agendamento ativo.</p>';
    return;
  }

  agendamentos.forEach(item => {
    const div = document.createElement('div');
    div.className = 'agendamento';

    div.innerHTML = `
      <strong>${item.grupo}</strong>
      <p>${item.mensagem}</p>
      <p>Horário: ${String(item.hora).padStart(2, '0')}:${String(item.minuto).padStart(2, '0')}</p>
      <p>Tipo: ${item.tipo === 'diario' ? 'Todos os dias' : 'Semanal'}</p>
      <button class="delete" onclick="excluirAgendamento('${item.id}')">Cancelar</button>
    `;

    lista.appendChild(div);
  });
}

async function criarAgendamento() {
  const grupo = document.getElementById('grupo').value;
  const mensagem = document.getElementById('mensagem').value;
  const hora = document.getElementById('hora').value;
  const minuto = document.getElementById('minuto').value;
  const tipo = document.getElementById('tipo').value;
  const diaSemana = document.getElementById('diaSemana').value;
  const imagem = document.getElementById('imagem').files[0];

  const formData = new FormData();

  formData.append('grupo', grupo);
  formData.append('mensagem', mensagem);
  formData.append('hora', hora);
  formData.append('minuto', minuto);
  formData.append('tipo', tipo);

  if (tipo === 'semanal') {
    formData.append('diaSemana', diaSemana);
  }

  if (imagem) {
    formData.append('imagem', imagem);
  }

  const resposta = await fetch('/agendar', {
    method: 'POST',
    body: formData
  });

  const resultado = await resposta.json();

  if (resultado.sucesso) {
    alert('Agendamento criado com sucesso!');
    document.getElementById('mensagem').value = '';
    document.getElementById('imagem').value = '';
    carregarAgendamentos();
  } else {
    alert(resultado.erro || 'Erro ao criar agendamento');
  }
}
async function excluirAgendamento(id) {
  await fetch(`/agendamento/${id}`, {
    method: 'DELETE'
  });

  carregarAgendamentos();
}

document.getElementById('tipo').addEventListener('change', () => {
  const tipo = document.getElementById('tipo').value;
  document.getElementById('boxDiaSemana').style.display =
    tipo === 'semanal' ? 'block' : 'none';
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('boxDiaSemana').style.display = 'none';
  carregarGrupos();
  carregarAgendamentos();
});