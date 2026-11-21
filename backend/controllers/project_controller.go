package controllers

import (
	"fmt"
	"net/http"
	"nido-backend/database"
	"nido-backend/models"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const defaultProjectColor = "#6366f1"

// RegisterProjectRoutes registra las rutas de proyectos, etapas y tareas checklist.
func RegisterProjectRoutes(protected *gin.RouterGroup) {
	projects := protected.Group("/projects")
	{
		projects.GET("", GetProjects)
		projects.POST("", CreateProject)
		projects.PUT("/:id", UpdateProject)
		projects.DELETE("/:id", DeleteProject)
		projects.PATCH("/:id/reorder-stages", ReorderProjectStages)
		projects.POST("/:id/stages", CreateProjectStage)
		projects.PUT("/:id/stages/:stageId", UpdateProjectStage)
		projects.DELETE("/:id/stages/:stageId", DeleteProjectStage)
		projects.POST("/:id/stages/:stageId/tasks", CreateProjectTask)
		projects.PATCH("/:id/stages/:stageId/reorder-tasks", ReorderProjectTasks)
		projects.PUT("/:id/tasks/:taskId", UpdateProjectTask)
		projects.PATCH("/:id/tasks/:taskId/toggle", ToggleProjectTask)
		projects.DELETE("/:id/tasks/:taskId", DeleteProjectTask)
	}
}

func normalizeProjectColor(color string) string {
	trimmed := strings.TrimSpace(color)
	if trimmed == "" {
		return defaultProjectColor
	}
	return trimmed
}

func normalizeDueDate(dueDate *string) (*string, error) {
	if dueDate == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*dueDate)
	if trimmed == "" {
		return nil, nil
	}
	if _, err := time.Parse("2006-01-02", trimmed); err != nil {
		return nil, fmt.Errorf("formato de fecha inválido, se esperaba YYYY-MM-DD")
	}
	return &trimmed, nil
}

func cleanStageTitles(raw []string) []string {
	cleaned := make([]string, 0, len(raw))
	for _, title := range raw {
		trimmed := strings.TrimSpace(title)
		if trimmed != "" {
			cleaned = append(cleaned, trimmed)
		}
	}
	if len(cleaned) == 0 {
		return []string{"Etapa 1"}
	}
	return cleaned
}

func ensureProjectSlices(p *models.Project) {
	if p.Stages == nil {
		p.Stages = []models.ProjectStage{}
	}
	for i := range p.Stages {
		if p.Stages[i].Tasks == nil {
			p.Stages[i].Tasks = []models.ProjectTask{}
		}
	}
}

func preloadOrderedProject(db *gorm.DB) *gorm.DB {
	return db.
		Preload("Stages", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("position ASC, id ASC")
		}).
		Preload("Stages.Tasks", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("position ASC, id ASC")
		})
}

func nextPosition(model any, fkColumn string, fkValue uint) (int, error) {
	var maxPos int
	err := database.DB.Model(model).
		Where(fkColumn+" = ?", fkValue).
		Select("COALESCE(MAX(position), -1)").
		Scan(&maxPos).Error
	if err != nil {
		return 0, err
	}
	return maxPos + 1, nil
}

func findFamilyProject(projectId string, familyID uint) (models.Project, error) {
	var project models.Project
	err := database.DB.Where("id = ? AND family_id = ?", projectId, familyID).First(&project).Error
	return project, err
}

func findFamilyStage(projectId, stageId string, familyID uint) (models.ProjectStage, error) {
	project, err := findFamilyProject(projectId, familyID)
	if err != nil {
		return models.ProjectStage{}, err
	}
	var stage models.ProjectStage
	err = database.DB.Where("id = ? AND project_id = ?", stageId, project.ID).First(&stage).Error
	return stage, err
}

func findFamilyTask(projectId, taskId string, familyID uint) (models.ProjectTask, error) {
	project, err := findFamilyProject(projectId, familyID)
	if err != nil {
		return models.ProjectTask{}, err
	}
	var task models.ProjectTask
	err = database.DB.
		Joins("JOIN project_stages ON project_stages.id = project_tasks.stage_id").
		Where("project_tasks.id = ? AND project_stages.project_id = ?", taskId, project.ID).
		First(&task).Error
	return task, err
}

