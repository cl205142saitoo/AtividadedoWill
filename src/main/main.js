const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const path = require("path");
const conexao = require("./conexao");
const fs = require('fs/promises');
const axios = require('axios');

const testarConexaoBanco = () => {
  try {
    conexao.connect((erro) => {
      if (erro) {
        console.error("Erro assíncrono ao conectar ao MySQL:", erro.message);
        if (dialog) {
          dialog.showErrorBox(
            "Erro de conexão com o banco",
            `Não foi possível conectar ao MySQL.\n\nDetalhes: ${erro.message}`,
          );
        }
        return;
      }
      console.log("Conectado ao MySQL com sucesso!");
    });
  } catch (excecao) {
    console.error("Erro síncrono fatal ao tentar conectar:", excecao);
    if (dialog) {
      dialog.showErrorBox(
        "Falha Crítica",
        `O código quebrou antes de tentar a conexão:\n\n${excecao.message}`,
      );
    }
  }
};

const abrirModalEntrega = (janelaPrincipal, entrega_ = null) => {
  const janelaModal = new BrowserWindow({
    width: 400,
    height: 600,
    parent: janelaPrincipal,
    modal: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
  
    },
  });
  janelaModal.removeMenu();
  janelaModal.loadFile(path.join(__dirname, "../renderer/frmEntrega.html"));
  janelaModal.webContents.openDevTools();
  // Só existe entrega quando estamos ABRINDO EM MODO EDIÇÃO
  if (entrega_) {
    janelaModal.webContents.once("did-finish-load", () => {
      janelaModal.webContents.send("entrega:preencher", entrega_);
    });
  }
};



const criarJanelaPrincipal = () => {
  const janelaPrincipal = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  janelaPrincipal.loadFile(
    path.join(__dirname, "../renderer/frmPrincipal.html"),
  );
  janelaPrincipal.webContents.openDevTools();
  return janelaPrincipal;
};

const criarMenuPrincipal = (janelaPrincipal) => {
  const templateDoMenu = [
    {
      label: "Cadastros",
      submenu: [
        { label: "Entrega", click: () => abrirModalEntrega(janelaPrincipal) },
      ],
    },
    {
      label: "Sistema",
      submenu: [
        {
          label: "Sair Imediatamente",
          role: "quit",
          accelerator: "CmdOrCtrl+Q",
        },
      ],
    },
  ];

  const menuReal = Menu.buildFromTemplate(templateDoMenu);
  Menu.setApplicationMenu(menuReal);
};

app.whenReady().then(() => {
  testarConexaoBanco();

  const janelaPrincipal = criarJanelaPrincipal();

  criarMenuPrincipal(janelaPrincipal);





  ipcMain.handle("entrega:criar", (evento, entrega_) => {
    return new Promise((resolve, reject) => {
      const sql =
        "INSERT INTO entrega (destinatario, produto, quantidade, cep, endereco, data_entrega) VALUES (?, ?, ?, ?, ?, ?)";

      conexao.query(
        sql,
        [entrega_.destinatario, entrega_.produto, entrega_.quantidade, entrega_.cep, entrega_.endereco, entrega_.data_entrega],
        (erro, resultado) => {
          if (erro) {
            reject(erro);
            return;
          }
          resolve({ id: resultado.insertId, ...entrega_ });
        },
      );
    });
  });

  ipcMain.handle("entrega:listar", () => {
    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM entrega ORDER BY data_entrega DESC";

      conexao.query(sql, (erro, resultado) => {
        if (erro) {
          reject(erro);
          return;
        }
        resolve(resultado);
      });
    });
  });

  ipcMain.handle("entrega:atualizar", (evento, entrega_) => {
    return new Promise((resolve, reject) => {
      const sql =
        "UPDATE entrega SET destinatario = ?, produto = ?, quantidade = ?, cep = ?, endereco = ?, data_entrega = ? WHERE id = ?";
      const valores = [
        entrega_.destinatario,
        entrega_.produto,
        entrega_.quantidade,
        entrega_.cep,
        entrega_.endereco,
        entrega_.data_entrega,
        entrega_.id,
      ];

      conexao.query(sql, valores, (erro, resultado) => {
        if (erro) {
          reject(erro);
        } else {
          resolve(resultado);
        }
      });
    });
  });

  ipcMain.on("entrega:abrirEdicao", (evento, entrega_) => {
    abrirModalEntrega(janelaPrincipal, entrega_);
  });

  ipcMain.handle("entrega:excluir", (evento, id) => {
    return new Promise((resolve, reject) => {
      const sql = "DELETE FROM entrega WHERE id = ?";

      conexao.query(sql, [id], (erro, resultado) => {
        if (erro) {
          reject(erro);
          return;
        }
        resolve(resultado);
      });
    });
  });




  ipcMain.handle('arquivo:salvarTexto', async (evento, conteudo) => {
  const { canceled, filePath } = await dialog.showSaveDialog(janelaPrincipal, {
    title: 'Salvar relatorio',
    defaultPath: 'relatorio-entrega.txt',
    filters: [{ name: 'Texto', extensions: ['txt'] }]
  });

  if (canceled) return;

  await fs.writeFile(filePath, conteudo);
});

ipcMain.handle('arquivo:exportarJson', async (evento, dados) => {
  const { canceled, filePath } = await dialog.showSaveDialog(janelaPrincipal, {
    title: 'Salvar backup',
    defaultPath: 'backup-entrega.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (canceled) return;

  await fs.writeFile(filePath, JSON.stringify(dados, null, 2));
});

ipcMain.handle('arquivo:importarJson', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(janelaPrincipal, {
    title: 'Escolher backup',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });

  if (canceled) return null;

  const conteudo = await fs.readFile(filePaths[0], 'utf-8');
  return JSON.parse(conteudo);
});

ipcMain.handle("cep:buscar", async (evento, cep) => {
  try {
    const resposta = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
    return resposta.data;
  } catch (erro) {
    console.error("Erro ao buscar CEP:", erro.message);
    return null;
  }
});



});
