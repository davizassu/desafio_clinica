let cpfLogado = "";

// 1. Troca as palavras do título a cada 2 segundos
const palavras = ["fisioterapia", "odontologia", "psicologia", "nutrição", "enfermagem"];
let posicao = 0;

setInterval(function() {
  posicao = posicao + 1;
  if (posicao >= palavras.length) {
    posicao = 0;
  }
  document.getElementById("texto-animado").innerText = palavras[posicao];
}, 2000);

// 2. Função para esconder todas as telas e mostrar só a escolhida
function irPara(idTela) {
  document.getElementById("tela-home").classList.add("escondido");
  document.getElementById("tela-login").classList.add("escondido");
  document.getElementById("tela-cadastro").classList.add("escondido");
  document.getElementById("tela-cartao").classList.add("escondido");

  document.getElementById(idTela).classList.remove("escondido");
}

// 3. Busca o CEP direto na API pública do ViaCEP
function buscarCep() {
  let cep = document.getElementById("cad-cep").value;
  if (cep.length === 8) {
    fetch("https://viacep.com.br/ws/" + cep + "/json/")
      .then(resposta => resposta.json())
      .then(dados => {
        if (!dados.erro) {
          document.getElementById("cad-rua").value = dados.logradouro;
          document.getElementById("cad-bairro").value = dados.bairro;
        }
      });
  }
}

// 4. Envia o formulário de cadastro + fotos para o Python
function fazerCadastro() {
  let formData = new FormData();
  formData.append("nome", document.getElementById("cad-nome").value);
  formData.append("cpf", document.getElementById("cad-cpf").value);
  formData.append("nascimento", document.getElementById("cad-nasc").value);
  formData.append("telefone", document.getElementById("cad-tel").value);
  formData.append("cep", document.getElementById("cad-cep").value);
  formData.append("rua", document.getElementById("cad-rua").value);
  formData.append("bairro", document.getElementById("cad-bairro").value);
  formData.append("rg", document.getElementById("cad-rg").files[0]);
  formData.append("doc_cpf", document.getElementById("cad-doc-cpf").files[0]);

  fetch("/cadastrar", {
    method: "POST",
    body: formData
  })
  .then(resposta => resposta.json())
  .then(dados => {
    if (dados.erro) {
      alert(dados.erro);
    } else {
      mostrarCartao(dados);
    }
  });
}

// 5. Faz login no Python
function fazerLogin() {
  let cpf = document.getElementById("login-cpf").value;
  let nascimento = document.getElementById("login-nasc").value;

  fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cpf: cpf, nascimento: nascimento })
  })
  .then(resposta => resposta.json())
  .then(dados => {
    if (dados.erro) {
      alert(dados.erro);
    } else {
      mostrarCartao(dados);
    }
  });
}

// 6. Preenche os dados na tela do Cartão Digital
function mostrarCartao(paciente) {
  cpfLogado = paciente.cpf;
  document.getElementById("cartao-nome").innerText = paciente.nome;
  document.getElementById("cartao-cpf").innerText = "CPF: " + paciente.cpf;
  document.getElementById("cartao-token").innerText = paciente.qr_token;
  document.getElementById("cartao-faltas").innerText = paciente.faltas;
  document.getElementById("cartao-status").innerText = paciente.status_consulta;

  // Gera a imagem do QR Code usando uma URL pronta
  document.getElementById("cartao-qr").src = 
    "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + paciente.qr_token;

  irPara("tela-cartao");
}

// 7. Confirma ou cancela a consulta
function mudarStatus(novoStatus) {
  fetch("/atualizar_consulta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cpf: cpfLogado, status: novoStatus })
  })
  .then(() => {
    document.getElementById("cartao-status").innerText = novoStatus;
    alert("Status alterado para: " + novoStatus);
  });
}