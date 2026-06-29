const lobbyScreen = document.getElementById('lobby-screen');
const workScreen = document.getElementById('work-screen');
const startBtn = document.getElementById('start-btn');
const networkStatus = document.getElementById('network-status');
const friendIpInput = document.getElementById('friend-ip');
const connectBtn = document.getElementById('connect-btn');
const hostBtn = document.getElementById('host-btn');

// Кнопка и блок инструкции для Mac
const macHelpBtn = document.getElementById('mac-help-btn');
const macHelpBlock = document.getElementById('mac-help-block');

// Графическое ядро холста
const canvas = document.getElementById('cyber-canvas');
const ctx = canvas.getContext('2d');

let audioCtx = null;
let osc = null;
let filter = null;
let ws = null;

// Настройки бесконечной камеры
let camera = { x: 0, y: 0, isDragging: false, startX: 0, startY: 0 };

// Структура данных для Нод (пока создаем одну базовую ноду нашего фильтра)
let nodes = [
    {
        id: "node_synth_1",
        title: "#BASS_CORE",
        x: 100,
        y: 100,
        width: 180,
        height: 110,
        paramName: "CUTOFF",
        value: 1000,
        min: 40,
        max: 4000
    }
];

let activeNode = null; // Для отслеживания кручения параметров

// Подгонка холста под размеры экрана
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// =========================================================================
// ГРАФИЧЕСКИЙ ДВИЖОК РЕНДЕРИНГА (ШАГ 4)
// =========================================================================
function renderLoop() {
    // 1. Очищаем экран (абсолютно черный фон)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. РЕНДЕР ПИКСЕЛЬНОЙ СЕТКИ С УЧЕТОМ КАМЕРЫ
    ctx.strokeStyle = '#002211'; // Сверх-бледный неоновый зеленый для сетки
    ctx.lineWidth = 1;
    const gridSize = 40;
    
    // Магия бесконечного сдвига сетки
    const offsetX = camera.x % gridSize;
    const offsetY = camera.y % gridSize;

    for (let x = offsetX; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = offsetY; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // 3. РЕНДЕР НОД С ОПТИМИЗАЦИЕЙ (FRUSTUM CULLING)
    nodes.forEach(node => {
        // Переводим локальные координаты ноды в глобальные экранные координаты
        const screenX = node.x + camera.x;
        const screenY = node.y + camera.y;

        // КРИТИЧЕСКАЯ ОПТИМИЗАЦИЯ: проверяем, попадает ли нода в поле видимости монитора
        if (screenX + node.width < 0 || screenX > canvas.width ||
            screenY + node.height < 0 || screenY > canvas.height) {
            return; // Нода за экраном! Игнорируем рендер, спасаем GPU/CPU из 2012 года
        }

        // Отрисовка плоской неоновой рамки ноды
        ctx.fillStyle = '#001105';
        ctx.fillRect(screenX, screenY, node.width, node.height);
        
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, node.width, node.height);

        // Пиксельный заголовок ноды
        ctx.fillStyle = '#00ffcc';
        ctx.font = '10px monospace';
        ctx.fillText(node.title, screenX + 10, screenY + 20);

        // Линия-разделитель
        ctx.strokeStyle = '#003311';
        ctx.beginPath(); ctx.moveTo(screenX, screenY + 30); ctx.lineTo(screenX + node.width, screenY + 30); ctx.stroke();

        // Отрисовка параметра внутри ноды
        ctx.fillStyle = '#ff00ff'; // Пурпурный акцент для параметров
        ctx.fillText(`${node.paramName}:`, screenX + 10, screenY + 55);
        ctx.font = '14px monospace';
        ctx.fillText(`${node.value} Hz`, screenX + 10, screenY + 75);

        // Индикатор "загруженности" параметра (полоска внизу ноды)
        const pct = (node.value - node.min) / (node.max - node.min);
        ctx.fillStyle = '#003311';
        ctx.fillRect(screenX + 10, screenY + 90, node.width - 20, 6);
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(screenX + 10, screenY + 90, (node.width - 20) * pct, 6);
    });

    // Бесконечный цикл отрисовки кадров видеокарты
    requestAnimationFrame(renderLoop);
}

// Запускаем графический цикл
requestAnimationFrame(renderLoop);

