package websock

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for the dashboard (adjust for production)
	},
}

func HandleWS(hub *WSHub) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upgrade connection"})
			return
		}

		hub.AddClient(conn)

		// Listen for client disconnects
		go func() {
			defer hub.RemoveClient(conn)
			for {
				if _, _, err := conn.ReadMessage(); err != nil {
					break
				}
			}
		}()
	}
}

func ReceiveLogs(hub *WSHub) gin.HandlerFunc {
	return func(c *gin.Context) {
		headCount := c.PostForm("head_count")
		fps := c.PostForm("current_fps")
		timestamp := c.PostForm("timestamp")

		// Construct payload for the frontend
		broadcastData := gin.H{
			"head_count": headCount,
			"fps":        fps,
			"timestamp":  timestamp,
		}

		// 5. Send to WebSocket Hub
		hub.Broadcast <- broadcastData

		c.JSON(http.StatusOK, gin.H{"status": "Received and broadcasted"})
	}
}
