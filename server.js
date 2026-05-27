const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + uuidv4() + ext);
  }
});

const upload = multer({ storage });

const agendamentos = [];

const client = new Client({
    authStrategy: new LocalAuth(),

    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

client.on('qr', qr => {
  console.log('Escaneie o QR Code:');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('✅ WhatsApp conectado com sucesso!');
});

client.on('ready', async () => {
  console.log('🚀 Sistema pronto!');

  const chats = await client.getChats();
  const grupos = chats.filter(chat => chat.isGroup);

  console.log('\n===== GRUPOS =====\n');
  grupos.forEach((grupo, index) => {
    console.log(`${index + 1} - ${grupo.name}`);
  });
  console.log('\n==================\n');
});

async function buscarGrupo(nomeGrupo) {
  const chats = await client.getChats();
  return chats.find(chat => chat.isGroup && chat.name === nomeGrupo);
}

async function enviarMensagemGrupo(nomeGrupo, mensagem, imagemPath = null) {
  const grupo = await buscarGrupo(nomeGrupo);

  if (!grupo) {
    console.log(`❌ Grupo não encontrado: ${nomeGrupo}`);
    return false;
  }

  if (imagemPath) {
    const media = MessageMedia.fromFilePath(imagemPath);
    await grupo.sendMessage(media, { caption: mensagem || '' });
    console.log(`✅ Imagem enviada para: ${nomeGrupo}`);
  } else {
    await grupo.sendMessage(mensagem);
    console.log(`✅ Mensagem enviada para: ${nomeGrupo}`);
  }

  return true;
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/grupos', async (req, res) => {
  const chats = await client.getChats();

  const grupos = chats
    .filter(chat => chat.isGroup)
    .map(chat => chat.name);

  res.json(grupos);
});

app.get('/agendamentos', (req, res) => {
  const lista = agendamentos.map(({ tarefa, ...dados }) => dados);
  res.json(lista);
});

app.post('/upload', upload.single('imagem'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: 'Nenhuma imagem enviada' });
  }

  res.json({
    sucesso: true,
    arquivo: req.file.path,
    url: `/uploads/${req.file.filename}`
  });
});

app.get('/enviar', async (req, res) => {
  const grupo = req.query.grupo;
  const msg = req.query.msg;

  if (!grupo || !msg) {
    return res.send('Informe grupo e msg');
  }

  const enviado = await enviarMensagemGrupo(grupo, msg);

  res.send(enviado ? 'Mensagem enviada!' : 'Grupo não encontrado');
});

app.post('/agendar', upload.single('imagem'), (req, res) => {
  const { grupo, mensagem, hora, minuto, tipo, diaSemana } = req.body;

  if (!grupo || hora === undefined || minuto === undefined || !tipo) {
    return res.status(400).json({
      erro: 'Informe grupo, hora, minuto e tipo'
    });
  }

  if (!mensagem && !req.file) {
    return res.status(400).json({
      erro: 'Informe uma mensagem ou uma imagem'
    });
  }

  let expressaoCron;

  if (tipo === 'diario') {
    expressaoCron = `${minuto} ${hora} * * *`;
  } else if (tipo === 'semanal') {
    if (diaSemana === undefined) {
      return res.status(400).json({
        erro: 'Para semanal, informe diaSemana de 0 a 6'
      });
    }

    expressaoCron = `${minuto} ${hora} * * ${diaSemana}`;
  } else {
    return res.status(400).json({
      erro: 'Tipo inválido. Use diario ou semanal'
    });
  }

  const imagemPath = req.file ? req.file.path : null;
  const id = uuidv4();

  const tarefa = cron.schedule(expressaoCron, async () => {
    console.log(`⏰ Executando agendamento ${id}`);
    await enviarMensagemGrupo(grupo, mensagem, imagemPath);
  });

  const novoAgendamento = {
    id,
    grupo,
    mensagem: mensagem || '',
    imagemPath,
    hora: Number(hora),
    minuto: Number(minuto),
    tipo,
    diaSemana: diaSemana ?? null,
    ativo: true,
    criadoEm: new Date().toISOString()
  };

  agendamentos.push({
    ...novoAgendamento,
    tarefa
  });

  res.json({
    sucesso: true,
    agendamento: novoAgendamento
  });
});

app.delete('/agendamento/:id', (req, res) => {
  const id = req.params.id;

  const index = agendamentos.findIndex(item => item.id === id);

  if (index === -1) {
    return res.status(404).json({ erro: 'Agendamento não encontrado' });
  }

  agendamentos[index].tarefa.stop();
  agendamentos.splice(index, 1);

  res.json({
    sucesso: true,
    mensagem: 'Agendamento cancelado'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

client.initialize();