export interface ModelOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  size: string;
}

export interface ImageProviderOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  requiresApiKey?: boolean;
  apiKeyField?: string;
  apiKeyFieldLabel?: string;
}

export interface LLMProviderOption {
  value: string;
  label: string;
  description?: string;
  model_value?: string;
  model_label?: string;
}

export const IMAGE_PROVIDERS: Record<string, ImageProviderOption> = {
  pexels: {
    value: "pexels",
    label: "Pexels",
    description: "Free stock photo and video platform",
    icon: "/icons/pexels.png",
    requiresApiKey: true,
    apiKeyField: "PEXELS_API_KEY",
    apiKeyFieldLabel: "Pexels API Key"
  },
  pixabay: {
    value: "pixabay",
    label: "Pixabay",
    description: "Free images and videos",
    icon: "/icons/pixabay.png",
    requiresApiKey: true,
    apiKeyField: "PIXABAY_API_KEY",
    apiKeyFieldLabel: "Pixabay API Key"
  },
  "dall-e-3": {
    value: "dall-e-3",
    label: "DALL-E 3",
    description: "OpenAI's latest image generation model",
    icon: "/icons/dall-e.png",
    requiresApiKey: true,
    apiKeyField: "OPENAI_API_KEY",
    apiKeyFieldLabel: "OpenAI API Key"
  },
  gemini_flash: {
    value: "gemini_flash",
    label: "Gemini Flash",
    description: "Google's primary image generation model",
    icon: "/icons/google.png",
    requiresApiKey: true,
    apiKeyField: "GOOGLE_API_KEY",
    apiKeyFieldLabel: "Google API Key"
  },
};

export const LLM_PROVIDERS: Record<string, LLMProviderOption> = {
  openai: {
    value: "openai",
    label: "OpenAI",
    description: "OpenAI's latest text generation model",
  },
  google: {
    value: "google",
    label: "Google",
    description: "Google's primary text generation model",
  },
  anthropic: {
    value: "anthropic",
    label: "Anthropic",
    description: "Anthropic's Claude models",
  },
  ollama: {
    value: "ollama",
    label: "Ollama",
    description: "Ollama's primary text generation model",
  },
  custom: {
    value: "custom",
    label: "Custom",
    description: "Custom LLM",
  },
}; 