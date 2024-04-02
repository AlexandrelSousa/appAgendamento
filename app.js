const express = require ('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

require('dotenv').config();

const PORT = 3030;

const app = express();

app.use(express.json())
app.use(cors());
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Algo deu errado!');
});
//configurando o banco de dados
const { Pool } = require('pg');

const pool = new Pool({
    host: "localhost",
    user: "postgres",
    port: 5433,
    password: "123",
    database: "appAgendamento"
})

pool.connect();

const users = [];

app.get('/', (req, res) => {
    res.send('Bem-vindo ao app de agendamento!')
});

app.listen(PORT, () => {
    console.log(`Servidor inicializado na porta ${PORT}`)
})

app.post('/login', async (req, res) => {
    const {emailOuCNPJ, senha} = req.body;

    //verifica se o nome de usuário existe no banco de dados
    const user = await pool.query('SELECT * FROM cliente WHERE email = $1', [emailOuCNPJ]);
    const cnpj = await pool.query('SELECT * FROM empreendedora WHERE cnpj = $1', [emailOuCNPJ]);

    if(user.rows.length === 0 && cnpj.rows.length === 0){
      return res.status(401).json({message: 'Dados de login incorretos.'});
    } else if(user.rows.length === 0){
        const validPassword = await bcrypt.compare(senha, cnpj.rows[0].senha);
        if(!validPassword){
            return res.status(401).json({message: 'Nome de usuário ou senha incorretos'});
          }
        const acessToken = jwt.sign({username: cnpj.rows[0].nome, cnpj: cnpj.rows[0].cnpj}, process.env.ACESS_TOKEN_SECRET);

        res.json({ acessToken: acessToken });
    } else{
        const validPassword = await bcrypt.compare(senha, user.rows[0].senha);
        if(!validPassword){
            return res.status(401).json({message: 'Nome de usuário ou senha incorretos'});
        }
        const acessToken = jwt.sign({username: user.rows[0].nome, id: user.rows[0].id}, process.env.ACESS_TOKEN_SECRET);

        res.json({ acessToken: acessToken });
    }
    
});

app.post('/clientes/cadastro', async (req, res) => {
    try {
        const user = {
            email: req.body.email,
            username: req.body.username,
            senha: req.body.senha,
            telefone: req.body.telefone,
            confirmSenha: req.body.confirmSenha
        };

        if (!req.body.username) {
            const err = new Error('Nome de usuário é obrigatório!');
            err.status = 400; // Define o status do erro
            return res.status(400).send('Nome de usuário é obrigatório!');
        }
        if(!req.body.senha){
            return res.status(400).send('Senha é obrigatória!');
        }
        if(!req.body.telefone){
            return res.status(400).send('Telefone é obrigatório!');
        }
        if(!req.body.confirmSenha){
            return res.status(400).send('Confirmação da senha é obrigatória!');
        }
        if(req.body.confirmSenha !== req.body.senha){
            return res.status(400).send('As senhas não conferem!');
        }
        if(!req.body.email){
          return res.status(400).send('O campo email é obrigatório!')
        }

        //verificando se o email já existe
        const emailJaExistente = await pool.query('SELECT * FROM cliente WHERE email = $1', [req.body.email]);
        if(emailJaExistente.rows.length > 0) {
          return res.status(400).json({message: 'O email fornecido já está em uso.'})
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(req.body.senha, 10);
        
        const insertUserQuery = 'INSERT INTO cliente (nome, senha, telefone, email) VALUES ($1, $2, $3, $4)';
        await pool.query(insertUserQuery, [user.username, hashedPassword, user.telefone, user.email]);
        res.status(201).send('Usuário registrado com sucesso.');
      } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        res.status(500).send('Erro ao registrar usuário.');
    }
})

