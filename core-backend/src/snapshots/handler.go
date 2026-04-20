package snapshots

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"

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
	jsonStr := c.PostForm("snapshot_data")

	var req SnapshotAdd
	if err := json.Unmarshal([]byte(jsonStr), &req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	file, err := c.FormFile("snapshot_image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	imageDir := req.SourceID.String() + "/" + req.ImagePath

	imgServeUrl := os.Getenv("BE_CORE_URL") + "/public/"
	req.ImagePath = imgServeUrl + "snapshots/" + imageDir

	snapshot, err := h.svc.Add(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	dst := "./public/snapshots/" + imageDir
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, snapshot)
}

func (h *Handler) HandleRequest(c *gin.Context) {
	snapshots, err := h.svc.Request(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, SnapshotResponse{Snapshots: snapshots})
}

func (h *Handler) HandleRequestsBySource(c *gin.Context) {
	sourceId, err := uuid.Parse(c.Param("sourceId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	snapshots, err := h.svc.RequestBySource(c.Request.Context(), sourceId)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, snapshots)
}

func (h *Handler) HandleRequestById(c *gin.Context) {
	snapshotId, err := uuid.Parse(c.Param("snapshotId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	snapshot, err := h.svc.RequestById(c.Request.Context(), snapshotId)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, snapshot)
}

func (h *Handler) HandleDeleteById(c *gin.Context) {
	snapshotId, err := uuid.Parse(c.Param("snapshotId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	snapshot, err := h.svc.DeleteById(c.Request.Context(), snapshotId)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	filePath := "./" + strings.TrimPrefix(snapshot.ImagePath, os.Getenv("URL"))
	if err := os.Remove(filePath); err != nil {
		c.JSON(500, gin.H{"error": "Failed to save file"})
		return
	}

	c.JSON(http.StatusOK, snapshot)
}
