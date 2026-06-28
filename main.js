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

// --- ТВОЙ КОД ЗВУКА СВЕРХУ ОСТАЕТСЯ БЕЗ ИЗМЕНЕНИЙ ---

// --- НОВЫЙ СЕТЕВОЙ БЛОК ДЛЯ РАДМИНА ---
const networkStatus = document.getElementById('network-status');
const friendIpInput = document.getElementById('friend-ip');
const connectBtn = document.getElementById('connect-btn');

connectBtn.addEventListener('click', async () => {
    const ip = friendIpInput.value.trim();
    if (!ip) return alert("Сначала введи IP хоста из Радмин VPN!");

    networkStatus.innerText = `СЕТЬ: СВЯЗЬ С ХОСТОМ ${ip}...`;

    // Тестовый пакет данных (завтра сюда привяжем ручки синтезатора)
    const testData = { note: "E4", cutoff: 920, timestamp: Date.now() };

    try {
        const response = await fetch(`http://${ip}:5500/sync`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });

        if (response.ok) {
            networkStatus.innerText = "СЕТЬ: УСПЕШНО СИНХРОНИЗИРОВАНО С ХОСТОМ!";
            networkStatus.style.color = "#00ffcc";
            networkStatus.style.textShadow = "0 0 5px #00ffcc";
        }
    } catch (err) {
        console.error(err);
        networkStatus.innerText = "СЕТЬ: ОШИБКА ПОДКЛЮЧЕНИЯ. ПРОВЕРЬ РАДМИН И СЕРВЕР!";
        networkStatus.style.color = "#ff0000";
    }
});

// Запускаем сеть автоматически при старте страницы
initP2P();