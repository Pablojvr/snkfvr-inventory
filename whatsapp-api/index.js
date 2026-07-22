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
        let formattedPhone = phone.replace(/\+/g, '');

        // Obtener el ID del número válido desde WhatsApp para evitar 'Lid is missing in chat table'
        const contactId = await client.getNumberId(formattedPhone);
        if (!contactId) {
            console.error(`El número ${formattedPhone} no está registrado en WhatsApp`);
            return res.status(404).json({ success: false, error: 'Número no registrado en WhatsApp.' });
        }

        const chatId = contactId._serialized;
        const response = await client.sendMessage(chatId, message);
        console.log(`Mensaje enviado a ${formattedPhone}: ${message.substring(0, 30)}...`);
        
        // Evitamos buscar response.id.id porque a veces el cliente retorna un objeto diferente o undefined
        res.json({ success: true, messageId: response?.id?._serialized || 'ok' });
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Servidor API local de WhatsApp corriendo en http://localhost:${PORT}`);
});
