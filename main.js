// =========================================================================
// БЛОК 1: АУДИО-ЯДРО СИНТЕЗАТОРА
// =========================================================================
const startBtn = document.getElementById('start-btn');
let audioCtx = null;

startBtn.addEventListener('click', () => {
    // Инициализируем аудиоконтекст только после клика пользователя (требование браузеров)
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        console.log("Звуковое ядро успешно запущено!");
        startBtn.innerText = "ЗВУКОВОЕ ЯДРО АКТИВНО";
        startBtn.style.borderColor = "#ff00ff";
        startBtn.style.boxShadow = "0 0 10px #ff00ff";
        startBtn.style.color = "#ff00ff";
        
        // Тестовый писк, чтобы убедиться, что звук работает
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Делаем негромко
        osc.start();
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5); // Затухание за 0.5 сек
    }
});

// =========================================================================
// БЛОК 2: СЕТЕВОЙ ШЛЮЗ РАДМИН VPN
// =========================================================================
const networkStatus = document.getElementById('network-status');
const friendIpInput = document.getElementById('friend-ip');
const connectBtn = document.getElementById('connect-btn');

connectBtn.addEventListener('click', async () => {
    const ip = friendIpInput.value.trim();
    
    // Проверка, что поле ввода не пустое
    if (!ip) {
        alert("Сначала введи IP хоста из Радмин VPN!");
        return;
    }

    networkStatus.innerText = `СЕТЬ: СВЯЗЬ С ХОСТОМ ${ip}...`;
    networkStatus.style.color = "#ff00ff";

    // Пакет тестовых данных, который улетит в exe-сервер
    const testData = { 
        note: "E4", 
        cutoff: 920, 
        timestamp: Date.now() 
    };

    try {
        // Отправляем POST запрос прямо на локальный порт 5500 по IP Радмина
        const response = await fetch(`http://${ip}:5500/sync`, {
            method: 'POST',
            mode: 'cors',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(testData)
        });

        if (response.ok) {
            networkStatus.innerText = "СЕТЬ: УСПЕШНО СИНХРОНИЗИРОВАНО С ХОСТОМ!";
            networkStatus.style.color = "#00ffcc";
            networkStatus.style.textShadow = "0 0 5px #00ffcc";
        } else {
            throw new Error("Сервер вернул ошибку");
        }
    } catch (err) {
        console.error("Ошибка сети:", err);
        networkStatus.innerText = "СЕТЬ: ОШИБКА ПОДКЛЮЧЕНИЯ. ПРОВЕРЬ РАДМИН И СЕРВЕР!";
        networkStatus.style.color = "#ff0000";
        networkStatus.style.textShadow = "0 0 5px #ff0000";
    }
});
