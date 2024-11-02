const express = require ('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/');  // Pasta onde as imagens serão salvas
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));  // Nome único para evitar conflitos
    }
});
const upload = multer({ storage: storage });

const allowedOrigins = ['https://conect-beauty-app.vercel.app'];

const corsOptions = {
    origin: 'https://conect-beauty-app.vercel.app/', // Altere isso para o domínio correto
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Se você precisar enviar cookies ou cabeçalhos de autenticação
};

require('dotenv').config();

const PORT = 3030;

const app = express();

app.use(express.json())

app.use(cors(corsOptions));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Algo deu errado!');
});
//configurando o banco de dados
const { Pool } = require('pg');
const { parse } = require('dotenv');

const pool = new Pool({
    connectionString: "postgresql://agendamento_owner:DHLw1h8eZgiR@ep-empty-credit-a5swlfu0.us-east-2.aws.neon.tech/agendamento?sslmode=require"
});

// Testar a conexão
(async () => {
    try {
        const client = await pool.connect();
        console.log("Conexão bem-sucedida ao banco de dados!");
        client.release(); // Libera o cliente após a conexão
    } catch (err) {
        console.error("Erro ao conectar ao banco de dados:", err);
    }
})();


/*PGHOST=ep-cool-darkness-123456.us-east-2.aws.neon.tech
PGDATABASE=dbname
PGUSER=alex
PGPASSWORD=AbC123dEf
PGPORT=5432 */
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
        await pool.query('DELETE FROM agendamento WHERE id_cli = $1', [clientId]);
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

