package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

const Port = ":5500"

// Настройки веб-сокетов (разрешаем подключение с любых адресов, убирая CORS)
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// Пул активных вкладок браузера и мутекс для безопасной работы с потоками
var (
	clients   = make(map[*websocket.Conn]bool)
	clientsMu sync.Mutex
)

func main() {
	// 1. Хэндлер для POST-запросов от друга из Радмина
	http.HandleFunc("/sync", handleSync)

	// 2. Хэндлер для подключения твоего локального main.js по WebSocket
	http.HandleFunc("/", handleWS)

	fmt.Println("===================================================")
	fmt.Println(" MESHLOG GO-CORE v1.2.0 RUNNING ON PORT", Port)
	fmt.Println(" СИСТЕМА УЛЬТРА-ОПТИМИЗИРОВАНА. ВЕС СЕРВЕРА: ~2 МБ")
	fmt.Println("===================================================")

	if err := http.ListenAndServe(Port, nil); err != nil {
		fmt.Println("Ошибка запуска сервера:", err)
	}
}

// Принимаем ЛЮБОЙ JSON от друга и кидаем его в WebSocket браузера
func handleSync(w http.ResponseWriter, r *http.Request) {
	// Добавляем CORS-заголовки, чтобы браузер друга не ругался
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Читаем сырые байты JSON, не парся о его структуре (всеядность!)
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Проверяем валидность JSON, чтобы не слать мусор
	if json.Valid(body) {
		fmt.Printf("[РАДМИН -> WS] Переслано: %s\n", string(body))
		broadcast(body)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

// Регистрируем новые вкладки браузера
func handleWS(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	fmt.Println("--- [WS] Браузер main.js успешно подключился! ---")

	clientsMu.Lock()
	clients[ws] = true
	clientsMu.Unlock()

	// Держим соединение открытым, пока браузер не закроют
	go func() {
		for {
			if _, _, err := ws.ReadMessage(); err != nil {
				clientsMu.Lock()
				delete(clients, ws)
				clientsMu.Unlock()
				ws.Close()
				fmt.Println("[WS] Браузер отключился.")
				break
			}
		}
	}()
}

// Рассылаем сырые байты всем открытым вкладкам браузера
func broadcast(message []byte) {
	clientsMu.Lock()
	defer clientsMu.Unlock()
	for client := range clients {
		err := client.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			client.Close()
			delete(clients, client)
		}
	}
}