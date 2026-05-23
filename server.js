const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const app = express();

app.use(express.json({ limit: '10mb' }));

// Configurar timeout del servidor para Railway
app.use((req, res, next) => {
    res.setTimeout(120000, () => {
        console.error('Request timeout');
        res.status(504).json({
            success: false,
            error: 'Request timeout'
        });
    });
    next();
});

// Limitar concurrent requests
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3;

app.use((req, res, next) => {
    if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
        return res.status(429).json({
            success: false,
            error: 'Too many requests. Please try again later.'
        });
    }
    activeRequests++;
    res.on('finish', () => {
        activeRequests--;
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
            '--disable-features=IsolateOrigins,site-per-process'
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

    console.log('Memoria usada:', process.memoryUsage());

});

client.on('auth_failure', msg => {

    console.error('Error de autenticación:', msg);

    isClientReady = false;

});

client.on('disconnected', reason => {

    console.log('WhatsApp desconectado:', reason);

    isClientReady = false;

    // Reconectar automáticamente después de 5 segundos
    setTimeout(() => {
        console.log('Intentando reconectar...');
        client.initialize();
    }, 5000);

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

// Endpoint GET para pruebas (solo para debug)
app.get('/send', (req, res) => {

    res.json({
        message: 'Este endpoint solo acepta solicitudes POST',
        usage: {
            method: 'POST',
            url: '/send',
            body: {
                number: '1234567890',
                message: 'tu mensaje'
            }
        }
    });

});

app.post('/send', async (req, res) => {

    const { number, message } = req.body;

    // Validar entrada inmediatamente
    if (!number || !message) {
        return res.status(400).json({
            success: false,
            error: 'Número y mensaje requeridos'
        });
    }

    // Verificar si el cliente está listo
    if (!isClientReady) {
        return res.status(503).json({
            success: false,
            error: 'WhatsApp no está listo'
        });
    }

    // Retornar respuesta inmediatamente (fire and forget)
    res.json({
        success: true,
        message: 'Mensaje en cola para envío'
    });

    // Enviar mensaje en background
    setImmediate(async () => {
        const startTime = Date.now();
        const maxRetries = 3;
        let retryCount = 0;

        const sendWithRetry = async () => {
            try {
                const cleanNumber = number.toString().replace(/\D/g, '');
                const chatId = cleanNumber + '@c.us';

                console.log('=== Enviando mensaje en background ===');
                console.log('Enviando mensaje a:', chatId);
                console.log('Tiempo antes de enviar:', Date.now() - startTime, 'ms');

                // Timeout de 90 segundos para el envío en background
                const result = await Promise.race([
                    client.sendMessage(chatId, message),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout enviando mensaje')), 90000)
                    )
                ]);

                console.log('Mensaje enviado exitosamente en background');
                console.log('Tiempo total:', Date.now() - startTime, 'ms');

            } catch (error) {
                console.error('ERROR en envío de mensaje (background):', error);
                console.error('Tiempo total hasta error:', Date.now() - startTime, 'ms');

                // Si es error de frame detached, intentar reconectar y reintentar
                if (error.message.includes('detached Frame') && retryCount < maxRetries) {
                    retryCount++;
                    console.log(`Error de frame detectado. Reintentando (${retryCount}/${maxRetries})...`);

                    isClientReady = false;

                    await new Promise(resolve => setTimeout(resolve, 2000));

                    return sendWithRetry();
                }
            }
        };

        await sendWithRetry();
    });

});

const PORT = process.env.PORT || 8080;

// Manejo global de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('UNCAUGHT EXCEPTION:', error);
    // No matar el proceso, solo loggear el error
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
    // No matar el proceso, solo loggear el error
});

app.listen(PORT, () => {

    console.log('Servidor iniciado en puerto ' + PORT);

});