const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isClientReady = false;

client.on('qr', (qr) => {
    console.log('=== ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP ===');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('¡Cliente de WhatsApp Web JS está LISTO!');
    isClientReady = true;
});

client.on('authenticated', () => {
    console.log('Autenticación exitosa.');
});

client.on('auth_failure', msg => {
    console.error('Fallo en la autenticación', msg);
});

client.initialize();

// Endpoint para enviar mensaje
app.post('/send', async (req, res) => {
    try {
        const { phone, message } = req.body;
        
        if (!phone || !message) {
            return res.status(400).json({ success: false, error: 'Se requiere "phone" y "message"' });
        }

        if (!isClientReady) {
            return res.status(503).json({ success: false, error: 'El cliente de WhatsApp aún no está listo. Escanea el QR.' });
        }

        // Formatear el número para whatsapp-web.js
        // Si viene con '+', lo quitamos.
        let formattedPhone = phone.replace(/\+/g, '');
        // El formato debe terminar en @c.us
        const chatId = `${formattedPhone}@c.us`;

        const response = await client.sendMessage(chatId, message);
        console.log(`Mensaje enviado a ${formattedPhone}: ${message.substring(0, 30)}...`);
        
        res.json({ success: true, messageId: response.id.id });
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Servidor API local de WhatsApp corriendo en http://localhost:${PORT}`);
});
