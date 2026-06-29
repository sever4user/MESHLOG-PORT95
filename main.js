// =========================================================================
// БЛОК 1: АУДИО-ЯДРО (СИНТЕЗАТОР С ФИЛЬТРОМ)
// =========================================================================
const startBtn = document.getElementById('start-btn');
const cutoffSlider = document.getElementById('cutoff-slider');
const cutoffValue = document.getElementById('cutoff-value');

let audioCtx = null;
let osc = null;
let filter = null;

startBtn.addEventListener('click', () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // 1. Создаем осциллятор (генератор жесткой пилы в стиле синти-вейв)
        osc = audioCtx.createOscillator();
        osc.type = 'sawtooth'; 
        osc.frequency.setValueAtTime(110, audioCtx.currentTime); // Нота Ля суб-баса (110 Гц)

        // 2. Создаем аналоговый низкочастотный фильтр
        filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; 
        filter.frequency.setValueAtTime(cutoffSlider.value, audioCtx.currentTime);

        // 3. Узел громкости для защиты ушей
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime); 

        // Соединяем цепь: Осциллятор -> Фильтр -> Громкость -> Колонки
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start();

        console.log("Звуковое ядро и фильтр успешно запущены!");
        startBtn.innerText = "СИНТ АКТИВЕН";
        startBtn.style.color = "#ff00ff";
        startBtn.style.borderColor = "#ff00ff";
    }
});

// Локальное кручение ручки фильтра мышью
cutoffSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    cutoffValue.innerText = `${value} Hz`;
    
    // Если звук запущен — мгновенно меняем частоту фильтра у себя
    if (filter && audioCtx) {
        filter.frequency.setValueAtTime(value, audioCtx.currentTime);
    }

    // И пулей отправляем это действие другу в сеть Радмина
    sendFilterToFriend(value);
});


// =========================================================================
// БЛОК 2: СЕТЕВОЙ ШЛЮЗ РАДМИН VPN (ОТПРАВКА ДАННЫХ)
// =========================================================================
const networkStatus = document.getElementById('network-status');
const friendIpInput = document.getElementById('friend-ip');
const connectBtn = document.getElementById('connect-btn');

let isConnected = false;

connectBtn.addEventListener('click', () => {
    const ip = friendIpInput.value.trim();
    if (!ip) return alert("Сначала введи IP хоста из Радмин VPN!");
    
    isConnected = true;
    networkStatus.innerText = `СЕТЬ: ПОДКЛЮЧЕНО К ${ip}. СИНХРОНИЗАЦИЯ НАЧАТА!`;
    networkStatus.style.color = "#00ffcc";
    
    // Отправляем стартовый пакет для калибровки
    sendFilterToFriend(cutoffSlider.value);
});

// Функция, которая пушит текущие координаты ручки на Go-сервер твоего друга
async function sendFilterToFriend(cutoffVal) {
    const ip = friendIpInput.value.trim();
    if (!isConnected || !ip) return; // Если коннект не нажат — сеть не спамим

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
// БЛОК 3: СОБЫТИЙНЫЙ ПРИЕМ (НА ТИХИХ WEBSOCKET-СОКЕТАХ)
// =========================================================================
const ws = new WebSocket('ws://127.0.0.1:5500');
let lastReceivedTimestamp = 0;

ws.onopen = () => {
    console.log("[WS] Локальный мост активен. Готов принимать крутилки от друга!");
};

// Вызывается ТОЛЬКО тогда, когда от друга реально прилетел пакет. CPU отдыхает!
ws.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        
        // Проверяем тип пакета и актуальность метки времени
        if (data.type === 'SYNTH_CUTOFF' && data.timestamp > lastReceivedTimestamp) {
            lastReceivedTimestamp = data.timestamp;
            const incomingValue = data.value;
            
            // 1. Двигаем ползунок на экране хоста
            cutoffSlider.value = incomingValue;
            cutoffValue.innerText = `${incomingValue} Hz`;
            
            // 2. Крутим частоту фильтра в звуковом движке хоста
            if (filter && audioCtx) {
                filter.frequency.setValueAtTime(incomingValue, audioCtx.currentTime);
            }
        }
    } catch (e) {
        // Ошибки парсинга битых пакетов не ломают нам джем
    }
};

ws.onerror = () => {
    // Тихо глушим ошибку, если пользователь открыл сайт, но еще не запустил .exe
};

ws.onclose = () => {
    console.log("[WS] Сетевой мост закрыт. Перезапусти сервер, если это произошло случайно.");
};