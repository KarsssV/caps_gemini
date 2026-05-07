package headCountLog

import (
	ws "gin-auth-supabase/src/websocket"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc *Service
	hub *ws.WSHub
}

func NewHandler(svc *Service, hub *ws.WSHub) *Handler {
	return &Handler{
		svc: svc,
		hub: hub,
	}
}

func (h *Handler) HandleAdd(c *gin.Context) {
	var req HeadCountLogAdd
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	headCountLog, err := h.svc.Add(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.hub.Broadcast <- headCountLog

	c.JSON(http.StatusCreated, headCountLog)
}

func (h *Handler) HandleRequestBySource(c *gin.Context) {
	sourceName := c.Param("sourceName")
	if sourceName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": c.Param(":id")})
		return
	}

	headCountLogs, err := h.svc.RequestBySource(c.Request.Context(), sourceName)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, HeadCountLogResponse{HeadCountLogs: headCountLogs})
}

func (h *Handler) HandleRequestLatestBySource(c *gin.Context) {
	sourceName := c.Param("sourceName")
	if sourceName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": c.Param(":id")})
		return
	}

	headCountLogs, err := h.svc.RequestLatestBySource(c.Request.Context(), sourceName)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, HeadCountLogResponse{HeadCountLogs: headCountLogs})
}
