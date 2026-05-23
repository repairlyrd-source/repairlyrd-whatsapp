const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');

const app = express();

app.use(express.json());

// ELIMINA SESIÓN PARA GENERAR NUEVO QR
const sessionPath = './.wwebjs_auth';

if (fs.existsSync(sessionPath)) {

    fs.rmSync(sessionPath, {
        recursive: true,
        force: true
    });

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
            '--disable-gpu'

        ],

        protocolTimeout: 120000

    }

});

// EVENTOS

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

client.on('authenticated', () => {

    console.log('WhatsApp autenticado');

});

client.on('ready', () => {

    console.log('WhatsApp conectado!');

});

client.on('auth_failure', msg => {

    console.error('Error de autenticación:', msg);

});

client.on('disconnected', reason => {

    console.log('WhatsApp desconectado:', reason);

});

// INICIALIZAR

client.initialize();

// RUTA PRINCIPAL

app.get('/', (req, res) => {

    res.send('WhatsApp Service Online 🚀');

});

// ENVIAR MENSAJES

app.post('/send', async (req, res) => {

    try {

        const { number, message } = req.body;

        if (!number || !message) {

            return res.status(400).json({

                success: false,
                error: 'Número y mensaje son requeridos'

            });

        }

        // LIMPIA EL NÚMERO
        const cleanNumber = number
            .toString()
            .replace(/\D/g, '');

        // FORMATO WHATSAPP
        const chatId = cleanNumber + '@c.us';

        console.log('Enviando mensaje a:', chatId);

        // PEQUEÑA ESPERA PARA ESTABILIDAD
        await new Promise(resolve => setTimeout(resolve, 3000));

        // ENVÍA MENSAJE
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

// PUERTO

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log('Servidor iniciado en puerto ' + PORT);

});