// =========================================================================
// МЫШИНЫЙ ИНТЕРФЕЙС И НАВИГАЦИЯ НА ХОЛСТЕ
// =========================================================================
canvas.addEventListener('mousedown', (e) => {
    // Проверяем, кликнули ли мы на ноду, чтобы изменить параметр
    let hitNode = null;
    nodes.forEach(node => {
        const screenX = node.x + camera.x;
        const screenY = node.y + camera.y;
        if (e.clientX >= screenX && e.clientX <= screenX + node.width &&
            e.clientY >= screenY && e.clientY <= screenY + node.height) {
            hitNode = node;
        }
    });

    if (hitNode) {
        activeNode = hitNode;
        modifyNodeValue(e);
    } else {
        // Если кликнули в пустоту — включаем перетаскивание холста (камеры)
        camera.isDragging = true;
        camera.startX = e.clientX - camera.x;
        camera.startY = e.clientY - camera.y;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (camera.isDragging) {
        // Двигаем бесконечную камеру
        camera.x = e.clientX - camera.startX;
        camera.y = e.clientY - camera.startY;
    } else if (activeNode) {
        // Если зажали ноду — меняем параметр движением мыши по горизонтали
        modifyNodeValue(e);
    }
});

window.addEventListener('mouseup', () => {
    camera.isDragging = false;
    activeNode = null;
});

// Математика изменения параметра внутри ноды кликом/драгом
function modifyNodeValue(e) {
    if (!activeNode) return;
    const screenX = activeNode.x + camera.x;
    // Считаем, в какое место полоски кликнули
    const clickX = e.clientX - (screenX + 10);
    const width = activeNode.width - 20;
    let pct = clickX / width;
    if (pct < 0) pct = 0;
    if (pct > 1) pct = 1;

    // Рассчитываем логарифмическое или линейное значение частоты
    const rawVal = activeNode.min + (activeNode.max - activeNode.min) * pct;
    activeNode.value = Math.round(rawVal);

    // Мгновенно крутим наш звуковой фильтр
    if (filter && audioCtx) {
        filter.frequency.setValueAtTime(activeNode.value, audioCtx.currentTime);
    }

    // И пуляем изменение в WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 
            type: 'SYNTH_CUTOFF',
            value: Number(activeNode.value)
        }));
    }
}

// =========================================================================
// ЛОГИКА ЭКРАНОВ
// =========================================================================
macHelpBtn.addEventListener('click', () => {
    // Переключаем класс hidden: если блок скрыт — покажем, если открыт — скроем
    macHelpBlock.classList.toggle('hidden');
    
    if (macHelpBlock.classList.contains('hidden')) {
        macHelpBtn.innerText = "❓ ИНСТРУКЦИЯ ДЛЯ MAC";
    } else {
        macHelpBtn.innerText = "❌ ЗАКРЫТЬ ИНСТРУКЦИЮ";
    }
});

// =========================================================================
// СЕТЕВАЯ И АУДИО СИНХРОНИЗАЦИЯ
// =========================================================================
function initWebSocket(ip) {
    ws = new WebSocket(`ws://${ip}:5500`);

    ws.onopen = () => {
        if (ip === "127.0.0.1") {
            networkStatus.innerText = `СЕТЬ: СЕССИЯ СОЗДАНА (EXE РАБОТАЕТ)`;
            networkStatus.style.color = "#ff00ff";
        } else {
            networkStatus.innerText = `СЕТЬ: ПОДКЛЮЧЕНО К ХОСТУ ${ip}!`;
            networkStatus.style.color = "#00ffcc";
        }
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'SYNTH_CUTOFF') {
                // Ловим сетевую крутилку и обновляем параметры ноды на холсте
                const node = nodes.find(n => n.id === "node_synth_1");
                if (node) {
                    node.value = data.value;
                }
                
                if (filter && audioCtx) {
                    filter.frequency.setValueAtTime(data.value, audioCtx.currentTime);
                }
            }
        } catch (e) {}
    };

    ws.onclose = () => { networkStatus.innerText = "СЕТЬ: МОСТ ЗАКРЫТ!"; networkStatus.style.color = "#ff0000"; };
    ws.onerror = () => { networkStatus.innerText = "СЕТЬ: ОШИБКА ПОДКЛЮЧЕНИЯ!"; networkStatus.style.color = "#ff0000"; };
}

connectBtn.addEventListener('click', () => {
    const ip = friendIpInput.value.trim();
    if (!ip) return alert("Введи IP из Радмина!");
    lobbyScreen.classList.add('hidden');
    workScreen.classList.remove('hidden');
    initWebSocket(ip);
});

hostBtn.addEventListener('click', () => {
    lobbyScreen.classList.add('hidden');
    workScreen.classList.remove('hidden');
    initWebSocket("127.0.0.1");
});

// Инициализация звука
startBtn.addEventListener('click', () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        osc = audioCtx.createOscillator();
        osc.type = 'sawtooth'; 
        osc.frequency.setValueAtTime(110, audioCtx.currentTime); 

        filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; 
        // Подтягиваем стартовую частоту из нашей структуры ноды
        filter.frequency.setValueAtTime(nodes[0].value, audioCtx.currentTime);

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime); 

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();

        startBtn.innerText = "ЯДРО АКТИВНО";
        startBtn.style.color = "#00ffcc";
        startBtn.style.borderColor = "#00ffcc";
    }
});