function nextForm1(){
    document.getElementById("form1").style.display = "none";
    document.getElementById("form2").style.display = "flex";
    document.getElementById("form3").style.display = "none";
    document.getElementById("form4").style.display = "none";      
}
function nextForm2(){
    document.getElementById("form1").style.display = "none";
    document.getElementById("form2").style.display = "none";
    document.getElementById("form3").style.display = "flex";
    document.getElementById("form4").style.display = "none";
}

function nextForm3(){
    document.getElementById("form1").style.display = "none";
    document.getElementById("form2").style.display = "none";
    document.getElementById("form3").style.display = "none";
    document.getElementById("form4").style.display = "flex";
    
    document.getElementById('uploadImage').addEventListener('change', function(event) {
        const file = event.target.files[0];
        document.getElementById("logo-img").src = URL.createObjectURL(file);
        console.log("Oi");
    });
}
function previousForm2(){
    document.getElementById("form1").style.display = "flex";
    document.getElementById("form2").style.display = "none";
    document.getElementById("form3").style.display = "none";
    document.getElementById("form4").style.display = "none";
}
function previousForm3(){
    document.getElementById("form2").style.display = "none";
    document.getElementById("form2").style.display = "flex";
    document.getElementById("form3").style.display = "none";
    document.getElementById("form4").style.display = "none";   
}

function previousForm4(){
    document.getElementById("form2").style.display = "none";
    document.getElementById("form2").style.display = "none";
    document.getElementById("form3").style.display = "flex";
    document.getElementById("form4").style.display = "none";
}

function validarCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]+/g, ''); // Remove tudo que não é dígito

    if (cnpj.length !== 14)
        return false;

    // Elimina CNPJs inválidos conhecidos
    if (/^(\d)\1{13}$/.test(cnpj))
        return false;

    // Valida DVs
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(0)))
        return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado !== parseInt(digitos.charAt(1)))
        return false;

    return true;
}

/*function registerEmpresa(){
    const inputFiles = document.getElementById("uploadImage").files[0];
    if(validarCNPJ(document.getElementById("cnpj").value)){
        if(inputFiles){
            const dias = [document.getElementById("domingo").checked, document.getElementById("segunda").checked, document.getElementById("terça").checked, document.getElementById("quarta").checked, document.getElementById("quinta").checked, document.getElementById("sexta").checked, document.getElementById("sábado").checked]
            const formData = new formData();
            const empresaData = {
              cnpj: document.getElementById("cnpj").value,
              senha: document.getElementById("senha").value,
              nome: document.getElementById("nome").value,
              telefone: document.getElementById("telefone").value,
              cidade: document.getElementById("cidade").value,
              bairro: document.getElementById("bairro").value,
              logradouro: document.getElementById("logradouro").value,
              numero: document.getElementById("numero").value,
              descricao: document.getElementById("descrição").value,
              classificacao: "0",
              inicio_expediente: document.getElementById("horaInicial").value,
              fim_expediente: document.getElementById("horaFinal").value,
              dias_func: dias
            };
            fetch('http://localhost:3030/empresa/cadastrar', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(empresaData)
            })
            .then(response => {
                if (!response.ok) {
                    // Se a resposta não estiver OK, exibe a mensagem de erro diretamente
                    return response.text().then(errorMessage => {
                        throw new Error('Erro durante o cadastro da empresa! ' + errorMessage);
                    });
                }
                return response.text();
            })
            .then(data => {
                console.log('Empresa cadastrada com sucesso:', data);
                alert('Empresa cadastrada com sucesso!');
                window.location.href = '../index.html';
            })
            .catch(error => {
                // Captura e exibe o erro no console
                console.error('Erro durante a requisição:', error.message);
                alert('Erro durante a requisição: ' + error.message);
            });
        }
    }else{
        alert("CNPJ inválido")
    }
}*/

function registerEmpresa() {
    const inputFiles = document.getElementById("uploadImage").files[0];

    if (validarCNPJ(document.getElementById("cnpj").value)) {
        // Cria um objeto FormData
        const formData = new FormData();
        
        // Adiciona os dados da empresa ao FormData
        formData.append('cnpj', document.getElementById("cnpj").value);
        formData.append('senha', document.getElementById("senha").value);
        formData.append('nome', document.getElementById("nome").value);
        formData.append('telefone', document.getElementById("telefone").value);
        formData.append('cidade', document.getElementById("cidade").value);
        formData.append('bairro', document.getElementById("bairro").value);
        formData.append('logradouro', document.getElementById("logradouro").value);
        formData.append('numero', document.getElementById("numero").value);
        formData.append('descricao', document.getElementById("descrição").value);
        formData.append('classificacao', "0");
        formData.append('inicio_expediente', document.getElementById("horaInicial").value);
        formData.append('fim_expediente', document.getElementById("horaFinal").value);

        // Adiciona os dias da semana ao FormData
        const dias = [
            document.getElementById("domingo").checked,
            document.getElementById("segunda").checked,
            document.getElementById("terça").checked,
            document.getElementById("quarta").checked,
            document.getElementById("quinta").checked,
            document.getElementById("sexta").checked,
            document.getElementById("sábado").checked
        ];

        formData.append('dias_func', `{${dias.join(',')}}`);

        if (inputFiles) {
            formData.append('logo', inputFiles);
        } else {
            alert('Por favor, selecione uma imagem para o logo.');
            return;
        }

        // Faz a requisição POST com o FormData
        fetch('http://localhost:3030/empresa/cadastrar', {
            method: 'POST',
            body: formData // Envia o FormData com todos os dados e arquivos
        })
        .then(response => {
            if (!response.ok) {
                // Se a resposta não estiver OK, exibe a mensagem de erro diretamente
                return response.text().then(errorMessage => {
                    throw new Error('Erro durante o cadastro da empresa! ' + errorMessage);
                });
            }
            return response.text();
        })
        .then(data => {
            console.log('Empresa cadastrada com sucesso:', data);
            alert('Empresa cadastrada com sucesso!');
            window.location.href = '../index.html';
        })
        .catch(error => {
            // Captura e exibe o erro no console
            console.error('Erro durante a requisição:', error.message);
            alert('Erro durante a requisição: ' + error.message);
        });
    } else {
        alert("CNPJ inválido");
    }
}


