package sources

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ProbeReq struct {
	Type     string    `json:"type"`
	Url      string    `json:"url"`
	SourceID uuid.UUID `json:"id"`
}

type ProbeRes struct {
	Exists     bool   `json:"exists"`
	Detail     string `json:"detail"`
	Url        string `json:"url"`
	Resolution string `json:"resolution"`
	Fps        int    `json:"fps"`
}

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) HandleAdd(c *gin.Context) {
	var req SourceAdd
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	switch req.Type {
	case "MP4":
		if !strings.HasSuffix(req.Url, ".mp4") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "MP4 type requires a link ending in .mp4"})
			return
		}
	case "RTSP":
		if !strings.HasPrefix(req.Url, "rtsp://") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "RTSP type requires a link starting with rtsp://"})
			return
		}
	case "Webcam":
		if !strings.HasPrefix(req.Url, "http://") && !strings.HasPrefix(req.Url, "https://") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Webcam streams must be HTTP or HTTPS"})
			return
		}
	case "Youtube":
		if !strings.HasPrefix(req.Url, "http://") && !strings.HasPrefix(req.Url, "https://") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Youtube streams must be HTTP or HTTPS"})
			return
		}
	case "Other":
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Webcam streams must be HTTP or HTTPS"})
		return
	}

	// probe request to BE AI
	var parseReq ProbeReq
	parseReq.Type = req.Type
	parseReq.Url = req.Url

	// generate random uuid for source_id
	var err error
	parseReq.SourceID, err = uuid.NewRandom()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}

	// marshal the parseReq
	jsonReq, err := json.Marshal(parseReq)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}

	// send POST probe request to BE AI
	resp, err := http.Post(os.Getenv("BE_AI_URL")+"/probe", "application/json", bytes.NewBuffer(jsonReq))
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Probe service unreachable"})
		return
	}
	defer resp.Body.Close()

	var parseRes ProbeRes
	if err := json.NewDecoder(resp.Body).Decode(&parseRes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to probe response"})
		return
	}

	// assign the probe result into req (db variable)
	req.SourceID = parseReq.SourceID
	status := true
	req.Status = &status
	req.Url = parseRes.Url
	req.Resolution = parseRes.Resolution
	req.FpsTarget = int32(parseRes.Fps)

	source, err := h.svc.Add(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, source)
}

func (h *Handler) HandleRequest(c *gin.Context) {
	sources, err := h.svc.Request(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, SourcesResponse{Sources: sources})
}

func (h *Handler) HandleRequestSourceID(c *gin.Context) {
	sources, err := h.svc.RequestSourcesId(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, SourcesResponse{Sources: sources})
}

func (h *Handler) HandleRequestById(c *gin.Context) {
	sourceId, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": c.Param(":id")})
		return
	}

	source, err := h.svc.RequestByID(c.Request.Context(), sourceId)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, source)
}

func (res ProbeRes) ProbeSource(req ProbeReq) {

}

func (h *Handler) HandleUpdateById(c *gin.Context) {
	sourceId, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var req SourceUpdate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	switch req.Type {
	case "MP4":
		if !strings.HasSuffix(req.Url, ".mp4") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "MP4 type requires a link ending in .mp4"})
			return
		}
	case "RTSP":
		if !strings.HasPrefix(req.Url, "rtsp://") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "RTSP type requires a link starting with rtsp://"})
			return
		}
	case "Webcam":
		if !strings.HasPrefix(req.Url, "http://") && !strings.HasPrefix(req.Url, "https://") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Webcam streams must be HTTP or HTTPS"})
			return
		}
	case "Youtube":
		if !strings.HasPrefix(req.Url, "http://") && !strings.HasPrefix(req.Url, "https://") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Youtube streams must be HTTP or HTTPS"})
			return
		}
	case "Other":
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Webcam streams must be HTTP or HTTPS"})
		return
	}

	// probe request to BE AI
	var parseReq ProbeReq
	parseReq.Type = req.Type
	parseReq.Url = req.Url

	// generate random uuid for source_id
	parseReq.SourceID, err = uuid.NewRandom()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}

	// marshal the parseReq
	jsonReq, err := json.Marshal(parseReq)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}

	// send POST probe request to BE AI
	resp, err := http.Post(os.Getenv("BE_AI_URL")+"/probe", "application/json", bytes.NewBuffer(jsonReq))
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Probe service unreachable"})
		return
	}
	defer resp.Body.Close()

	var parseRes ProbeRes
	if err := json.NewDecoder(resp.Body).Decode(&parseRes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to probe probe response"})
		return
	}

	// assign the probe result into req (db variable)
	status := true
	req.Status = &status
	req.Url = parseRes.Url
	req.Resolution = parseRes.Resolution
	req.FpsTarget = int32(parseRes.Fps)

	source, err := h.svc.UpdateById(c.Request.Context(), req, sourceId)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, source)
}

func (h *Handler) HandleDeleteById(c *gin.Context) {
	sourceId, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var req SourceDelete
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	source, err := h.svc.DeleteById(c.Request.Context(), sourceId, req.UserID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, source)
}
