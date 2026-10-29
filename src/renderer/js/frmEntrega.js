let modoEdicao = false;
let idEmEdicao = null;

const formulario = document.querySelector("#formEntrega");
const campoQuantidade = document.querySelector("#quantidade");
const campoCep = document.querySelector("#cep");
const campoEndereco = document.querySelector("#endereco");
const campoMensagem = document.querySelector("#mensagem");

// Mostra mensagens de sucesso ou erro na tela.
function mostrarMensagem(texto, tipo = "danger") {
    campoMensagem.textContent = texto;
    campoMensagem.className = `alert alert-${tipo}`;
}

// Esconde a mensagem.
function limparMensagem() {
    campoMensagem.textContent = "";
    campoMensagem.className = "alert d-none";
}

// Valida o CEP: aceita 12345678 ou 12345-678.
function validarCep(cep) {
    return /^\d{5}-?\d{3}$/.test(cep.trim());
}

// Consulta o endereço na API ViaCEP.
async function consultarCep() {
    const cepDigitado = campoCep.value.trim();
    const cepLimpo = cepDigitado.replace(/\D/g, "");

    limparMensagem();

    // Se o campo estiver vazio, deixa a validação do formulário avisar.
    if (cepLimpo === "") {
        return;
    }

    // Valida antes de fazer a requisição.
    if (!validarCep(cepDigitado)) {
        mostrarMensagem("Digite um CEP válido com 8 números.");
        return;
    }

    try {
        campoMensagem.textContent = "Consultando CEP...";
        campoMensagem.className = "alert alert-info";

        // --- MUDANÇA AQUI: Chamando a API através do preload/main ---
        const dados = await window.api.buscarCep(cepLimpo);

        // Se a API estiver fora do ar, o main.js retorna null
        if (!dados) {
            mostrarMensagem("API fora do ar. Preencha o endereço manualmente.", "warning");
            return;
        }
        // ------------------------------------------------------------

        // A ViaCEP retorna erro: true para CEP inexistente.
        if (dados.erro) {
            campoEndereco.value = "";
            mostrarMensagem(
                "CEP não encontrado. Confira os números e tente novamente."
            );
            return;
        }

        // Monta o endereço com os campos que a API retornar.
        const partesEndereco = [
            dados.logradouro,
            dados.bairro,
            dados.localidade,
            dados.uf
        ].filter(Boolean);

        campoEndereco.value = partesEndereco.join(", ");

        // --- CÓDIGO DO DESAFIO (IBGE E DDD) ---
        const infoExtra = document.querySelector("#infoExtraCep");
        if (infoExtra) {
            infoExtra.textContent = `IBGE: ${dados.ibge || "-"} | DDD: ${dados.ddd || "-"}`;
        }
        // --------------------------------------

        mostrarMensagem("Endereço preenchido com sucesso!", "success");

    } catch (erro) {
        console.error("Erro ao consultar ViaCEP:", erro);

        mostrarMensagem(
            "Não foi possível consultar o CEP. Verifique sua conexão ou preencha o endereço manualmente.",
            "warning"
        );
    }
}

// Consulta quando o usuário sai do campo CEP.
campoCep.addEventListener("blur", consultarCep);

// Recebe os dados quando a tela é aberta para editar uma entrega.
window.api.aoReceberEntregaParaEditar((entrega) => {
    document.querySelector("#destinatario").value = entrega.destinatario;
    document.querySelector("#produto").value = entrega.produto;
    campoQuantidade.value = entrega.quantidade;
    campoCep.value = entrega.cep;
    campoEndereco.value = entrega.endereco;

    const data = new Date(entrega.data_entrega);

    if (!Number.isNaN(data.getTime())) {
        document.querySelector("#data_entrega").value = data.toISOString().slice(0, 10);
    }

    modoEdicao = true;
    idEmEdicao = entrega.id;

    document.querySelector("h4").textContent = "Editar Entrega";
});

// Valida os dados e salva a entrega.
formulario.addEventListener("submit", async (e) => {
    e.preventDefault();
    limparMensagem();

    // Validação da quantidade.
    const quantidade = Number(campoQuantidade.value);

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
        mostrarMensagem("A quantidade deve ser um número inteiro maior que zero.");
        campoQuantidade.focus();
        return;
    }

    // Validação do CEP.
    if (!validarCep(campoCep.value)) {
        mostrarMensagem("O CEP deve conter exatamente 8 números.");
        campoCep.focus();
        return;
    }

    const dados = Object.fromEntries(new FormData(formulario));
    dados.quantidade = quantidade;

    try {
        if (modoEdicao) {
            await window.api.atualizarEntrega({
                id: idEmEdicao,
                ...dados
            });
            console.log("Entrega atualizada com sucesso!");
        } else {
            const resultado = await window.api.criarEntrega(dados);
            console.log("Entrega cadastrada:", resultado);
        }

        // Fecha a janela somente se a operação der certo.
        window.close();

    } catch (erro) {
        console.error("Erro ao salvar entrega:", erro);
        mostrarMensagem(
            modoEdicao
                ? "Não foi possível atualizar a entrega. Tente novamente."
                : "Não foi possível cadastrar a entrega. Verifique o banco de dados e tente novamente."
        );
    }
});