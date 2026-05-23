const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');

const app = express();

app.use(express.json());

// FORZAR NUEVO QR
const sessionPath = './.wwebjs_auth';

if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
    console.log('Sesión anterior eliminada');
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: '/usr/bin/google-chrome',
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

    console.log('==============================');
    console.log('ESCANEA ESTE QR EN WHATSAPP');
    console.log('==============================');

    const qrImage = await QRCode.toDataURL(qr);

    console.log(qrImage);

});

client.on('loading_screen', (percent, message) => {

    console.log('Cargando WhatsApp:', percent, message);

});

client.on('ready', () => {

    console.log('WhatsApp conectado!');

});

client.on('authenticated', () => {

    console.log('WhatsApp autenticado');

});

client.on('auth_failure', msg => {

    console.error('Error de autenticación:', msg);

});

client.on('disconnected', reason => {

    console.log('WhatsApp desconectado:', reason);

});

client.initialize();

app.get('/', (req, res) => {

    res.send('WhatsApp Service Online 🚀');

});

app.post('/send', async (req, res) => {

    try {

        const { number, message } = req.body;

        if (!number || !message) {

            return res.status(400).json({
                success: false,
                error: 'Número y mensaje son requeridos'
            });

        }

        const cleanNumber = number.toString().replace(/\D/g, '');

        const chatId = cleanNumber + '@c.us';

        console.log('Enviando mensaje a:', chatId);

        const isRegistered = await client.isRegisteredUser(chatId);

        if (!isRegistered) {

            return res.status(400).json({
                success: false,
                error: 'El número no tiene WhatsApp'
            });

        }

        await new Promise(resolve => setTimeout(resolve, 2000));

        const sentMessage = await client.sendMessage(chatId, message);

        console.log('Mensaje enviado:', sentMessage.id.id);

        res.json({
            success: true,
            message: 'Mensaje enviado'
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