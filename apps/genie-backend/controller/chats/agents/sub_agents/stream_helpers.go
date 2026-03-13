package sub_agents

import "apps/genie-backend/controller/chats/models"

// SendStep sends a streaming INPROGRESS chunk for a sub-agent's internal step.
// If sw is nil (non-streaming path), it's a no-op.
func SendStep(sw *models.StreamWriter, agentName string, message string) {
	if sw == nil {
		return
	}
	sw.Send(models.StreamChunk{
		AgentName: agentName,
		Message:   message,
		Status:    "INPROGRESS",
	})
}
