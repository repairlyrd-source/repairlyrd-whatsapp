const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const app = express();

app.use(express.json());

let clientReady = false;
let lastQr = null;

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "repairly-session"
    }),

    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ]
    }
});

client.on('qr', async (qr) => {

    console.log('====================');
    console.log('ESCANEA EL QR');
    console.log('====================');

    lastQr = await QRCode.toDataURL(qr);

    console.log(lastQr);
});

client.on('ready', () => {

    clientReady = true;

    console.log('WhatsApp conectado!');
});

client.on('authenticated', () => {

    console.log('WhatsApp autenticado');
});

client.on('auth_failure', (msg) => {

    clientReady = false;

    console.error('Error autenticando:', msg);
});

client.on('disconnected', async (reason) => {

    clientReady = false;

    console.log('WhatsApp desconectado:', reason);

    console.log('Reiniciando cliente...');

    try {

        await client.destroy();

    } catch (e) {}

    setTimeout(() => {

        client.initialize();

    }, 5000);
});

client.initialize();

app.get('/', (req, res) => {

    res.send('WhatsApp Service Online 🚀');
});

app.get('/qr', (req, res) => {

    if (!lastQr) {

        return res.send('QR no disponible todavía');
    }

    res.send(`
        <html>
            <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#111;">
                <img src="${lastQr}" width="350" />
            </body>
        </html>
    `);
});

app.post('/send', async (req, res) => {

    try {

        const { number, message } = req.body;

        if (!number || !message) {

            return res.status(400).json({
                success: false,
                error: 'Número y mensaje requeridos'
            });
        }

        if (!clientReady) {

            return res.status(500).json({
                success: false,
                error: 'WhatsApp no está listo'
            });
        }

        const cleanNumber = number.toString().replace(/\D/g, '');

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

        clientReady = false;

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