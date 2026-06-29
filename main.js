// Кнопка и блок инструкции для Mac
const macHelpBtn = document.getElementById('mac-help-btn');
const macHelpBlock = document.getElementById('mac-help-block');

macHelpBtn.addEventListener('click', () => {
    // Переключаем класс hidden: если блок скрыт — покажем, если открыт — скроем
    macHelpBlock.classList.toggle('hidden');
    
    if (macHelpBlock.classList.contains('hidden')) {
        macHelpBtn.innerText = "❓ ИНСТРУКЦИЯ ДЛЯ MAC";
    } else {
        macHelpBtn.innerText = "❌ ЗАКРЫТЬ ИНСТРУКЦИЮ";
    }
});

// Переключатели экранов
const lobbyScreen = document.getElementById('lobby-screen');
const workScreen = document.getElementById('work-screen');

// Элементы управления звуком
const startBtn = document.getElementById('start-btn');
const cutoffSlider = document.getElementById('cutoff-slider');
const cutoffValue = document.getElementById('cutoff-value');

// Элементы сети
const networkStatus = document.getElementById('network-status');
const friendIpInput = document.getElementById('friend-ip');
const connectBtn = document.getElementById('connect-btn');
const hostBtn = document.getElementById('host-btn');

let audioCtx = null;
let osc = null;
let filter = null;
let isConnected = false;

// =========================================================================
// ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ЭКРАНОВ И ПОДКЛЮЧЕНИЯ
// =========================================================================

// Вариант А: Если мы подключаемся к другу
connectBtn.addEventListener('click', () => {
    const ip = friendIpInput.value.trim();
    if (!ip) {
        alert("Сначала введи IP друга из Радмин VPN!");
        return;
    }
    
    isConnected = true;
    // Перекидываем в рабочее поле
    lobbyScreen.classList.add('hidden');
    workScreen.classList.remove('work-screen', 'hidden');
    
    networkStatus.innerText = `СЕТЬ: ПОДКЛЮЧЕНО К ХОСТУ ${ip}. ВКЛЮЧАЙ ЗВУК!`;
    networkStatus.style.color = "#00ffcc";
    
    sendFilterToFriend(cutoffSlider.value);
});

// Вариант Б: Если мы сами создаем сессию (ждем коннекта, шлем себе на localhost)
hostBtn.addEventListener('click', () => {
    // Автоматически подставляем локальный IP для теста или самоопроса
    friendIpInput.value = "127.0.0.1";
    isConnected = true;
    
    // Перекидываем в рабочее поле
    lobbyScreen.classList.add('hidden');
    workScreen.classList.remove('work-screen', 'hidden');
    
    networkStatus.innerText = `СЕТЬ: РЕЖИМ СВОЕЙ СЕССИИ (ЖДЕМ ДРУГА)`;
    networkStatus.style.color = "#ff00ff";
    
    sendFilterToFriend(cutoffSlider.value);
});

// =========================================================================
// БЛОК 1: АУДИО-ЯДРО (СИНТЕЗАТОР)
// =========================================================================
startBtn.addEventListener('click', () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        osc = audioCtx.createOscillator();
        osc.type = 'sawtooth'; 
        osc.frequency.setValueAtTime(110, audioCtx.currentTime); // Суб-бас Ля

        filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; 
        filter.frequency.setValueAtTime(cutoffSlider.value, audioCtx.currentTime);

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime); 

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start();

        console.log("Звуковое ядро запущено!");
        startBtn.innerText = "СИНТ АКТИВЕН";
        startBtn.style.color = "#00ffcc";
        startBtn.style.borderColor = "#00ffcc";
    }
});

// Кручение ручки фильтра
cutoffSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    cutoffValue.innerText = `${value} Hz`;
    
    if (filter && audioCtx) {
        filter.frequency.setValueAtTime(value, audioCtx.currentTime);
    }
    sendFilterToFriend(value);
});

// =========================================================================
// БЛОК 2: СЕТЕВОЙ ШЛЮЗ (HTTP POST ДРУГУ)
// =========================================================================
async function sendFilterToFriend(cutoffVal) {
    const ip = friendIpInput.value.trim();
    if (!isConnected || !ip) return;

    try {
        await fetch(`http://${ip}:5500/sync`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                type: 'SYNTH_CUTOFF',
                value: Number(cutoffVal),
                timestamp: Date.now() 
            })
        });
    } catch (err) {
        networkStatus.innerText = "СЕТЬ: ПОТЕРЯ СВЯЗИ С СЕРВЕРОМ ДРУГА!";
        networkStatus.style.color = "#ff0000";
    }
}

// =========================================================================
// БЛОК 3: СОБЫТИЙНЫЙ ПРИЕМ (WEBSOCKET СВОЕГО СЕРВЕРА)
// =========================================================================
const ws = new WebSocket('ws://127.0.0.1:5500');
let lastReceivedTimestamp = 0;

ws.onopen = () => {
    console.log("[WS] Локальный мост активен.");
};

ws.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'SYNTH_CUTOFF' && data.timestamp > lastReceivedTimestamp) {
            lastReceivedTimestamp = data.timestamp;
            const incomingValue = data.value;
            
            cutoffSlider.value = incomingValue;
            cutoffValue.innerText = `${incomingValue} Hz`;
            
            if (filter && audioCtx) {
                filter.frequency.setValueAtTime(incomingValue, audioCtx.currentTime);
            }
        }
    } catch (e) {}
};

ws.onerror = () => {};
ws.onclose = () => {
    console.log("[WS] Локальный мост закрыт.");
};