import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { LLMConfig } from "@/types/llm_config";

const router = Router();

// Resolve config path
const userConfigPath = process.env.USER_CONFIG_PATH!;
const canChangeKeys = process.env.CAN_CHANGE_KEYS !== "false";

console.log("UserConfigPath:", userConfigPath);

/**
 * GET: Read config from file
 */
router.get("/", (req: Request, res: Response) => {
  if (!canChangeKeys) {
    return res.json({
      error: "You are not allowed to access this resource",
    });
  }

  if (!fs.existsSync(userConfigPath)) {
    return res.json({});
  }

  try {
    const configData = fs.readFileSync(userConfigPath, "utf-8");
    return res.json(JSON.parse(configData));
  } catch (error) {
    console.error("Failed to read config:", error);
    return res.status(500).json({ error: "Failed to read config" });
  }
});

/**
 * POST: Write/update config
 */
router.post("/", async (req: Request, res: Response) => {
  if (!canChangeKeys) {
    return res.json({
      error: "You are not allowed to access this resource",
    });
  }

  try {
    const userConfig = req.body as Partial<LLMConfig>;

    let existingConfig: LLMConfig = {};
    if (fs.existsSync(userConfigPath)) {
      const configData = fs.readFileSync(userConfigPath, "utf-8");
      existingConfig = JSON.parse(configData);
    }

    const mergedConfig: LLMConfig = {
      LLM: userConfig.LLM || existingConfig.LLM,
      OPENAI_API_KEY: userConfig.OPENAI_API_KEY || existingConfig.OPENAI_API_KEY,
      OPENAI_MODEL: userConfig.OPENAI_MODEL || existingConfig.OPENAI_MODEL,
      GOOGLE_API_KEY: userConfig.GOOGLE_API_KEY || existingConfig.GOOGLE_API_KEY,
      GOOGLE_MODEL: userConfig.GOOGLE_MODEL || existingConfig.GOOGLE_MODEL,
      ANTHROPIC_API_KEY: userConfig.ANTHROPIC_API_KEY || existingConfig.ANTHROPIC_API_KEY,
      ANTHROPIC_MODEL: userConfig.ANTHROPIC_MODEL || existingConfig.ANTHROPIC_MODEL,
      OLLAMA_URL: userConfig.OLLAMA_URL || existingConfig.OLLAMA_URL,
      OLLAMA_MODEL: userConfig.OLLAMA_MODEL || existingConfig.OLLAMA_MODEL,
      CUSTOM_LLM_URL: userConfig.CUSTOM_LLM_URL || existingConfig.CUSTOM_LLM_URL,
      CUSTOM_LLM_API_KEY: userConfig.CUSTOM_LLM_API_KEY || existingConfig.CUSTOM_LLM_API_KEY,
      CUSTOM_MODEL: userConfig.CUSTOM_MODEL || existingConfig.CUSTOM_MODEL,
      PIXABAY_API_KEY: userConfig.PIXABAY_API_KEY || existingConfig.PIXABAY_API_KEY,
      IMAGE_PROVIDER: userConfig.IMAGE_PROVIDER || existingConfig.IMAGE_PROVIDER,
      PEXELS_API_KEY: userConfig.PEXELS_API_KEY || existingConfig.PEXELS_API_KEY,
      TOOL_CALLS: userConfig.TOOL_CALLS ?? existingConfig.TOOL_CALLS,
      DISABLE_THINKING: userConfig.DISABLE_THINKING ?? existingConfig.DISABLE_THINKING,
      EXTENDED_REASONING: userConfig.EXTENDED_REASONING ?? existingConfig.EXTENDED_REASONING,
      WEB_GROUNDING: userConfig.WEB_GROUNDING ?? existingConfig.WEB_GROUNDING,
      USE_CUSTOM_URL: userConfig.USE_CUSTOM_URL ?? existingConfig.USE_CUSTOM_URL,
    };

    fs.writeFileSync(userConfigPath, JSON.stringify(mergedConfig));

    return res.json(mergedConfig);
  } catch (error) {
    console.error("Failed to save config:", error);
    return res.status(500).json({ error: "Failed to save config" });
  }
});

export default router;
