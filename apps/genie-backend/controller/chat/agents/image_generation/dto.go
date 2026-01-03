package image_generation

type GeminiImageGenerationRequest struct {
	Query          string   `json:"query"`
	ImageModel     string   `json:"image_model" default:"gemini-3-pro-image-preview"`
	ImageSize      string   `json:"image_size" default:"1K"`
	AspectRatio    string   `json:"aspect_ratio" default:"1:1"`
	NumberofImages any      `json:"number_of_images" default:"1"`
	ImageUrls      []string `json:"image_urls"` // only editing image
}
