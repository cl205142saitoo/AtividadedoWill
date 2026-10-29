const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {

  criarEntrega: (entrega) => ipcRenderer.invoke('entrega:criar', entrega),
  listarEntregas: () => ipcRenderer.invoke('entrega:listar'),
  editarEntrega: (entrega) => ipcRenderer.send('entrega:abrirEdicao', entrega),
  atualizarEntrega: (entrega) => ipcRenderer.invoke('entrega:atualizar', entrega),
  excluirEntrega: (id) => ipcRenderer.invoke('entrega:excluir', id),

  aoReceberEntregaParaEditar: (callback) =>
    ipcRenderer.on('entrega:preencher', (evento, entrega) => callback(entrega)),

  salvarArquivoTexto: (conteudo) => ipcRenderer.invoke('arquivo:salvarTexto', conteudo),
  exportarBackupJson: (dados) => ipcRenderer.invoke('arquivo:exportarJson', dados),
  importarBackupJson: () => ipcRenderer.invoke('arquivo:importarJson'),

    buscarCep: (cep) => ipcRenderer.invoke('cep:buscar', cep)
});
