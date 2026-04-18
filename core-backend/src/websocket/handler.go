package websock

import (
	"encoding/base64"
	"io"
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

		file, _, err := c.Request.FormFile("snapshot_image")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing snapshot_image"})
			return
		}
		defer file.Close()

		// Read file into bytes
		fileBytes, err := io.ReadAll(file)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read image"})
			return
		}

		// (Optional) Process it a bit here:
		// e.g., Save bytes to local storage, push data to your Repository/Database layer

		// 3. Convert image to base64 so it can be easily sent over JSON WebSockets
		base64Str := base64.StdEncoding.EncodeToString(fileBytes)
		imgDataURI := "data:image/png;base64," + base64Str

		// 4. Construct payload for the frontend
		broadcastData := gin.H{
			"head_count": headCount,
			"fps":        fps,
			"timestamp":  timestamp,
			"image":      imgDataURI,
		}

		// 5. Send to WebSocket Hub
		hub.Broadcast <- broadcastData

		c.JSON(http.StatusOK, gin.H{"status": "Received and broadcasted"})
	}
}
