const lobbyScreen = document.getElementById('lobby-screen');
const workScreen = document.getElementById('work-screen');
const startBtn = document.getElementById('start-btn');
const cutoffSlider = document.getElementById('cutoff-slider');
const cutoffValue = document.getElementById('cutoff-value');
const networkStatus = document.getElementById('network-status');
const friendIpInput = document.getElementById('friend-ip');
const connectBtn = document.getElementById('connect-btn');
const hostBtn = document.getElementById('host-btn');

let audioCtx = null;
let osc = null;
let filter = null;
let ws = null; // Наш единый сокет

// =========================================================================
// ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ WEBSOCKET СОЕДИНЕНИЯ
// =========================================================================
function initWebSocket(ip) {
    ws = new WebSocket(`ws://${ip}:5500`);

    ws.onopen = () => {
        console.log(`[WS] Успешное подключение к серверу джема на ${ip}`);
        if (ip === "127.0.0.1") {
            networkStatus.innerText = `СЕТЬ: СЕССИЯ СОЗДАНА. ТВОЙ СЕРВЕР ЖДЕТ ДРУЗЕЙ!`;
            networkStatus.style.color = "#ff00ff";
        } else {
            networkStatus.innerText = `СЕТЬ: УСПЕШНО ПОДКЛЮЧЕНО К ХОСТУ ${ip}!`;
            networkStatus.style.color = "#00ffcc";
        }
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'SYNTH_CUTOFF') {
                // Двигаем интерфейс
                cutoffSlider.value = data.value;
                cutoffValue.innerText = `${data.value} Hz`;
                
                // Меняем звук в реальном времени
                if (filter && audioCtx) {
                    filter.frequency.setValueAtTime(data.value, audioCtx.currentTime);
                }
            }
        } catch (e) {}
    };

    ws.onclose = () => {
        networkStatus.innerText = "СЕТЬ: СОЕДИНЕНИЕ ЗАКРЫТО. ПРОВЕРЬ СЕРВЕР ХОСТА!";
        networkStatus.style.color = "#ff0000";
    };
    
    ws.onerror = () => {
        networkStatus.innerText = "СЕТЬ: ОШИБКА ПОДКЛЮЧЕНИЯ К СЕРВЕРУ!";
        networkStatus.style.color = "#ff0000";
    };
}

// =========================================================================
// ЛОГИКА ЭКРАНОВ
// =========================================================================

// Вариант А: Ты подключаешься к другу (сервер запущен У НЕГО)
connectBtn.addEventListener('click', () => {
    const ip = friendIpInput.value.trim();
    if (!ip) return alert("Введи IP хоста из Радмин VPN!");
    
    lobbyScreen.classList.add('hidden');
    workScreen.classList.remove('hidden');
    
    // Подключаемся к удаленному серверу друга
    initWebSocket(ip);
});

// Вариант Б: Ты сам хост (сервер запущен У ТЕБЯ)
hostBtn.addEventListener('click', () => {
    lobbyScreen.classList.add('hidden');
    workScreen.classList.remove('hidden');
    
    // Подключаемся к своему локальному серверу
    initWebSocket("127.0.0.1");
});

// =========================================================================
// АУДИО-ЯДРО И ОТПРАВКА ДАННЫХ В СОКЕТ
// =========================================================================
startBtn.addEventListener('click', () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        osc = audioCtx.createOscillator();
        osc.type = 'sawtooth'; 
        osc.frequency.setValueAtTime(110, audioCtx.currentTime); 

        filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; 
        filter.frequency.setValueAtTime(cutoffSlider.value, audioCtx.currentTime);

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime); 

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();

        startBtn.innerText = "СИНТ АКТИВЕН";
        startBtn.style.color = "#00ffcc";
        startBtn.style.borderColor = "#00ffcc";
    }
});

// Когда крутишь ручку — данные мгновенно улетают в WebSocket
cutoffSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    cutoffValue.innerText = `${value} Hz`;
    
    if (filter && audioCtx) {
        filter.frequency.setValueAtTime(value, audioCtx.currentTime);
    }

    // Если сокет открыт — пушим JSON прямо туда
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 
            type: 'SYNTH_CUTOFF',
            value: Number(value)
        }));
    }
});