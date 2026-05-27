const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();

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
    console.log('Escaneie o QR Code abaixo:\n');
    qrcode.generate(qr, { small: true });
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
    res.send('Servidor WhatsApp funcionando 🚀');
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

// SERVIDOR
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// INICIALIZA
client.initialize();