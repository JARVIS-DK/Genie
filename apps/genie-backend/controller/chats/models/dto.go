package models

import (
	"encoding/json"
	"fmt"
	"io"
	"sync"
	"time"
)

// StreamChunk is the SSE chunk sent to the client during streaming.
type StreamChunk struct {
	AgentName    string      `json:"agent_name"`
	AgentResults interface{} `json:"agent_results"`
	Message      string      `json:"message"`
	Status       string      `json:"status"` // STARTED, INPROGRESS, COMPLETED
}

// StreamWriter provides a thread-safe way to write SSE events to the response.
type StreamWriter struct {
	Writer  io.Writer
	Flusher interface{ Flush() }
	Mu      sync.Mutex
}

func (sw *StreamWriter) Send(chunk StreamChunk) {
	data, err := json.Marshal(chunk)
	if err != nil {
		return
	}
	sw.Mu.Lock()
	defer sw.Mu.Unlock()
	fmt.Fprintf(sw.Writer, "data: %s\n\n", data)
	if sw.Flusher != nil {
		sw.Flusher.Flush()
	}
}

type ExecuteRequestDto struct {
	Message        string `json:"message"`
	ConversationId string `json:"conversation_id"`
	Files          []File `json:"files"`
	OptionalAgent  string `json:"optional_agent"`
}

type ExecuteResponseDto struct {
	Message               string                  `json:"message" bson:"message"`
	AgentsExecutedResults []AgentsExecutedResults `json:"agents_executed_results" bson:"agents_executed_results"`
	Steps                 []Step                  `json:"steps,omitempty" bson:"steps,omitempty"`
}

type GetConversationsRequestDto struct {
}

type GetChatHistoryRequestDto struct {
}

type RenameConversationRequestDto struct {
	ConversationId string `json:"conversation_id"`
	OldName        string `json:"old_name"`
	NewName        string `json:"new_name"`
}

type DeleteConversationRequestDto struct {
}

type Step struct {
	Number                 int      `json:"number" bson:"number"`
	Status                 string   `json:"status" bson:"status"`
	Actions                []string `json:"actions" bson:"actions"`
	ScreenshotUrl          string   `json:"screenshot_url" bson:"screenshot_url"`
	EvaluationPreviousGoal string   `json:"evaluation_previous_goal" bson:"evaluation_previous_goal"`
}

type ChatMessage struct {
	Message      string                  `json:"message" bson:"message"`
	AgentResults []AgentsExecutedResults `json:"agents_executed_results" bson:"agents_executed_results"`
	Steps        []Step                  `json:"steps" bson:"steps"`
	Role         string                  `json:"role" bson:"role"`
	Files        []File                  `json:"files" bson:"files"`
	CreatedAt    time.Time               `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time               `json:"updated_at" bson:"updated_at"`
}

type DailyHistory map[string][]ChatMessage

type AgentsExecutedResults struct {
	AgentId       string      `json:"agent_id" bson:"agent_id"`
	AgentName     string      `json:"agent_name" bson:"agent_name"`
	AgentStatus   string      `json:"agent_status" bson:"agent_status"`
	Query         string      `json:"query" bson:"query"`
	Response      interface{} `json:"response" bson:"response"`
	ResponseError string      `json:"response_error" bson:"response_error"`
	StartedAt     time.Time   `json:"started_at" bson:"started_at"`
	CompletedAt   time.Time   `json:"completed_at" bson:"completed_at"`
}

type File struct {
	Name string `json:"name" bson:"name"`
	Path string `json:"path" bson:"path"`
	Type string `json:"type" bson:"type"`
	Size int64  `json:"size" bson:"size"`
	Id   string `json:"id" bson:"id"`
}
