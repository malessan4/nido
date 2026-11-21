package controllers

import (
	"nido-backend/models"
	"reflect"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRegisterProjectRoutesNoPanic(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	api := r.Group("/api")

	defer func() {
		if rec := recover(); rec != nil {
			t.Fatalf("RegisterProjectRoutes panicked: %v", rec)
		}
	}()

	RegisterProjectRoutes(api)

	expectedRoutes := map[string]bool{
		"GET /api/projects":                         false,
		"POST /api/projects":                        false,
		"PUT /api/projects/:id":                     false,
		"DELETE /api/projects/:id":                  false,
		"PATCH /api/projects/:id/reorder-stages":    false,
		"POST /api/projects/:id/stages":             false,
		"PUT /api/projects/:id/stages/:stageId":     false,
		"DELETE /api/projects/:id/stages/:stageId":  false,
		"POST /api/projects/:id/stages/:stageId/tasks": false,
		"PATCH /api/projects/:id/stages/:stageId/reorder-tasks": false,
		"PUT /api/projects/:id/tasks/:taskId":       false,
		"PATCH /api/projects/:id/tasks/:taskId/toggle": false,
		"DELETE /api/projects/:id/tasks/:taskId":    false,
	}

	for _, route := range r.Routes() {
		key := route.Method + " " + route.Path
		if _, ok := expectedRoutes[key]; ok {
			expectedRoutes[key] = true
		}
	}

	for key, found := range expectedRoutes {
		if !found {
			t.Errorf("expected route %s was not registered", key)
		}
	}
}

func TestNormalizeDueDate(t *testing.T) {
	empty := ""
	spaces := "   "
	valid := " 2026-12-01 "
	invalid := "31-12-2026"

	got, err := normalizeDueDate(nil)
	if err != nil || got != nil {
		t.Fatalf("nil input: got (%v, %v), want (nil, nil)", got, err)
	}

	got, err = normalizeDueDate(&empty)
	if err != nil || got != nil {
		t.Fatalf("empty input: got (%v, %v), want (nil, nil)", got, err)
	}

	got, err = normalizeDueDate(&spaces)
	if err != nil || got != nil {
		t.Fatalf("spaces input: got (%v, %v), want (nil, nil)", got, err)
	}

	got, err = normalizeDueDate(&valid)
	if err != nil || got == nil || *got != "2026-12-01" {
		t.Fatalf("valid input: got (%v, %v), want (2026-12-01, nil)", got, err)
	}

	got, err = normalizeDueDate(&invalid)
	if err == nil || got != nil {
		t.Fatalf("invalid input: expected error, got (%v, %v)", got, err)
	}
}

func TestCleanStageTitles(t *testing.T) {
	if got := cleanStageTitles(nil); !reflect.DeepEqual(got, []string{"Etapa 1"}) {
		t.Fatalf("nil input: got %v, want [Etapa 1]", got)
	}

	if got := cleanStageTitles([]string{"", "   "}); !reflect.DeepEqual(got, []string{"Etapa 1"}) {
		t.Fatalf("blank inputs: got %v, want [Etapa 1]", got)
	}

	got := cleanStageTitles([]string{"  Compras ", "", "Colocación  ", "  "})
	want := []string{"Compras", "Colocación"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("mixed inputs: got %v, want %v", got, want)
	}
}

func TestEnsureProjectSlices(t *testing.T) {
	p1 := models.Project{}
	ensureProjectSlices(&p1)
	if p1.Stages == nil || len(p1.Stages) != 0 {
		t.Fatalf("expected non-nil empty Stages slice, got %#v", p1.Stages)
	}

	p2 := models.Project{
		Stages: []models.ProjectStage{
			{ID: 1, Title: "Capa 1", Tasks: nil},
		},
	}
	ensureProjectSlices(&p2)
	if p2.Stages[0].Tasks == nil || len(p2.Stages[0].Tasks) != 0 {
		t.Fatalf("expected non-nil empty Tasks slice, got %#v", p2.Stages[0].Tasks)
	}
}
