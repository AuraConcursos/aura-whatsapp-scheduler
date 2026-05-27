const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();

app.use(express.static('public'));

const PORT = process.env.PORT || 10000;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// QR CODE
client.on('qr', (qr) => {
    console.log('QR CODE:\n');
    qrcode.generate(qr, { small: false });
});

// READY
client.on('ready', async () => {
    console.log('✅ WhatsApp conectado com sucesso!');

    const chats = await client.getChats();

    const grupos = chats.filter(chat => chat.isGroup);

    console.log('\n===== GRUPOS ENCONTRADOS =====\n');

    grupos.forEach((grupo, index) => {
        console.log(`${index + 1} - ${grupo.name}`);
    });

    console.log('\n==============================\n');
});

// ROTA TESTE
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// ENVIAR MENSAGEM
app.get('/enviar', async (req, res) => {

    const nomeGrupo = req.query.grupo;
    const mensagem = req.query.msg;

    if (!nomeGrupo || !mensagem) {
        return res.send('Informe grupo e msg');
    }

    const chats = await client.getChats();

    const grupo = chats.find(
        chat => chat.isGroup && chat.name === nomeGrupo
    );

    if (!grupo) {
        return res.send('Grupo não encontrado');
    }

    await grupo.sendMessage(mensagem);

    res.send('Mensagem enviada com sucesso!');
});

app.get('/grupos', async (req, res) => {
    try {
        const chats = await client.getChats();

        const grupos = chats
            .filter(chat => chat.isGroup)
            .map(chat => chat.name);

        res.json(grupos);
    } catch (error) {
        console.error('Erro ao buscar grupos:', error);
        res.status(500).json({ erro: 'Erro ao buscar grupos' });
    }
});

// SERVIDOR
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// INICIALIZA
client.initialize();