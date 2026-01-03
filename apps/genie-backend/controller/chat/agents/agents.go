package agents

type AgentDTO struct {
	AgentName        string `json:"agent_name"`
	AgentCode        string `json:"agent_code"`
	AgentDescription string `json:"agent_description"`
}

var AgentsList = map[string]AgentDTO{
	"CODE_GENERATOR_AND_DEBUGGER": {
		AgentName:        "Code Generator & Debugger",
		AgentCode:        "CODE_GENERATOR",
		AgentDescription: "Designs, generates, and refines production-grade source code from structured requirements or natural language prompts. This agent translates intent into clean, maintainable implementations, applies industry best practices, enforces coding standards, performs intelligent debugging, and supports multiple programming languages, frameworks, and architectural patterns.",
	},
	"IMAGE_GENERATION": {
		AgentName:        "Image Generation",
		AgentCode:        "IMAGE_GENERATION",
		AgentDescription: "Creates high-quality images from textual prompts or structured inputs using advanced generative models. Offers fine-grained control over style, composition, resolution, realism, and artistic direction, enabling scalable image creation for design, branding, visualization, and creative workflows.",
	},
	"VIDEO_GENERATION": {
		AgentName:        "Video Generation",
		AgentCode:        "VIDEO_GENERATION",
		AgentDescription: "Generates visually coherent, high-quality videos from text, images, or structured inputs. Supports scene planning, transitions, motion dynamics, timing, and stylistic consistency, enabling automated video creation for storytelling, marketing, training, and media production pipelines.",
	},
	"PODCAST_GENERATION": {
		AgentName:        "Podcast Generation",
		AgentCode:        "PODCAST_GENERATION",
		AgentDescription: "Produces complete podcast episodes from topics or structured scripts. Handles episode planning, narrative flow, voice synthesis, tone modulation, and optional sound design, enabling scalable creation of engaging, natural-sounding podcasts for education, entertainment, and content platforms.",
	},
	"SIMPLE_CHAT_BOT": {
		AgentName:        "Simple Chat Bot",
		AgentCode:        "SIMPLE_CHAT_BOT",
		AgentDescription: "Provides basic conversational responses to user queries using a simple chat model for quick and straightforward interactions. Ideal for simple questions and general assistance. Does not perform complex reasoning or multi-step tasks.",
	},
}

var OptionalAgentsList = map[string]AgentDTO{
	"WEB_SEARCH": {
		AgentName:        "Web Search",
		AgentCode:        "WEB_SEARCH",
		AgentDescription: "Performs high-precision web search operations by interfacing with external search providers. Manages intelligent query formulation, result aggregation, freshness detection, relevance ranking, and structured output delivery to ensure accurate, up-to-date, and actionable information retrieval.",
	},
	"DEEP_RESEARCH": {
		AgentName:        "Deep Research",
		AgentCode:        "DEEP_RESEARCH",
		AgentDescription: "Conducts advanced, multi-layered research across large-scale and interconnected information sources. Leverages semantic analysis, recursive querying, contextual reasoning, and relevance scoring to surface non-obvious insights, trends, and correlations beyond standard search capabilities.",
	},
}
