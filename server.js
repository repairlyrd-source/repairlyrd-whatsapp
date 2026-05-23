const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const app = express();

app.use(express.json());

let clientReady = false;

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session'
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
            '--single-process',
            '--disable-gpu'
        ],

        protocolTimeout: 120000
    }
});

client.on('qr', async (qr) => {

    console.log('====================');
    console.log('ESCANEA EL QR');
    console.log('====================');

    const qrImage = await QRCode.toDataURL(qr);

    console.log(qrImage);
});

client.on('authenticated', () => {

    console.log('WhatsApp autenticado');

});

client.on('ready', () => {

    console.log('WhatsApp conectado!');
    clientReady = true;

});

client.on('auth_failure', msg => {

    console.error('Error de autenticación:', msg);

});

client.on('disconnected', reason => {

    console.log('WhatsApp desconectado:', reason);
    clientReady = false;

});

client.initialize();

app.get('/', (req, res) => {

    res.send('WhatsApp Service Online 🚀');

});

app.post('/send', async (req, res) => {

    try {

        if (!clientReady) {

            return res.status(503).json({
                success: false,
                error: 'WhatsApp no está listo todavía'
            });

        }

        const { number, message } = req.body;

        if (!number || !message) {

            return res.status(400).json({
                success: false,
                error: 'Número y mensaje requeridos'
            });

        }

        const cleanNumber = number
            .toString()
            .replace(/\D/g, '');

        const chatId = cleanNumber + '@c.us';

        console.log('Enviando mensaje a:', chatId);

        await client.sendMessage(chatId, message);

        console.log('Mensaje enviado correctamente');

        return res.json({
            success: true,
            message: 'Mensaje enviado'
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