const express = require('express');
const axios = require('axios');
const https = require('https');
const path = require('path');
const multer = require('multer');
const AdmZip = require('adm-zip');
const open = require('open');
const Jimp = require('jimp');
const SUPPORT_USER = "suporte";
const SUPPORT_PASS = "ControliD$up2026!";
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(__dirname));

// ROTA DE LOGIN DO SUPORTE
app.post('/api/support/login', (req, res) => {
    const { user, pass } = req.body;
    if (user === SUPPORT_USER && pass === SUPPORT_PASS) {
        return res.json({ success: true, message: "Acesso autorizado" });
    }
    res.status(401).json({ success: false, message: "Usuário ou senha incorretos" });
});

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

function logServer(message) {
    console.log(`[${new Date().toLocaleTimeString()}] SERVER: ${message}`);
}
function logError(error) {
    const errorDetails = error.code ? `CÓDIGO: ${error.code}` : `MENSAGEM: ${error.message}`;
    console.error(`[${new Date().toLocaleTimeString()}] ERRO: ${errorDetails}`);
}

async function smartRequest(method, endpoint, body, ip, port, sessionId = null) {
    const protocols = ['https', 'http']; 
    let lastError = null;

    for (const protocol of protocols) {
        try {
            const finalPort = port || (protocol === 'https' ? '443' : '80');
            const baseUrl = `${protocol}://${ip}:${finalPort}`;
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
            const url = `${baseUrl}/${cleanEndpoint}${sessionId ? `?session=${sessionId}` : ''}`;

            const config = {
                method: method,
                url: url,
                data: body,
                headers: { 'Content-Type': 'application/json' },
                timeout: 8000, 
                insecureHTTPParser: true, 
                httpsAgent: (protocol === 'https' ? httpsAgent : undefined)
            };

            const response = await axios(config);
            return { data: response.data, protocolUsed: protocol };

        } catch (error) {
            if (error.response && error.response.status === 401) throw error;
            lastError = error;
        }
    }
    throw lastError;
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rotas da API
app.post('/api/login', async (req, res) => {
    const { ip, port, login, password } = req.body;
    try {
        const result = await smartRequest('POST', 'login.fcgi', { login, password }, ip, port);
        return res.json({ success: true, sessionId: result.data.session });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Falha na conexão', details: error.message });
    }
});

app.post('/api/list_users', async (req, res) => {
    const { ip, port, sessionId, limit, offset } = req.body; 
    try {
        const result = await smartRequest('POST', 'load_users.fcgi', { limit: limit || 100, offset: offset || 0 }, ip, port, sessionId);
        
        //DEBUG
        if (result.data && result.data.users) {
            logServer(`[DEBUG] load_users.fcgi:`);
            result.data.users.forEach(u => {
                logServer(` Nome: ${u.name || 'Vazio'} | CPF: ${u.pis || 'Vazio'} | Matrícula: ${u.registration || 'Vazio'}`);
            });
        }

        return res.json({ success: true, users: result.data.users, count: result.data.count });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erro ao listar.', details: error.message });
    }
});

app.post('/api/remove_users', async (req, res) => {
    const { ip, port, sessionId, idList } = req.body;
    try {
        const result = await smartRequest('POST', 'remove_users.fcgi', { users: idList }, ip, port, sessionId);
        return res.json({ success: true, details: result.data });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erro ao excluir.', details: error.message });
    }
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/api/upload_zip', upload.single('zipFile'), async (req, res) => {
    const { ip, port, sessionId } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'Sem arquivo ZIP.' });

    try {
        logServer(`[ZIP] Iniciando...`);

        let protocol = 'https';
        try {
            const testRes = await smartRequest('POST', 'login.fcgi', {}, ip, port);
            protocol = testRes.protocolUsed;
        } catch (e) { }

        const finalPort = port || (protocol === 'https' ? '443' : '80');
        const baseUrl = `${protocol}://${ip}:${finalPort}`;

        const zip = new AdmZip(req.file.buffer);
        let successCount = 0;
        let errorCount = 0;

        for (const entry of zip.getEntries()) {
            if (entry.isDirectory || entry.entryName.startsWith('.') || !entry.entryName.match(/\.(jpg|jpeg|png|bmp)$/i)) continue;
            const cpf = path.basename(entry.entryName).split('.')[0].replace(/\D/g, ''); 
            const originalBuffer = entry.getData();

            let imageBase64 = "";

            try {
                const image = await Jimp.read(originalBuffer);
                image.resize(400, Jimp.AUTO).quality(70);
                const compressedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
                imageBase64 = compressedBuffer.toString('base64');
            } catch (imgError) {
                logServer(` [ZIP] Erro no Jimp, enviando original...`);
                imageBase64 = originalBuffer.toString('base64'); 
            }

            try {
                const currentTimestamp = Math.floor(Date.now() / 1000);
                const endpoint = `/user_set_image.fcgi?session=${sessionId}&cpf=${cpf}&mode=671&raw=false&do_match=false&image_timestamp=${currentTimestamp}`;
                const setImageUrl = `${baseUrl}${endpoint}`;
                const payload = JSON.stringify({ image: imageBase64 });

                logServer(`[ZIP] Enviando fotos, por favor aguarde...`);

                await axios.post(setImageUrl, payload, {
                    httpsAgent: (protocol === 'https' ? httpsAgent : undefined),
                    headers: { 
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload) 
                    },
                    insecureHTTPParser: true,
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity
                });
                
                successCount++;
                logServer(`[ZIP] Foto cadastrada com sucesso no CPF  ${cpf}.`);
            } catch (err) { 
                errorCount++; 
                let erroApi = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
                logServer(` [ZIP] ERRO no CPF ${cpf}: ${erroApi}`);
            }
        }
        
        logServer(`[ZIP] FIM. Sucesso: ${successCount} | Erros: ${errorCount}`);
        return res.json({ success: true, stats: { sent: successCount, failed: errorCount, skipped: 0 } });

    } catch (error) {
        logError(error);
        return res.status(500).json({ success: false, message: 'Erro interno.', details: error.message });
    }
});

app.listen(PORT, async () => {
    console.log('--------------------------------------------------');
    console.log(` Servidor Pronto: http://localhost:${PORT}`);
    console.log('--------------------------------------------------');
    await open(`http://localhost:${PORT}`);
});