const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const mime = require('mime-types');
const session = require('express-session');

const app = express();
const port = 3300;

// Configuração do body-parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configuração do banco de dados
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Substitua pelo seu usuário do MySQL
    password: 'cimatec', // Substitua pela sua senha do MySQL
    database: 'bancotb', // Nome do seu banco de dados
});

db.connect((err) => { 
    if (err) {
        throw err;
    }
    console.log('Conectado ao banco de dados MySQL com Sucesso!');
});

// Servir arquivos estáticos (CSS, imagens, etc.) diretamente da raiz
app.use(express.static(path.join(__dirname, 'js')));
app.use(express.static(path.join(__dirname, 'css')));
app.use(express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'img')));
app.use(express.static(path.join(__dirname, 'video')));
app.use(express.static(path.join(__dirname, 'html')));
console.log('Servindo arquivos estáticos a partir da raiz do projeto');

// Armazenar informações do usuario
app.use(session({
    secret: 'segredo',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Servir o arquivo HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/html/indexInicio.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '/html/indexSingIn.html'));
});

app.get('/dist', (req, res) => {
    res.sendFile(path.join(__dirname, '/html/indexDist.html'));
});

app.get('/cadastro', (req, res) => {
    res.sendFile(path.join(__dirname, '/html/indexCadastro.html'));
});

app.get('/word', (req, res) => {
    res.sendFile(path.join(__dirname, '/html/word.html'));
});

app.get('/video', (req, res) => {
    res.sendFile(path.join(__dirname, '/video'));
});

app.get('/pagaluno', (req, res) => {
    if (!req.session.usuario) {
        res.redirect('/login');
        return;
    }
    res.sendFile(path.join(__dirname, '/html/pagaluno.html'));
});

app.use('/pagaluno', (req, res, next) => {
    if (!req.session.usuario) {
        return res.status(401).send({ message: 'Você precisa se registrar ou logar para acessar esta página.' });
    }
    next();
});

app.get('/getUsuarioId', (req, res) => {
    if (req.session.usuario) {
        res.json({ usuarioId: req.session.usuario.idusuario });  // Retorna o ID do usuário logado
    } else {
        res.status(401).json({ message: 'Usuário não está logado' });
    }
});

// Rota para login de dados
app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    const queryVerificar = 'SELECT * FROM usuario WHERE email = ? AND senha = ?';
    db.query(queryVerificar, [email, senha], (err, results) => {
        if (err) {
            throw err;
        }
        if (results.length > 0) {
            req.session.usuario = results[0];
            res.json({ success: true });
        } else {
            const queryVerificarEmail = 'SELECT * FROM usuario WHERE email = ?';
            db.query(queryVerificarEmail, [email], (err, results) => {
                if (err) {
                    throw err;
                }
                if (results.length > 0) {
                    res.json({ success: false, message: 'Senha incorreta!' }); // Senha incorreta
                } else {
                    res.json({ success: false, message: 'Dados não encontrados!' }); // Email e senha incorretos
                }
            });
        }
    });
});

// Rota para cadastrar dados
app.post('/cadastrar', (req, res) => {
    const { nome, email, senha } = req.body;
    const queryVerificar = 'SELECT * FROM usuario WHERE email = ?';
    db.query(queryVerificar, [email], (err, results) => {
        if (err) {
            throw err;
        }
        if (results.length > 0) {
            res.json({ message: 'Usuário já cadastrado!' });
        } else {
            const query = 'INSERT INTO usuario (nome, email, senha) VALUES (?, ?, ?)';
            db.query(query, [nome, email, senha], (err, results) => {
                if (err) {
                    throw err;
                }
                res.json({ message: 'Dados cadastrados com sucesso!' });
            });
        }
    });
});

// verificar cadastros
app.post('/verificarCadastro', (req, res) => {
    const { email } = req.body;
    const query = 'SELECT * FROM usuario WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            throw err;
        }
        if (results.length > 0) {
            res.json({ message: 'Usuário já cadastrado!' });
        } else {
            res.json({ message: 'Usuário não cadastrado!' });
        }
    });
});

app.post('/salvarProgresso', (req, res) => {
    const { usuarioId, cursoId, videosAssistidos, totalVideos } = req.body;

    // Calcular a porcentagem de progresso
    const progresso = (videosAssistidos / totalVideos) * 100;

    // Verificar se o progresso do usuário e curso já existe
    const queryCheck = 'SELECT * FROM progresso_usuario WHERE usuarioId = ? AND cursoId = ?';
    db.query(queryCheck, [usuarioId, cursoId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Erro ao verificar progresso.' });
        }

        if (results.length > 0) {
            // Atualizar progresso existente
            const queryUpdate = 'UPDATE progresso_usuario SET videosAssistidos = ?, progresso = ? WHERE usuarioId = ? AND cursoId = ?';
            db.query(queryUpdate, [videosAssistidos, progresso, usuarioId, cursoId], (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Erro ao atualizar progresso.' });
                }
                res.json({ message: 'Progresso atualizado com sucesso!' });
            });
        } else {
            // Inserir novo progresso
            const queryInsert = 'INSERT INTO progresso_usuario (usuarioId, cursoId, videosAssistidos, progresso) VALUES (?, ?, ?, ?)';
            db.query(queryInsert, [usuarioId, cursoId, videosAssistidos, progresso], (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Erro ao salvar progresso.' });
                }
                res.json({ message: 'Progresso salvo com sucesso!' });
            });
        }
    });
});

app.get('/getProgresso', (req, res) => {
    const usuarioId = req.query.usuarioId;
    const cursoId = req.query.cursoId;

    if (!usuarioId || !cursoId) {
        return res.status(400).json({ message: 'ID do usuário ou do curso não fornecido.' });
    }

    const query = 'SELECT * FROM progresso_usuario WHERE usuarioId = ? AND cursoId = ?';
    db.query(query, [usuarioId, cursoId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Erro ao buscar progresso.' });
        }

        if (results.length > 0) {
            const progresso = results[0];
            res.json({
                videosAssistidos: progresso.videosAssistidos,
                progresso: progresso.progresso
            });
        } else {
            res.json({ videosAssistidos: 0, progresso: 0 });
        }
    });
});

// verificar login
app.get('/verificarLogin', (req, res) => {
    if (req.session.usuario) {
        res.json({ logado: true });
    } else {
        res.json({ logado: false });
    }
});

// Rota para buscar dados
app.get('/getData', (req, res) => {
    const query = 'SELECT * FROM usuario';
    db.query(query, (err, results) => {
        if (err) {
            throw err;
        }
        res.json(results);
    });
});

// Rota para atualizar dados
app.put('/update/:idusuario', (req, res) => {
    const { idusuario } = req.params;
    const { nome, email, senha } = req.body;
    const query = 'UPDATE usuario SET nome = ?, email = ?, senha = ? WHERE idusuario = ?';
    db.query(query, [nome, email, senha, idusuario], (err, result) => {
        if (err) {
            throw err;
        }
        res.json({ message: 'Dados atualizados com sucesso!' });
    });
});

// Rota para excluir dados
app.delete('/delete/:idusuario', (req, res) => {
    const { idusuario } = req.params;
    const query = 'DELETE FROM usuario WHERE idusuario = ?';
    db.query(query, [idusuario], (err, result) => {
        if (err) {
            throw err;
        }
        res.json({ message: 'Dados excluídos com sucesso!' });
    });
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
