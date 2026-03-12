package config

var GlobalEnv = map[string]interface{}{
	"PORT": "4000",
	"MONGO_CREDENTIAL": map[string]interface{}{
		"MONGO_DB_HOST":     "cluster0.tocqewa.mongodb.net",
		"MONGO_DB_PORT":     "27017",
		"MONGO_DB_USER":     "genie_db_user",
		"MONGO_DB_PASSWORD": "genie_db_user",
		"MONGO_DB_NAME":     "genie",
		"MONGO_DB_SRV":      true,
	},
	"JWT_ACCESS_TOKEN_KEY":       "yNVrBBM+oAOWOEcXPFjJuvXXpUq/4XR1KuSGX/i+slF+oE/geu2uW25PXjfWS9pwjmTry3WXn7q0DH7I+vNSjw==",
	"JWT_ACCESS_TOKEN_DURATION":  "10m",
	"JWT_REFRESH_TOKEN_KEY":      "yNVrBBM+oAOWOEcXPFjJuvXXpUq/4XR1KuSGX/i+slF+oE/geu2uW25PXjfWS9pwjmTry3WXn7q0DH7I+vNSjw==",
	"JWT_REFRESH_TOKEN_DURATION": "72h",

	"GOOGLE_SERVICE_ACCOUNT_URL":       "https://storage.googleapis.com/genie-blob-storage/json/genie-654.json",
	"GOOGLE_CLOUD_STORAGE_BUCKET_NAME": "genie-blob-storage",
	"GOOGLE_CLOUD_PROJECT_ID":          "project-9a5b394d-e704-434b-a81",
	"GOOGLE_CLOUD_LOCATION":            "global",

	"GOOGLE_GEMINI_CHAT_MODEL":         "gemini-3.1-pro-preview",
	"GOOGLE_GEMINI_GENERAL_CHAT_MODEL": "gemini-3.1-flash-lite-preview",
	"GOOGLE_GEMINI_AUDIO_MODEL":        "gemini-3.1-flash-lite-preview",
	"GOOGLE_GEMINI_IMAGE_MODEL":        "gemini-3.1-flash-image-preview",
	"GOOGLE_GEMINI_VIDEO_MODEL":        "veo-3.1-fast-generate-preview",
}
