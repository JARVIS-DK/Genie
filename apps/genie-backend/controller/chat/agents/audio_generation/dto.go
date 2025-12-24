package audio_generation

type GoogleAudioGenerationRequest struct {
	Query    string `json:"query"`
	Gender   string `json:"gender"`
	Language string `json:"language"`
}
