// core.js
class MeshLogProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.phase = 0;
    }

    // Этот метод вызывается браузером 44100 раз в секунду
    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const channel = output[0]; // Левый канал

        for (let i = 0; i < channel.length; i++) {
            // Панковская генерация синусоиды на лету через чистую математику
            // 440 Гц / 44100 (частота дискретизации)
            this.phase += 2 * Math.PI * 440 / sampleRate;
            
            // Записываем амплитуду прямо в аудио-буфер процессора
            channel[i] = Math.sin(this.phase) * 0.1; // 0.1 — это громкость
        }

        return true; // Говорим воркленту работать бесконечно
    }
}

// Регистрируем наш кастомный аудио-узел в системе
registerProcessor('meshlog-core-processor', MeshLogProcessor);