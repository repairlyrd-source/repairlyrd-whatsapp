const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const app = express();

app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', async (qr) => {
    console.log('QR generado');

    const qrImage = await QRCode.toDataURL(qr);

    console.log(qrImage);
});

client.on('ready', () => {
    console.log('WhatsApp conectado!');
});

client.initialize();

app.post('/send', async (req, res) => {
    try {
        const { number, message } = req.body;

        const chatId = number + '@c.us';

        await client.sendMessage(chatId, message);

        res.json({
            success: true,
            message: 'Mensaje enviado'
        });

    } catch (error) {
        console.error(error);

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