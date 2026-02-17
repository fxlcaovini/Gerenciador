document.addEventListener('DOMContentLoaded', () => {
    let currentSessionId = '';
    let allUsers = [];
    let isProcessing = false;
    const MAX_USERS_PER_PAGE = 100;

    const logElement = document.getElementById('log');
    const progressBar = document.getElementById('progressBar');
    const loadBtn = document.getElementById('loadBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const uploadZipBtn = document.getElementById('uploadZipBtn');
    const zipInput = document.getElementById('zipInput');
    const testBtn = document.getElementById('testBtn');
    const supportLoginScreen = document.getElementById('supportLoginScreen');
    const mainApp = document.getElementById('mainApp');
    const btnSupportLogin = document.getElementById('btnSupportLogin');

    btnSupportLogin.addEventListener('click', async () => {
        const user = document.getElementById('supportUser').value;
        const pass = document.getElementById('supportPass').value;
        const errorDiv = document.getElementById('supportError');

        try {
            const res = await fetch('/api/support/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user, pass })
            });
            const data = await res.json();

            if (data.success) {
                supportLoginScreen.style.display = 'none'; 
                mainApp.style.display = 'block';           
                log("Acesso ao suporte autorizado.", "success");
            } else {
                errorDiv.innerText = data.message;
            }
        } catch (e) {
            errorDiv.innerText = "Erro ao conectar com o servidor local.";
        }
    });

    // --- FUNÇÕES AUXILIARES ---
    function log(message, type = 'info') {
        const item = document.createElement('div');
        item.innerText = `[${new Date().toLocaleTimeString()}] ${message}`;
        item.className = `log-${type}`;
        logElement.appendChild(item);
        logElement.scrollTop = logElement.scrollHeight;
    }

    function updateUI(processing, progress = 0) {
        isProcessing = processing;
        const hasSession = !!currentSessionId;
        
        loadBtn.disabled = processing || !hasSession;
        deleteBtn.disabled = processing || !hasSession || allUsers.length === 0;
        uploadZipBtn.disabled = processing || !hasSession;
        testBtn.disabled = processing;

        progressBar.style.width = `${progress}%`;
    }

    // 1. LOGIN NO RELÓGIO
    testBtn.addEventListener('click', async () => {
        const ip = document.getElementById('ip').value;
        const port = document.getElementById('port').value;
        const loginVal = document.getElementById('login').value;
        const password = document.getElementById('password').value;

        if (!ip) return log('Digite o IP.', 'error');

        updateUI(true);
        log(`Conectando em ${ip}:${port}...`);

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip, port, login: loginVal, password })
            });
            const data = await res.json();

            if (data.success) {
                currentSessionId = data.sessionId;
                log('Conectado com sucesso!', 'success');
            } else {
                log(`Erro Login: ${data.message}`, 'error');
            }
        } catch (e) {
            log('Erro de conexão com o servidor local.', 'error');
        } finally {
            updateUI(false);
        }
    });

    // 2. CARREGAR USUÁRIOS
    loadBtn.addEventListener('click', async () => {
        updateUI(true);
        log('Iniciando listagem...');
        allUsers = [];
        const ip = document.getElementById('ip').value;
        const port = document.getElementById('port').value;
        
        let offset = 0;
        let keepLoading = true;

        while (keepLoading) {
            try {
                const res = await fetch('/api/list_users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ip, port, sessionId: currentSessionId, limit: MAX_USERS_PER_PAGE, offset })
                });
                const data = await res.json();

                if (!data.success) {
                    log(`Erro ao listar: ${data.message}`, 'error');
                    break;
                }

                const users = data.users || [];
                if (users.length === 0) break;

                const ids = users.map(u => u.pis || u.cpf || u.id).filter(id => id);
                allUsers.push(...ids);
                
                offset += MAX_USERS_PER_PAGE;
                log(`Carregados ${allUsers.length} usuários...`);
                
                if (users.length < MAX_USERS_PER_PAGE) keepLoading = false;

            } catch (e) {
                log('Erro de comunicação.', 'error');
                break;
            }
        }
        
        log(`Total encontrado: ${allUsers.length} colaboradores.`, 'success');
        updateUI(false, 100);
    });

    // 3. EXCLUIR EM MASSA
    deleteBtn.addEventListener('click', async () => {
        if (!confirm(`TEM CERTEZA? Isso excluirá ${allUsers.length} usuários.`)) return;

        updateUI(true);
        const ip = document.getElementById('ip').value;
        const port = document.getElementById('port').value;
        const BATCH_SIZE = 500;

        for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
            const batch = allUsers.slice(i, i + BATCH_SIZE);
            log(`Excluindo lote ${i} a ${i + batch.length}...`);

            try {
                await fetch('/api/remove_users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ip, port, sessionId: currentSessionId, idList: batch })
                });
                updateUI(true, (i / allUsers.length) * 100);
            } catch (e) {
                log(`Erro no lote iniciando em ${i}`, 'error');
            }
        }

        log('Processo de exclusão finalizado.', 'success');
        allUsers = [];
        updateUI(false, 100);
    });

    // 4. UPLOAD ZIP
    uploadZipBtn.addEventListener('click', async () => {
        const file = zipInput.files[0];
        if (!file) return log('Selecione um arquivo ZIP.', 'error');

        updateUI(true, 10);
        log(`Enviando ZIP (${(file.size/1024).toFixed(1)} KB)...`);

        const ip = document.getElementById('ip').value;
        const port = document.getElementById('port').value;

        const formData = new FormData();
        formData.append('zipFile', file);
        formData.append('ip', ip);
        formData.append('port', port);
        formData.append('sessionId', currentSessionId);

        try {
            const res = await fetch('/api/upload_zip', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                log(`Processo Finalizado!`, 'success');
                log(` Enviados: ${data.stats.sent} | Falhas: ${data.stats.failed}`, 'info');
            } else {
                log(`Erro servidor: ${data.message}`, 'error');
            }
        } catch (e) {
            log('Erro ao enviar arquivo.', 'error');
        } finally {
            updateUI(false, 100);
            zipInput.value = '';
        }
    });

    updateUI(false);
});