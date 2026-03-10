package video_generation

type GoogleVideoGenerationRequest struct {
	Query              string `json:"query"`
	VideoModel         string `json:"video_model" default:"veo-3.1-generate-preview"`
	WantEnhancedPrompt bool   `json:"want_enhanced_prompt" default:"false"`
}
