let entregasCarregados = [];
let idParaExcluirEntrega = null;


const escaparHtml = (texto) => String(texto)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');


const carregarEntregas = async () => {
  entregasCarregados = await window.api.listarEntregas();

  const linhas = entregasCarregados.map(
      (entrega) => `
      <tr>
      <td>${escaparHtml(entrega.destinatario)}</td>
      <td>${escaparHtml(entrega.produto)}</td>
      <td>${entrega.quantidade}</td>
      <td>${escaparHtml(entrega.cep)}</td>
      <td>${escaparHtml(entrega.endereco)}</td>
      <td>${new Date(entrega.data_entrega).toLocaleDateString('pt-BR')}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editarEntrega(${entrega.id})">
          Editar
        </button>
        <button class="btn btn-sm btn-danger" onclick="abrirConfirmacaoExclusaoEntrega(${entrega.id})">
          Excluir
        </button>
        </td>
    </tr>`,
    )
    .join("");

  document.querySelector("#tbodyEntregas").innerHTML = linhas;
};

/////////// EXPORTAR E IMPORTAR /////////////////////

const exportarRelatorio = () => {
  const linhas = entregasCarregados.map(
    (entrega) => `${entrega.destinatario} - ${formatarData(entrega.data_entrega)}`
  );

  window.api.salvarArquivoTexto(linhas.join('\n'));
};

const exportarBackup = () => {
  const dados = entregasCarregados.map((entrega) => ({
    ...entrega,
    data_entrega: new Date(entrega.data_entrega).toISOString().slice(0, 10),
  }));

  window.api.exportarBackupJson(dados);
};

const importarBackup = async () => {
  const entregasImportados = await window.api.importarBackupJson();
  if (!entregasImportados) return; // usuario cancelou

  for (const entrega of entregasImportados) {
    await window.api.criarEntrega(entrega);
  }

  carregarEntregas(); // mesma funcao de sempre, mostra os importados
};

/////////////////////////////////////////////////////////////////////////

const editarEntrega = (id) => {
  const entrega = entregasCarregados.find((e) => e.id === id);
  window.api.editarEntrega(entrega);
};

const abrirConfirmacaoExclusaoEntrega = (id) => {
  const entrega = entregasCarregados.find((item) => item.id === id);

  document.querySelector("#nomeEntregaExcluir").textContent = entrega.destinatario;
  idParaExcluirEntrega = id;

  const modal = new bootstrap.Modal(
    document.querySelector("#modalConfirmarExclusaoEntrega"),
  );
  modal.show();
};

document
  .querySelector("#btnConfirmarExclusaoEntrega")
  .addEventListener("click", async () => {
    await window.api.excluirEntrega(idParaExcluirEntrega);

    const modal = bootstrap.Modal.getInstance(
      document.querySelector("#modalConfirmarExclusaoEntrega"),
    );
    modal.hide();

    carregarEntregas();
  });

carregarEntregas();

window.addEventListener("focus", () => {
  carregarEntregas();
});

document.querySelector('#btnExportarRelatorio').addEventListener('click', exportarRelatorio);
document.querySelector('#btnExportarBackup').addEventListener('click', exportarBackup);
document.querySelector('#btnImportarBackup').addEventListener('click', importarBackup);