func GetProjects(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	projects := []models.Project{}
	if err := preloadOrderedProject(database.DB).
		Where("family_id = ?", user.FamilyID).
		Order("id desc").
		Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener proyectos"})
		return
	}

	for i := range projects {
		ensureProjectSlices(&projects[i])
	}

	c.JSON(http.StatusOK, projects)
}

type CreateProjectRequest struct {
	Title       string   `json:"title" binding:"required"`
	Description string   `json:"description"`
	Color       string   `json:"color"`
	DueDate     *string  `json:"dueDate"`
	Stages      []string `json:"stages"`
}

func CreateProject(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	var req CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El título es obligatorio"})
		return
	}

	dueDate, err := normalizeDueDate(req.DueDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	stageTitles := cleanStageTitles(req.Stages)
	project := models.Project{
		Title:         title,
		Description:   strings.TrimSpace(req.Description),
		Color:         normalizeProjectColor(req.Color),
		DueDate:       dueDate,
		CreatedByName: user.DisplayName,
		FamilyID:      user.FamilyID,
	}

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&project).Error; err != nil {
			return err
		}

		stages := make([]models.ProjectStage, 0, len(stageTitles))
		for idx, stageTitle := range stageTitles {
			stage := models.ProjectStage{
				ProjectID: project.ID,
				Title:     stageTitle,
				Position:  idx,
			}
			if err := tx.Create(&stage).Error; err != nil {
				return err
			}
			stage.Tasks = []models.ProjectTask{}
			stages = append(stages, stage)
		}
		project.Stages = stages
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear el proyecto"})
		return
	}

	ensureProjectSlices(&project)
	c.JSON(http.StatusCreated, project)
}

type UpdateProjectRequest struct {
	Title       string  `json:"title" binding:"required"`
	Description string  `json:"description"`
	Color       string  `json:"color"`
	DueDate     *string `json:"dueDate"`
}

func UpdateProject(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	project, err := findFamilyProject(c.Param("id"), user.FamilyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Proyecto no encontrado"})
		return
	}

	var req UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El título es obligatorio"})
		return
	}

	dueDate, err := normalizeDueDate(req.DueDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	project.Title = title
	project.Description = strings.TrimSpace(req.Description)
	project.Color = normalizeProjectColor(req.Color)
	project.DueDate = dueDate

	if err := database.DB.Save(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar el proyecto"})
		return
	}

	if err := preloadOrderedProject(database.DB).First(&project, project.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al recargar el proyecto"})
		return
	}

	ensureProjectSlices(&project)
	c.JSON(http.StatusOK, project)
}

func DeleteProject(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	project, err := findFamilyProject(c.Param("id"), user.FamilyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Proyecto no encontrado"})
		return
	}

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		var stageIDs []uint
		if err := tx.Model(&models.ProjectStage{}).Where("project_id = ?", project.ID).Pluck("id", &stageIDs).Error; err != nil {
			return err
		}
		if len(stageIDs) > 0 {
			if err := tx.Where("stage_id IN ?", stageIDs).Delete(&models.ProjectTask{}).Error; err != nil {
				return err
			}
		}
		if err := tx.Where("project_id = ?", project.ID).Delete(&models.ProjectStage{}).Error; err != nil {
			return err
		}
		return tx.Delete(&project).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar el proyecto"})
		return
	}

	c.Status(http.StatusNoContent)
}

type StageRequest struct {
	Title string `json:"title" binding:"required"`
}

func CreateProjectStage(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	project, err := findFamilyProject(c.Param("id"), user.FamilyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Proyecto no encontrado"})
		return
	}

	var req StageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El nombre de la etapa es obligatorio"})
		return
	}

	pos, err := nextPosition(&models.ProjectStage{}, "project_id", project.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al calcular posición"})
		return
	}

	stage := models.ProjectStage{
		ProjectID: project.ID,
		Title:     title,
		Position:  pos,
		Tasks:     []models.ProjectTask{},
	}

	if err := database.DB.Create(&stage).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear la etapa"})
		return
	}
	stage.Tasks = []models.ProjectTask{}

	c.JSON(http.StatusCreated, stage)
}

