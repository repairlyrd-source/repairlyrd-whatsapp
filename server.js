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
            '--disable-gpu'
        ],

        protocolTimeout: 180000
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

client.on('ready', async () => {

    console.log('WhatsApp conectado!');

    clientReady = true;

});

client.on('loading_screen', (percent, message) => {

    console.log('Cargando WhatsApp:', percent, message);

});

client.on('disconnected', async (reason) => {

    console.log('WhatsApp desconectado:', reason);

    clientReady = false;

    console.log('Reiniciando cliente...');

    setTimeout(() => {
        client.initialize();
    }, 5000);

});

client.on('auth_failure', msg => {

    console.error('Error de autenticación:', msg);

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
                error: 'WhatsApp aún no está listo'
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

        // Espera antes de enviar
        await new Promise(resolve => setTimeout(resolve, 3000));

        const sentMessage = await client.sendMessage(chatId, message);

        console.log('Mensaje enviado');

        return res.json({
            success: true,
            id: sentMessage.id.id
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