package headCountLog

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
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
	c.JSON(http.StatusCreated, headCountLog)
}

func (h *Handler) HandleRequestBySource(c *gin.Context) {
	sourceId, err := uuid.Parse(c.Param("sourceId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": c.Param(":id")})
		return
	}

	headCountLogs, err := h.svc.RequestBySource(c.Request.Context(), sourceId)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, HeadCountLogResponse{HeadCountLogs: headCountLogs})
}
