package chat

import "time"

type ExecuteRequestDto struct {
	Query          string `json:"query" bson:"query"`
	ConversationId string `json:"conversation_id" bson:"conversation_id"`
	Files          []File `json:"files" bson:"files"`
}

type File struct {
	Name string `json:"name" bson:"name"`
	Path string `json:"path" bson:"path"`
	Type string `json:"type" bson:"type"`
	Size int64  `json:"size" bson:"size"`
	Id   string `json:"id" bson:"id"`
}

type ExecuteResponseDto struct {
	Message               string                  `json:"message" bson:"message"`
	AgentsExecutedResults []AgentsExecutedResults `json:"agents_executed_results" bson:"agents_executed_results"`
}

type AgentsExecutedResults struct {
	AgentId         string    `json:"agent_id" bson:"agent_id"`
	AgentName       string    `json:"agent_name" bson:"agent_name"`
	AgentType       string    `json:"agent_type" bson:"agent_type"`
	AgentStatus     string    `json:"agent_status" bson:"agent_status"`
	Query           string    `json:"query" bson:"query"`
	ResponseMessage string    `json:"response_message" bson:"response_message"`
	ResponseError   string    `json:"response_error" bson:"response_error"`
	StartedAt       time.Time `json:"started_at" bson:"started_at"`
	CompletedAt     time.Time `json:"completed_at" bson:"completed_at"`
}

type ChatMessage struct {
	Message               string                  `json:"message" bson:"message"`
	AgentsExecutedResults []AgentsExecutedResults `json:"agents_executed_results" bson:"agents_executed_results"`
	Role                  string                  `json:"role" bson:"role"`
	Files                 []File                  `json:"files" bson:"files"`
	CreatedAt             time.Time               `json:"created_at" bson:"created_at"`
	UpdatedAt             time.Time               `json:"updated_at" bson:"updated_at"`
}

type DailyHistory map[string][]ChatMessage

type RenameConversationRequestDto struct {
	ConversationId string `json:"conversation_id" bson:"conversation_id"`
	Name           string `json:"name" bson:"name"`
}
