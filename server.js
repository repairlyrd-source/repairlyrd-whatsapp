const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const app = express();

app.use(express.json());

let qrCodeBase64 = null;
let isReady = false;

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'repairlyrd'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote'
        ]
    }
});

client.on('qr', async (qr) => {

    console.log('====================');
    console.log('ESCANEA EL QR');
    console.log('====================');

    qrCodeBase64 = await QRCode.toDataURL(qr);

    console.log(qrCodeBase64);

});

client.on('ready', () => {

    console.log('WhatsApp conectado!');
    isReady = true;

});

client.on('authenticated', () => {

    console.log('WhatsApp autenticado');

});

client.on('disconnected', (reason) => {

    console.log('WhatsApp desconectado:', reason);

    isReady = false;

});

client.initialize();

app.get('/', (req, res) => {

    res.send('WhatsApp Service Online 🚀');

});

app.get('/qr', (req, res) => {

    if (!qrCodeBase64) {
        return res.send('QR no generado todavía');
    }

    res.send(`
        <html>
            <body style="text-align:center;font-family:Arial">
                <h1>Escanea el QR</h1>
                <img src="${qrCodeBase64}" />
            </body>
        </html>
    `);

});

app.get('/status', (req, res) => {

    res.json({
        ready: isReady
    });

});

app.post('/send', async (req, res) => {

    try {

        if (!isReady) {

            return res.status(500).json({
                success: false,
                error: 'WhatsApp no conectado'
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

        const response = await client.sendMessage(chatId, message);

        console.log('Mensaje enviado');

        res.json({
            success: true,
            id: response.id.id
        });

    } catch (error) {

        console.error('ERROR:', error);

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log('Servidor iniciado en puerto ' + PORT);

});