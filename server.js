const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const app = express();

app.use(express.json());

// Configurar timeout del servidor para Railway
app.use((req, res, next) => {
    res.setTimeout(30000, () => {
        console.error('Request timeout');
        res.status(504).json({
            success: false,
            error: 'Request timeout'
        });
    });
    next();
});

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
            '--disable-default-apps',
            '--disable-features=IsolateOrigins,site-per-process',
            '--single-process'
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

    console.log('Estado del cliente:', isClientReady);

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

    const startTime = Date.now();

    try {

        console.log('=== Iniciando envío de mensaje ===');
        console.log('Estado del cliente:', isClientReady);

        if (!isClientReady) {

            console.log('Cliente no está listo');
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
        console.log('Tiempo antes de enviar:', Date.now() - startTime, 'ms');

        // Reducir timeout a 30 segundos para evitar timeout de Railway
        const result = await Promise.race([

            client.sendMessage(chatId, message),

            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout enviando mensaje')), 30000)
            )

        ]);

        console.log('Mensaje enviado exitosamente');
        console.log('Tiempo total:', Date.now() - startTime, 'ms');

        return res.json({
            success: true,
            data: result.id.id
        });

    } catch (error) {

        console.error('ERROR en envío de mensaje:', error);
        console.error('Tiempo total hasta error:', Date.now() - startTime, 'ms');

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