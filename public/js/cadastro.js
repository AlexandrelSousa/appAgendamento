function registerUser(){

    const userData = {
      email: document.getElementById("email").value,
      username: document.getElementById("nome").value,
      senha: document.getElementById("senha").value,
      telefone: document.getElementById("telefone").value,
      confirmSenha: document.getElementById("confirm").value
    };
    console.log("email: "+ userData.email + "\nnome: " + userData.nome + "\ntelefone: " + userData.telefone + "\nsenha: " + userData.senha + "\nconfirmSenha: " + userData.confirmSenha)
    
    fetch('http://localhost:3030/clientes/cadastro', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    })
    .then(response => {
        if (!response.ok) {
            // Se a resposta não estiver OK, exibe a mensagem de erro diretamente
            return response.text().then(errorMessage => {
                throw new Error('Erro durante o cadastro do usuário: ' + errorMessage);
            });
        }
        return response.text();
    })
    .then(data => {
        console.log('Usuário cadastrado com sucesso:', data);
        alert('Usuário cadastrado com sucesso!');
        window.location.href = '../index.html';
    })
    .catch(error => {
        // Captura e exibe o erro no console
        console.error('Erro durante a requisição:', error.message);
        alert('Erro durante a requisição: ' + error.message);
    });
}
  
function replaceCadastro(){
    location.replace("./html/cadastro.html", "_self");
}