app.get('/clientes/:id', async (req, res) => {
    const clientId = req.params.id;

    try {
        const client = await pool.query('SELECT * FROM cliente WHERE id = $1', [clientId]);

        if (client.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        res.json(client.rows[0]);

    } catch (error) {
        console.error('Erro ao obter informações do cliente:', error);
        res.status(500).json({ error: 'Erro ao obter informações do cliente' });
    }
});



app.post('/empresa/cadastrar', upload.single('logo'), async (req, res) => {
    try {
        // Extrair a imagem (se for enviada)
        const logoPath = req.file ? req.file.path.replace(/\\/g, '/') : null;
        console.log(logoPath)

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
            classificacao: req.body.classificacao,
            inicio_expediente: req.body.inicio_expediente,
            fim_expediente: req.body.fim_expediente,
            dias_func: req.body.dias_func,
            logo: logoPath
        };

        // Validação de campos
        for (const iterator of Object.keys(req.body)) {
            console.log(iterator);
            if (!req.body[iterator]) {
                const err = new Error(iterator + ' é obrigatório!');
                err.status = 400;
                return res.status(400).json({ message: iterator + ' é obrigatório!' });
            }
        }

        // Verificando se o CNPJ já existe
        const cnpjJaExistente = await pool.query('SELECT * FROM empreendedora WHERE cnpj = $1', [req.body.cnpj]);
        if (cnpjJaExistente.rows.length > 0) {
            return res.status(400).json({ message: 'O CNPJ fornecido já está em uso.' });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(req.body.senha, 10);

        // Inserir dados no banco de dados, incluindo o caminho do logo
        const insertUserQuery = 'INSERT INTO empreendedora (cnpj, senha, nome, telefone, cidade, bairro, logradouro, numero, descricao, classificacao, dias_func, inicio_expediente, fim_expediente, logo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)';
        await pool.query(insertUserQuery, [
            empresa.cnpj, 
            hashedPassword, 
            empresa.nome, 
            empresa.telefone, 
            empresa.cidade, 
            empresa.bairro, 
            empresa.logradouro, 
            empresa.numero, 
            empresa.descricao, 
            empresa.classificacao, 
            empresa.dias_func, 
            empresa.inicio_expediente, 
            empresa.fim_expediente,
            empresa.logo  // Caminho do logo no banco de dados
        ]);

        res.status(201).send('Empresa registrada com sucesso.');
    } catch (error) {
        console.error('Erro ao registrar empresa:', error);
        res.status(500).send('Erro ao registrar empresa.');
    }
});


app.get('/empresa/todas', async (req, res) => {
    try {
        const empresas = await pool.query('SELECT nome, descricao, cnpj, logo FROM empreendedora');

        // Verifica se foram encontradas empresas
        if (empresas.rows.length === 0) {
            return res.status(404).json({ error: 'Nenhuma empresa encontrada' });
        }

        // Retorna as informações das empresas
        res.json(empresas.rows);
    } catch (error) {
        console.error('Erro ao obter informações das empresas:', error);
        res.status(500).json({ error: 'Erro ao obter informações das empresas' });
    }
});


app.get('/empresa', async (req, res) => {
    const token = req.headers['authorization'];

    try {
        const empresaCnpj = jwt.decode(token).cnpj;
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
    const {senha, nome, telefone, cidade, bairro, logradouro, numero, descricao, classificacao, inicio_expediente, fim_expediente, dias_func} = req.body;

    try {
        const empresaId = jwt.decode(token).cnpj;
        // Verifica se o cliente existe no banco de dados
        const clientExists = await pool.query('SELECT * FROM empreendedora WHERE cnpj = $1', [empresaId]);
        const hashedPassword = await bcrypt.hash(req.body.senha, 10);
        if (clientExists.rows.length === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }

        // Atualiza os dados do cliente
        const updateQuery = 'UPDATE empreendedora SET senha = $1, nome = $2, telefone = $3, cidade = $4, bairro = $5, logradouro = $6, numero = $7, descricao = $8, classificacao = $9, inicio_expediente = $10, fim_expediente = $11, dias_func = $12  WHERE cnpj = $13';
        await pool.query(updateQuery, [hashedPassword, nome, telefone, cidade, bairro, logradouro, numero, descricao, classificacao, inicio_expediente, fim_expediente, dias_func, empresaId]);

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

        await pool.query('DELETE FROM agendamento WHERE id_emp = $1', [empresaId])

        await pool.query('DELETE FROM procedimento WHERE cnpj = $1', [empresaId])
        // Deleta o cliente do banco de dados
        await pool.query('DELETE FROM empreendedora WHERE cnpj = $1', [empresaId]);

        res.json({ message: 'Empresa deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar empresa:', error);
        res.status(500).json({ error: 'Erro ao deletar empresa' });
    }
});


app.post('/procedimento', async (req, res) => {
    const token = req.headers['authorization'];
    try {
        const empresaCnpj = jwt.decode(token).cnpj;
        const procedimento = {
            nome: req.body.nome,
            descricao: req.body.descricao,
            duracao: req.body.duracao,
            preco: req.body.preco,
            categoria: req.body.categoria,
            classificacao: req.body.classificacao,
            cnpj: req.body.cnpj
        };

        for (const iterator of Object.keys(req.body) ) {
            console.log(iterator);
            if(!req.body[iterator]){
                const err = new Error(iterator+' é obrigatório!');
                err.status = 400;
                return res.status(400).json({message: iterator+' é obrigatório!'})
            }
        }

        //verificando se o email já existe
        const nomeJaExistente = await pool.query('SELECT * FROM procedimento WHERE nome = $1 AND cnpj = $2', [req.body.nome, empresaCnpj]);
        if(nomeJaExistente.rows.length > 0) {
          return res.status(400).json({message: 'O procedimento fornecido já existe em sua conta.'})
        }

        const insertUserQuery = 'INSERT INTO procedimento (nome, descricao, duracao, preco, categoria, classificacao, cnpj) VALUES ($1, $2, $3, $4, $5, $6, $7)';
        await pool.query(insertUserQuery, [procedimento.nome, procedimento.descricao, procedimento.duracao, procedimento.preco, procedimento.categoria, procedimento.classificacao, empresaCnpj]);
        res.status(201).json({ message: 'Procedimento registrado com sucesso.' });
      } catch (error) {
        console.error('Erro ao registrar procedimento:', error);
        res.status(500).send('Erro ao registrar procedimento.');
    }
})

app.get('/procedimento/unico/:id', async (req, res) => {
    const token = req.headers['authorization'];

    try {
        const procedimentoId = req.params.id;

        // Consulta o banco de dados para obter as informações do procedimento com base no ID
        const procedimento = await pool.query('SELECT * FROM procedimento WHERE id_pro = $1', [procedimentoId]);

        // Verifica se o procedimento foi encontrado
        if (procedimento.rows.length === 0) {
            return res.status(404).json({ error: 'Procedimento não encontrado' });
        }

        // Retorna as informações do procedimento
        res.json(procedimento.rows[0]);
    } catch (error) {
        console.error('Erro ao obter informações do procedimento:', error);
        res.status(500).json({ error: 'Erro ao obter informações do procedimento' });
    }
});

app.get('/procedimento', async (req, res) => {
    const token = req.headers['authorization'];

    try {
        const empresaCnpj = jwt.decode(token).cnpj;
        // Consulta o banco de dados para obter as informações do usuário com base no ID
        const client = await pool.query('SELECT * FROM procedimento WHERE cnpj = $1', [empresaCnpj]);

        // Verifica se o usuário foi encontrado
        if (client.rows.length === 0) {
            return res.status(404).json({ error: 'Procedimento não encontrado' });
        }

        // Retorna as informações do usuário
        res.json(client.rows);
    } catch (error) {
        console.error('Erro ao obter informações do procedimento:', error);
        res.status(500).json({ error: 'Erro ao obter informações do procedimento' });
    }
});

app.put('/procedimento', async (req, res) => {
    const token = req.headers['authorization']
    const {nome, descricao, duracao, preco, categoria, classificacao} = req.body;

    try {
        let empresaId = jwt.decode(token).cnpj;
        // Verifica se o cliente existe no banco de dados
        const procedimentoFind = await pool.query('SELECT * FROM procedimento WHERE cnpj = $1 AND nome = $2', [empresaId, req.body.nome_antigo]);
        if (procedimentoFind.rows.length === 0) {
            return res.status(404).json({ error: 'Procedimento não encontrado' });
        }
        const procedimentoExists = pool.query("SELECT * FROM procedimento WHERE cnpj = $1 AND nome = $2", [empresaId, req.body.nome])
        if((await procedimentoExists).rowCount != 0){
            return res.status(400).json({error: 'procedimento já cadastrado em sua conta'})
        }
        // Atualiza os dados do cliente
        const updateQuery = 'UPDATE procedimento SET nome = $1, descricao = $2, duracao = $3, preco = $4, categoria = $5, classificacao = $6 WHERE cnpj = $7 AND nome = $8';
        await pool.query(updateQuery, [nome, descricao, duracao, preco, categoria, classificacao, empresaId, req.body.nome_antigo]);

        res.json({ message: 'Informações do procedimento atualizadas com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar procedimento:', error);
        res.status(500).json({ error: 'Erro ao atualizar Informações do procedimento' });
    }
});
app.delete('/procedimento', async (req, res) => {
    const token = req.headers['authorization']
    try {
        let empresaId = jwt.decode(token).cnpj;
        const nomeProcedimento = req.body.nome;
        const procedimentoExists = await pool.query('SELECT * FROM procedimento WHERE nome = $1 AND cnpj = $2', [nomeProcedimento, empresaId]);
        if (procedimentoExists.rows.length === 0) {
            return res.status(404).json({ error: 'Procedimento não encontrado' });
        }

        await pool.query('DELETE FROM agendamento WHERE id_pro = $1', [req.body.id_pro])
        // Deleta o cliente do banco de dados
        await pool.query('DELETE FROM procedimento WHERE nome = $1 AND cnpj = $2', [nomeProcedimento, empresaId]);

        res.json({ message: 'Procedimento deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar procedimento:', error);
        res.status(500).json({ error: 'Erro ao deletar procedimento' });
    }
});
app.post('/agendamento', async (req, res) => {
    console.log('Dados recebidos:', req.body);
    const token = req.headers['authorization'];
    try {
        const clienteId = jwt.decode(token).id;
        const agendamento = {
            id_cli: clienteId,
            id_pro: req.body.id_pro,
            id_emp: req.body.cnpj,
            data: req.body.data,
            hora_inicio: req.body.hora_inicio,
            hora_fim: req.body.hora_fim
        };

        for (const iterator of Object.keys(req.body)) {
            if (!req.body[iterator]) {
                const err = new Error(iterator + ' é obrigatório!');
                err.status = 400;
                return res.status(400).json({ message: iterator + ' é obrigatório!' });
            }
        }

        const dias_func_empreendedora = await pool.query('SELECT dias_func FROM empreendedora WHERE cnpj = $1', [agendamento.id_emp]);
        console.log('Dias de funcionamento do empreendedor:', dias_func_empreendedora.rows[0]);
        const data = new Date(agendamento.data);

        if (dias_func_empreendedora.rows[0].dias_func[data.getDay()]) {
            console.log("Dia disponível");
            const inicio_expediente = await pool.query('SELECT inicio_expediente FROM empreendedora WHERE cnpj = $1', [agendamento.id_emp]);
            const fim_expediente = await pool.query('SELECT fim_expediente FROM empreendedora WHERE cnpj = $1', [agendamento.id_emp]);

            console.log('Início do expediente:', inicio_expediente.rows[0].inicio_expediente);
            console.log('Fim do expediente:', fim_expediente.rows[0].fim_expediente);

            if (horarioEstaNoIntervalo(agendamento.hora_inicio, inicio_expediente.rows[0].inicio_expediente, fim_expediente.rows[0].fim_expediente) && 
                horarioEstaNoIntervalo(agendamento.hora_fim, inicio_expediente.rows[0].inicio_expediente, fim_expediente.rows[0].fim_expediente)) {
                
                console.log("Horário disponível");
                const agendamentosIni = await pool.query('SELECT hora_inicio FROM agendamento');
                const agendamentosFim = await pool.query('SELECT hora_fim FROM agendamento');
                let horarioDisponivel = true;

                for (let i = 0; i < agendamentosIni.rowCount; i++) {
                    console.log('Comparando com agendamento existente:');
                    console.log('Hora de início agendada:', agendamentosIni.rows[i].hora_inicio);
                    console.log('Hora de fim agendada:', agendamentosFim.rows[i].hora_fim);
                
                    // Converte os horários para Date para facilitar a comparação
                    const inicioExistente = new Date(`1970-01-01T${agendamentosIni.rows[i].hora_inicio}`);
                    const fimExistente = new Date(`1970-01-01T${agendamentosFim.rows[i].hora_fim}`);
                    const inicioNovo = new Date(`1970-01-01T${agendamento.hora_inicio}`);
                    const fimNovo = new Date(`1970-01-01T${agendamento.hora_fim}`);
                
                    if (
                        (inicioNovo >= inicioExistente && inicioNovo < fimExistente) || // Novo início dentro do existente
                        (fimNovo > inicioExistente && fimNovo <= fimExistente) || // Novo fim dentro do existente
                        (inicioExistente >= inicioNovo && inicioExistente < fimNovo) // Existente início dentro do novo
                    ) {
                        console.log('Horário não disponível');
                        horarioDisponivel = false;
                        break;
                    }
                }
                
                

                console.log('Horário disponível:', horarioDisponivel);

                if (horarioDisponivel) {
                    const insertAgdQuery = 'INSERT INTO agendamento (id_cli, id_pro, id_emp, data, hora_inicio, hora_fim) VALUES ($1, $2, $3, $4, $5, $6)';
                    await pool.query(insertAgdQuery, [clienteId, agendamento.id_pro, agendamento.id_emp, agendamento.data, agendamento.hora_inicio, agendamento.hora_fim]);
                    res.status(201).json({ message: 'Procedimento registrado com sucesso.' });
                } else {
                    res.status(400).send("Já existe outro procedimento cadastrado nesse horário");
                }
            } else {
                res.status(400).send("O estabelecimento não funciona nesse horário");
            }
        } else {
            res.status(400).send("O estabelecimento não funciona nesse dia");
        }

    } catch (error) {
        console.error('Erro ao registrar agendamento:', error);
        res.status(500).send('Erro ao registrar agendamento.');
    }
});


app.get('/agendamento', async (req, res) => {
    const token = req.headers['authorization'];
    let id;
    try {
        if(jwt.decode(token).cnpj == undefined){
            id = jwt.decode(token).id
            agendamento = await pool.query('SELECT * FROM agendamento WHERE id_cli = $1', [id]);
        }else{
            id = jwt.decode(token).cnpj
            agendamento = await pool.query('SELECT * FROM agendamento WHERE id_emp = $1', [id]);
        }
        // Verifica se o usuário foi encontrado
        if (agendamento.rows.length === 0) {
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        }

        // Retorna as informações do usuário
        res.json(agendamento.rows);
    } catch (error) {
        console.error('Erro ao obter informações do agendamento:', error);
        res.status(500).json({ error: 'Erro ao obter informações do agendamento' });
    }
});

app.get('/agendamento/:cnpj', async (req, res) => {
    const cnpj = req.params.cnpj; // Obtém o CNPJ da URL
    try {
        // Consulta o banco de dados para obter agendamentos da empresa com o CNPJ fornecido
        const agendamento = await pool.query('SELECT * FROM agendamento WHERE id_emp = $1', [cnpj]);

        // Verifica se agendamentos foram encontrados
        if (agendamento.rows.length === 0) {
            return res.status(404).json({ error: 'Agendamento não encontrado para esta empresa.' });
        }

        res.json(agendamento.rows);
    } catch (error) {
        console.error('Erro ao obter informações do agendamento:', error);
        res.status(500).json({ error: 'Erro ao obter informações do agendamento' });
    }
});


app.put('/agendamento', async (req, res) => {
    const agendamento = {
        data: req.body.data,
        hora_inicio: req.body.hora_inicio,
        hora_fim: req.body.hora_fim,
        id_emp: req.body.id_emp,
        id_cli: req.body.id_cli,
        id_pro: req.body.id_pro
    }
    try {
        // Atualiza os dados do cliente
        const updateQuery = 'UPDATE agendamento SET data = $1, hora_inicio = $2, hora_fim = $3, id_pro = $4 WHERE id_emp = $5 AND id_cli = $6';
        await pool.query(updateQuery, [agendamento.data, agendamento.hora_inicio, agendamento.hora_fim, agendamento.id_pro, agendamento.id_emp, agendamento.id_cli]);

        res.json({ message: 'Informações do agendamento atualizadas com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar agendamento:', error);
        res.status(500).json({ error: 'Erro ao atualizar Informações do agendamento' });
    }
});
app.delete('/agendamento', async (req, res) => {
    try {
        const agendamento = {
            data: req.body.data,
            hora_inicio: req.body.hora_inicio
        }
        const agendamentoExists = await pool.query('SELECT * FROM agendamento WHERE data = $1 AND hora_inicio = $2', [agendamento.data, agendamento.hora_inicio]);
        if (agendamentoExists.rows.length === 0) {
            return res.status(404).json({ error: 'Procedimento não encontrado' });
        }

        // Deleta o agendamento do banco de dados
        await pool.query('DELETE FROM agendamento WHERE data = $1 AND hora_inicio = $2', [agendamento.data, agendamento.hora_inicio]);

        res.json({ message: 'Agendamento deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar agendamento:', error);
        res.status(500).json({ error: 'Erro ao deletar agendamento' });
    }
});


function horarioEstaNoIntervalo(horario, inicioIntervalo, fimIntervalo) {
    // Converte os horários para objetos Date para facilitar a comparação
    const iniIntDate = "2024-04-20T" + inicioIntervalo + ":00"
    const fimIntDate = "2024-04-20T" + fimIntervalo + ":00"
    const horarioIntDate = "2024-04-20T" + horario
    //console.log(iniIntDate + "\n" + fimIntDate + "\n" + horarioIntDate)

    const horarioDate = new Date(horarioIntDate);
    const inicioIntervaloDate = new Date(iniIntDate);
    const fimIntervaloDate = new Date(fimIntDate);

    //console.log(horarioDate + "\n" + inicioIntervaloDate + "\n" + fimIntervaloDate)

    // Verifica se o horário está dentro do intervalo
    return horarioDate >= inicioIntervaloDate && horarioDate <= fimIntervaloDate;
}
    //
app.get('/procedimento/filtro', async (req, res) => {
    try {
        const { categoria } = req.query;
            //console.log('Categoria:', categoria);
    
            // Consulta para buscar procedimentos com a categoria especificada
            const procedimentosFiltrados = await pool.query('SELECT cnpj FROM procedimento WHERE categoria = $1', [categoria]);
            //console.log('Procedimentos filtrados:', procedimentosFiltrados.rows);
    
            if (procedimentosFiltrados.rowCount === 0) {
                console.log('Nenhum procedimento encontrado com a categoria especificada.');
                return res.json([]);
            }
    
            // Montar uma lista de IDs de procedimentos
            const procedimentoIds = procedimentosFiltrados.rows.map(procedimento => procedimento.cnpj);
            //console.log('IDs dos procedimentos filtrados:', procedimentoIds);

            
            // Consulta para buscar todas as empresas associadas aos procedimentos filtrados
            const empresasComFiltro = await pool.query('SELECT cnpj, nome, descricao FROM empreendedora WHERE cnpj = ANY($1)', [procedimentoIds]);
            //console.log('Empresas com filtro:', empresasComFiltro.rows);
    
            res.json(empresasComFiltro.rows);
        } catch (error) {
            console.error('Erro ao consultar procedimentos:', error);
            res.status(500).json({ error: 'Erro ao consultar procedimentos' });
        }
});

app.get('/procedimento/:cnpj', async (req, res) => {
    try {
        const cnpj = req.params.cnpj;
    
            const procedimentosFiltrados = await pool.query('SELECT * FROM procedimento WHERE cnpj = $1', [cnpj]);
            
            if (procedimentosFiltrados.rowCount === 0) {
                console.log('Nenhum procedimento encontrado com a categoria especificada.');
                return res.json([]);
            }

            res.json(procedimentosFiltrados.rows);
        } catch (error) {
            console.error('Erro ao consultar procedimentos:', error);
            res.status(500).json({ error: 'Erro ao consultar procedimentos' });
        }
});

app.get('/empresa/:cnpj', async (req, res) => {
    try {
        const cnpj = req.params.cnpj;
        
        const empresa = await pool.query('SELECT * FROM empreendedora WHERE cnpj = $1', [cnpj]);
        
        if (empresa.rowCount === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }

        res.json(empresa.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar informações da empresa:', error);
        res.status(500).json({ error: 'Erro ao buscar informações da empresa' });
    }
});


// Middleware para servir arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Endpoint para upload de imagens
app.post('/upload', upload.single('image'), (req, res) => {
    try {
        res.status(200).json({
            message: 'Imagem enviada com sucesso!',
            imagePath: req.file.path,
        });
    } catch (error) {
        res.status(400).json({ message: 'Erro ao enviar a imagem', error });
    }
});



export default function handler(req, res) {
    if (req.url === '/favicon.ico') {
        res.status(204).end(); // Retorna um status 204 sem conteúdo
    } else {
        // Lógica para outras rotas
    }
}

module.exports = app;