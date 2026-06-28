// =========================================================================
// БЛОК 1: АУДИО-ЯДРО (СИНТЕЗАТОР С ФИЛЬТРОМ)
// =========================================================================
const startBtn = document.getElementById('start-btn');
const cutoffSlider = document.getElementById('cutoff-slider');
const cutoffValue = document.getElementById('cutoff-value');

let audioCtx = null;
let osc = null;
let filter = null; // Наш будущий аналоговый фильтр

startBtn.addEventListener('click', () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // 1. Создаем осциллятор (генератор жесткой пилы, как в старых синтах)
        osc = audioCtx.createOscillator();
        osc.type = 'sawtooth'; 
        osc.frequency.setValueAtTime(110, audioCtx.currentTime); // Нота Ля суб-баса (110 Гц)

        // 2. Создаем фильтр
        filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; // Пропускает низкие, режет высокие частоты
        filter.frequency.setValueAtTime(cutoffSlider.value, audioCtx.currentTime);

        // 3. Узел громкости
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime); // Не врубаем на полную, бережем уши

        // Соединяем цепь: Осциллятор -> Фильтр -> Громкость -> Колонки
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start();

        console.log("Звуковое ядро и фильтр запущены!");
        startBtn.innerText = "СИНТ РАБОТАЕТ";
        startBtn.style.color = "#ff00ff";
        startBtn.style.borderColor = "#ff00ff";
    }
});

// Слушаем кручение ручки фильтра локально
cutoffSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    cutoffValue.innerText = `${value} Hz`;
    
    // Если звук запущен — меняем частоту фильтра прямо сейчас
    if (filter && audioCtx) {
        filter.frequency.setValueAtTime(value, audioCtx.currentTime);
    }

    // МГНОВЕННО ШЛЕМ ЭТО ДРУГУ В СЕТЬ!
    sendFilterToFriend(value);
});


// =========================================================================
// БЛОК 2: СЕТЕВОЙ ШЛЮЗ РАДМИН VPN (ОТПРАВКА ДАННЫХ РУЧКИ)
// =========================================================================
const networkStatus = document.getElementById('network-status');
const friendIpInput = document.getElementById('friend-ip');
const connectBtn = document.getElementById('connect-btn');

let isConnected = false;

// Кнопка проверки связи
connectBtn.addEventListener('click', () => {
    const ip = friendIpInput.value.trim();
    if (!ip) return alert("Введи IP!");
    
    isConnected = true;
    networkStatus.innerText = `СЕТЬ: ПОДКЛЮЧЕНО К ХОСТУ ${ip}. КРУТИ РУЧКУ!`;
    networkStatus.style.color = "#00ffcc";
    
    // Делаем тестовый пинг
    sendFilterToFriend(cutoffSlider.value);
});

// Функция, которая отправляет текущую частоту фильтра другу
async function sendFilterToFriend(cutoffVal) {
    const ip = friendIpInput.value.trim();
    if (!isConnected || !ip) return; // Если не нажали кнопку коннекта, в сеть не спамим

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
        // Чтобы не засорять консоль ошибками при быстром скролле, пишем в статус
        networkStatus.innerText = "СЕТЬ: ПОТЕРЯ СВЯЗИ С СЕРВЕРОМ ДРУГА!";
        networkStatus.style.color = "#ff0000";
    }
});

// =========================================================================
// БЛОК 3: АВТО-ПРИЕМ ДАННЫХ (ПОСТОЯННЫЙ ОПРОС СВОЕГО СЕРВЕРА)
// =========================================================================
let lastReceivedTimestamp = 0;

async function checkIncomingData() {
    // Опрашиваем НАШ СОБСТВЕННЫЙ сервер (localhost), чтобы узнать, не прислал ли что-то друг
    try {
        const response = await fetch(`http://127.0.0.1:5500/fetch-sync`);
        if (response.ok) {
            const data = await response.json();
            
            // Если прилетели НОВЫЕ данные (проверяем по времени timestamp)
            if (data && data.timestamp > lastReceivedTimestamp) {
                lastReceivedTimestamp = data.timestamp;

                if (data.type === 'SYNTH_CUTOFF') {
                    const incomingValue = data.value;
                    
                    // 1. Двигаем ползунок на экране хоста
                    cutoffSlider.value = incomingValue;
                    cutoffValue.innerText = `${incomingValue} Hz`;
                    
                    // 2. Меняем звук в реальном времени на ноуте хоста!
                    if (filter && audioCtx) {
                        filter.frequency.setValueAtTime(incomingValue, audioCtx.currentTime);
                    }
                }
            }
        }
    } catch (err) {
        // Если сервер еще не запущен, просто молчим, чтобы не спамить в консоль
    }
}

// Запускаем бесконечный цикл опроса: каждые 50 миллисекунд
setInterval(checkIncomingData, 50);




