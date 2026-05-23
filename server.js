const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const app = express();

app.use(express.json());

let isClientReady = false;

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "main-session"
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-resources',
            '--disable-default-apps'
        ],
        protocolTimeout: 180000,
        timeout: 60000
    }
});

client.on('qr', async (qr) => {

    console.log('====================');
    console.log('ESCANEA EL QR');
    console.log('====================');

    const qrImage = await QRCode.toDataURL(qr);

    console.log(qrImage);

});

client.on('loading_screen', (percent, message) => {

    console.log('Cargando WhatsApp:', percent, message);

});

client.on('authenticated', () => {

    console.log('WhatsApp autenticado');

});

client.on('ready', async () => {

    console.log('WhatsApp conectado!');

    isClientReady = true;

});

client.on('auth_failure', msg => {

    console.error('Error de autenticación:', msg);

    isClientReady = false;

});

client.on('disconnected', reason => {

    console.log('WhatsApp desconectado:', reason);

    isClientReady = false;

});

client.initialize();

app.get('/', (req, res) => {

    res.send('WhatsApp Service Online 🚀');

});

app.get('/status', (req, res) => {

    res.json({
        ready: isClientReady
    });

});

app.post('/send', async (req, res) => {

    try {

        if (!isClientReady) {

            return res.status(503).json({
                success: false,
                error: 'WhatsApp no está listo'
            });

        }

        const { number, message } = req.body;

        if (!number || !message) {

            return res.status(400).json({
                success: false,
                error: 'Número y mensaje requeridos'
            });

        }

        const cleanNumber = number.toString().replace(/\D/g, '');

        const chatId = cleanNumber + '@c.us';

        console.log('Enviando mensaje a:', chatId);

        const result = await Promise.race([

            client.sendMessage(chatId, message),

            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout enviando mensaje')), 60000)
            )

        ]);

        console.log('Mensaje enviado');

        return res.json({
            success: true,
            data: result.id.id
        });

    } catch (error) {

        console.error('ERROR:', error);

        return res.status(500).json({
            success: false,
            error: error.message
        });

    }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log('Servidor iniciado en puerto ' + PORT);

});