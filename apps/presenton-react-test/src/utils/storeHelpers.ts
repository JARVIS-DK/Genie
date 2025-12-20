import { setLLMConfig } from "../store/slices/userConfig";
import { store } from "../store/store";
import { LLMConfig } from "../types/llm_config";

export const handleSaveLLMConfig = async (llmConfig: LLMConfig) => {
  if (!hasValidLLMConfig(llmConfig)) {
    throw new Error("Provided configuration is not valid");
  }

  await fetch("/api/user-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(llmConfig),
  });

  store.dispatch(setLLMConfig(llmConfig));
};

export const hasValidLLMConfig = (llmConfig: LLMConfig): boolean => {
  if (!llmConfig.LLM) return false;
  if (!llmConfig.IMAGE_PROVIDER) return false;

  const isOpenAIConfigValid =
    !!llmConfig.OPENAI_MODEL && !!llmConfig.OPENAI_API_KEY;

  const isGoogleConfigValid =
    !!llmConfig.GOOGLE_MODEL && !!llmConfig.GOOGLE_API_KEY;

  const isAnthropicConfigValid =
    !!llmConfig.ANTHROPIC_MODEL && !!llmConfig.ANTHROPIC_API_KEY;

  const isOllamaConfigValid =
    !!llmConfig.OLLAMA_MODEL && !!llmConfig.OLLAMA_URL;

  const isCustomConfigValid =
    !!llmConfig.CUSTOM_LLM_URL && !!llmConfig.CUSTOM_MODEL;

  const isImageConfigValid = () => {
    switch (llmConfig.IMAGE_PROVIDER) {
      case "pexels":
        return !!llmConfig.PEXELS_API_KEY;
      case "pixabay":
        return !!llmConfig.PIXABAY_API_KEY;
      case "dall-e-3":
        return !!llmConfig.OPENAI_API_KEY;
      case "gemini_flash":
        return !!llmConfig.GOOGLE_API_KEY;
      default:
        return false;
    }
  };

  const isLLMConfigValid =
    (llmConfig.LLM === "openai" && isOpenAIConfigValid) ||
    (llmConfig.LLM === "google" && isGoogleConfigValid) ||
    (llmConfig.LLM === "anthropic" && isAnthropicConfigValid) ||
    (llmConfig.LLM === "ollama" && isOllamaConfigValid) ||
    (llmConfig.LLM === "custom" && isCustomConfigValid);

  return isLLMConfigValid && isImageConfigValid();
};