func UpdateProjectStage(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	stage, err := findFamilyStage(c.Param("id"), c.Param("stageId"), user.FamilyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Etapa no encontrada"})
		return
	}

	var req StageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El nombre de la etapa es obligatorio"})
		return
	}

	stage.Title = title
	if err := database.DB.Save(&stage).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar la etapa"})
		return
	}

	if err := database.DB.Preload("Tasks", func(tx *gorm.DB) *gorm.DB {
		return tx.Order("position ASC, id ASC")
	}).First(&stage, stage.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al recargar la etapa"})
		return
	}
	if stage.Tasks == nil {
		stage.Tasks = []models.ProjectTask{}
	}

	c.JSON(http.StatusOK, stage)
}

func reorderPositions(model any, parentColumn string, parentID uint, ids []uint) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		for idx, itemID := range ids {
			if err := tx.Model(model).
				Where("id = ? AND "+parentColumn+" = ?", itemID, parentID).
				Update("position", idx).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

type ReorderStagesRequest struct {
	StageIDs []uint `json:"stageIds" binding:"required"`
}

func ReorderProjectStages(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	project, err := findFamilyProject(c.Param("id"), user.FamilyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Proyecto no encontrado"})
		return
	}

	var req ReorderStagesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	if err := reorderPositions(&models.ProjectStage{}, "project_id", project.ID, req.StageIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al reordenar etapas"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func DeleteProjectStage(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	stage, err := findFamilyStage(c.Param("id"), c.Param("stageId"), user.FamilyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Etapa no encontrada"})
		return
	}

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("stage_id = ?", stage.ID).Delete(&models.ProjectTask{}).Error; err != nil {
			return err
		}
		return tx.Delete(&stage).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar la etapa"})
		return
	}

	c.Status(http.StatusNoContent)
}

type ProjectTaskRequest struct {
	Title string `json:"title" binding:"required"`
}

func CreateProjectTask(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	stage, err := findFamilyStage(c.Param("id"), c.Param("stageId"), user.FamilyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Etapa no encontrada"})
		return
	}

	var req ProjectTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El título de la tarea es obligatorio"})
		return
	}

	pos, err := nextPosition(&models.ProjectTask{}, "stage_id", stage.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al calcular posición"})
		return
	}

	task := models.ProjectTask{
		StageID:     stage.ID,
		Title:       title,
		IsCompleted: false,
		Position:    pos,
	}

	if err := database.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear la tarea"})
		return
	}

	c.JSON(http.StatusCreated, task)
}

func UpdateProjectTask(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	task, err := findFamilyTask(c.Param("id"), c.Param("taskId"), user.FamilyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tarea no encontrada"})
		return
	}

	var req ProjectTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El título de la tarea es obligatorio"})
		return
	}

	task.Title = title
	if err := database.DB.Save(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar la tarea"})
		return
	}

	c.JSON(http.StatusOK, task)
}

func ToggleProjectTask(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	task, err := findFamilyTask(c.Param("id"), c.Param("taskId"), user.FamilyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tarea no encontrada"})
		return
	}

	task.IsCompleted = !task.IsCompleted
	if task.IsCompleted {
		task.CompletedByName = user.DisplayName
	} else {
		task.CompletedByName = ""
	}

	if err := database.DB.Save(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar el estado de la tarea"})
		return
	}

	c.JSON(http.StatusOK, task)
}

func DeleteProjectTask(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	task, err := findFamilyTask(c.Param("id"), c.Param("taskId"), user.FamilyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tarea no encontrada"})
		return
	}

	if err := database.DB.Delete(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al eliminar la tarea"})
		return
	}

	c.Status(http.StatusNoContent)
}

type ReorderTasksRequest struct {
	TaskIDs []uint `json:"taskIds" binding:"required"`
}

func ReorderProjectTasks(c *gin.Context) {
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no encontrado"})
		return
	}

	stage, err := findFamilyStage(c.Param("id"), c.Param("stageId"), user.FamilyID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Etapa no encontrada"})
		return
	}

	var req ReorderTasksRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos inválidos"})
		return
	}

	if err := reorderPositions(&models.ProjectTask{}, "stage_id", stage.ID, req.TaskIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al reordenar tareas"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}
