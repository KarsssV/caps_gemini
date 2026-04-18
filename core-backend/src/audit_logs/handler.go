package auditLog

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

// func (h *Handler) HandleAdd(c *gin.Context) {
// 	var req AuditLogAdd
// 	if err := c.ShouldBindJSON(&req); err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
// 		return
// 	}

// 	auditLog, err := h.svc.Add(c.Request.Context(), req.UserID, req.Details)
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}
// 	c.JSON(http.StatusCreated, auditLog)
// }

func (h *Handler) HandleRequest(c *gin.Context) {
	auditLogs, err := h.svc.Request(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, AuditLogResponse{AuditLog: auditLogs})
}

func (h *Handler) HandleRequestByUserId(c *gin.Context) {
	userId, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": c.Param(":id")})
		return
	}

	auditLogs, err := h.svc.RequestByUserID(c.Request.Context(), userId)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, auditLogs)
}
