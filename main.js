// main.js
const startBtn = document.getElementById('start-btn');

startBtn.addEventListener('click', async () => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }

    try {
        // 1. Загружаем наш изолированный аудио-скрипт в ворклет
        await audioCtx.audioWorklet.addModule('core.js');
        
        // 2. Создаем узел на основе нашего процессора
        const meshLogNode = new AudioWorkletNode(audioCtx, 'meshlog-core-processor');
        
        // 3. Подключаем виртуальный кабель к выходу колонок
        meshLogNode.connect(audioCtx.destination);
        
        startBtn.innerText = "ИЗОЛИРОВАННОЕ ЯДРО АКТИВНО (WASM ПОТОК)";
        startBtn.style.borderColor = "#00ffcc";
        startBtn.style.color = "#00ffcc";
        startBtn.style.boxShadow = "0 0 20px #00ffcc";

    } catch (e) {
        console.error("Ошибка инициализации ядра:", e);
        startBtn.innerText = "СБОЙ ИНИЦИАЛИЗАЦИИ";
    }
});

// --- СЕТЕВОЙ БЛОК PeerJS ---
function initP2P() {
    const statusDiv = document.getElementById('network-status');
    
    statusDiv.innerText = "СЕТЬ: ПОДКЛЮЧЕНИЕ К СИСТЕМЕ...";
    // main.js — БРОНЕБОЙНЫЙ P2P КОНФИГ БЕЗ CORS
    const peer = new Peer(undefined, {
        host: 'glitch-peer-server.glitch.me', // Полностью независимый открытый сервер
        port: 443,
        secure: true,
        path: '/'
    });

    // Когда сеть успешно выдаст нам личный ID комнаты
    peer.on('open', (id) => {
        console.log('Мой P2P ID:', id);
        statusDiv.innerText = `СЕТЬ АКТИВНА // ID КОМНАТЫ: ${id}`;
        statusDiv.style.color = "#00ffcc";
        statusDiv.style.textShadow = "0 0 5px #00ffcc";
    });

    // Ловим входящие подключения (когда друг решит подключиться к твоему ID)
    peer.on('connection', (conn) => {
        statusDiv.innerText = "СЕТЬ: ОБНАРУЖЕН НАПАРНИК! СИНХРОНИЗАЦИЯ...";
        
        conn.on('data', (data) => {
            console.log('Получены панк-данные от друга:', data);
            // Сюда завтра полетят изменения ручек и нот!
        });
    });
}

// Запускаем сеть автоматически при старте страницы
initP2P();