// Endpoint para atualizar um cliente
app.put('/clientes', async (req, res) => {
    const token = req.headers['authorization']
    const { nome, senha, telefone, email } = req.body;

    try {
        const clientId = jwt.decode(token).id;
        // Verifica se o cliente existe no banco de dados
        const clientExists = await pool.query('SELECT * FROM cliente WHERE id = $1', [clientId]);
        const hashedPassword = await bcrypt.hash(req.body.senha, 10);
        if (clientExists.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        // Atualiza os dados do cliente
        const updateQuery = 'UPDATE cliente SET nome = $1, senha = $2, telefone = $3, email = $4 WHERE id = $5';
        await pool.query(updateQuery, [nome, hashedPassword, telefone, email, clientId]);

        res.json({ message: 'Cliente atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
});

// Endpoint para deletar um cliente
app.delete('/clientes', async (req, res) => {
    const token = req.headers['authorization']
    try {
        const clientId = jwt.decode(token).id;
        // Verifica se o cliente existe no banco de dados
        const clientExists = await pool.query('SELECT * FROM cliente WHERE id = $1', [clientId]);
        if (clientExists.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        // Deleta o cliente do banco de dados
        await pool.query('DELETE FROM cliente WHERE id = $1', [clientId]);

        res.json({ message: 'Cliente deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar cliente:', error);
        res.status(500).json({ error: 'Erro ao deletar cliente' });
    }
});

// Endpoint para obter as informações de um usuário
app.get('/clientes', async (req, res) => {
    const token = req.headers['authorization'];

    try {
        const clientId = jwt.decode(token).id;
        // Consulta o banco de dados para obter as informações do usuário com base no ID
        const client = await pool.query('SELECT * FROM cliente WHERE id = $1', [clientId]);

        // Verifica se o usuário foi encontrado
        if (client.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Retorna as informações do usuário
        res.json(client.rows[0]);
    } catch (error) {
        console.error('Erro ao obter informações do usuário:', error);
        res.status(500).json({ error: 'Erro ao obter informações do usuário' });
    }
});

app.post('/empresa/cadastrar', async (req, res) => {
    try {
        const empresa = {
            cnpj: req.body.cnpj,
            senha: req.body.senha,
            nome: req.body.nome,
            telefone: req.body.telefone,
            cidade: req.body.cidade,
            bairro: req.body.bairro,
            logradouro: req.body.logradouro,
            numero: req.body.numero,
            descricao: req.body.descricao,
            formas_pgmnto: req.body.formas_pgmnto,
            classificacao: req.body.classificacao,
            horario_func: req.body.horario_func,
            dias_func: req.body.dias_func,
        };

// Verifica se o CNPJ é fornecido
for (const iterator of Object.keys(req.body) ) {
    console.log(iterator);
    if(!req.body[iterator]){
        const err = new Error(iterator+' é obrigatório!');
        err.status = 400;
        return res.status(400).json({message: iterator+' é obrigatório!'})
    }
}
        //verificando se o email já existe
        const cnpjJaExistente = await pool.query('SELECT * FROM empreendedora WHERE cnpj = $1', [req.body.cnpj]);
        if(cnpjJaExistente.rows.length > 0) {
          return res.status(400).json({message: 'O CNPJ fornecido já está em uso.'})
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(req.body.senha, 10);
        
        const insertUserQuery = 'INSERT INTO empreendedora (cnpj, senha, nome, telefone, cidade, bairro, logradouro, numero, descricao, formas_pgmnto, classificacao, horario_func, dias_func) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)';
        await pool.query(insertUserQuery, [empresa.cnpj, hashedPassword, empresa.nome, empresa.telefone, empresa.cidade, empresa.bairro, empresa.logradouro, empresa.numero, empresa.descricao, empresa.formas_pgmnto, empresa.classificacao, empresa.horario_func, empresa.dias_func]);
        res.status(201).send('Empresa registrada com sucesso.');
      } catch (error) {
        console.error('Erro ao registrar empresa:', error);
        res.status(500).send('Erro ao registrar empresa.');
    }
})

app.get('/empresa', async (req, res) => {
    const token = req.headers['authorization'];

    try {
        const empresaCnpj = jwt.decode(token).cnpj;
        console.log(empresaCnpj)
        // Consulta o banco de dados para obter as informações do usuário com base no ID
        const client = await pool.query('SELECT * FROM empreendedora WHERE cnpj = $1', [empresaCnpj]);

        // Verifica se o usuário foi encontrado
        if (client.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Retorna as informações do usuário
        res.json(client.rows[0]);
    } catch (error) {
        console.error('Erro ao obter informações do usuário:', error);
        res.status(500).json({ error: 'Erro ao obter informações do usuário' });
    }
});

app.put('/empresa', async (req, res) => {
    const token = req.headers['authorization']
    const {senha, nome, telefone, cidade, bairro, logradouro, numero, descricao, formas_pgmnto, classificacao, horario_func, dias_func} = req.body;

    try {
        const empresaId = jwt.decode(token).cnpj;
        // Verifica se o cliente existe no banco de dados
        const clientExists = await pool.query('SELECT * FROM empreendedora WHERE cnpj = $1', [empresaId]);
        const hashedPassword = await bcrypt.hash(req.body.senha, 10);
        if (clientExists.rows.length === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }

        // Atualiza os dados do cliente
        const updateQuery = 'UPDATE empreendedora SET senha = $1, nome = $2, telefone = $3, cidade = $4, bairro = $5, logradouro = $6, numero = $7, descricao = $8, formas_pgmnto = $9, classificacao = $10, horario_func = $11, dias_func = $12  WHERE cnpj = $13';
        await pool.query(updateQuery, [hashedPassword, nome, telefone, cidade, bairro, logradouro, numero, descricao, formas_pgmnto, classificacao, horario_func, dias_func, empresaId]);

        res.json({ message: 'Informações da empresa atualizadas com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar empresa:', error);
        res.status(500).json({ error: 'Erro ao atualizar Informações da empresa' });
    }
});

app.delete('/empresa', async (req, res) => {
    const token = req.headers['authorization']
    try {
        const empresaId = jwt.decode(token).cnpj;
        // Verifica se o cliente existe no banco de dados
        const empresaExists = await pool.query('SELECT * FROM empreendedora WHERE cnpj = $1', [empresaId]);
        if (empresaExists.rows.length === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }

        // Deleta o cliente do banco de dados
        await pool.query('DELETE FROM empreendedora WHERE cnpj = $1', [empresaId]);

        res.json({ message: 'Empresa deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar empresa:', error);
        res.status(500).json({ error: 'Erro ao deletar empresa' });
    }
});