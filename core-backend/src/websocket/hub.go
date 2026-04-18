// services/ws_hub.go
package websock

import (
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type WSHub struct {
	clients   map[*websocket.Conn]bool
	Broadcast chan interface{} // Channel to receive messages to broadcast
	mu        sync.Mutex
}

func NewWSHub() *WSHub {
	return &WSHub{
		clients:   make(map[*websocket.Conn]bool),
		Broadcast: make(chan interface{}),
	}
}

// Run listens on the Broadcast channel and sends to all clients
func (h *WSHub) Run() {
	for {
		msg := <-h.Broadcast
		h.mu.Lock()
		for client := range h.clients {
			err := client.WriteJSON(msg)
			if err != nil {
				log.Println("WebSocket write error:", err)
				client.Close()
				delete(h.clients, client)
			}
		}
		h.mu.Unlock()
	}
}

func (h *WSHub) AddClient(client *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[client] = true
}

func (h *WSHub) RemoveClient(client *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients, client)
	client.Close()
}
