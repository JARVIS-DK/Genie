import { Router, Request, Response } from "express";
import fs from "fs";

const router = Router();

router.get("/check-api-key", async (_req: Request, res: Response) => {
  try {
    const userConfigPath = process.env.USER_CONFIG_PATH;

    let keyFromFile = "";
    if (userConfigPath && fs.existsSync(userConfigPath)) {
      try {
        const raw = fs.readFileSync(userConfigPath, "utf-8");
        const cfg = JSON.parse(raw || "{}");
        keyFromFile = cfg?.OPENAI_API_KEY || "";
      } catch (err) {
        console.warn("Failed reading user config file:", err);
      }
    }

    const keyFromEnv = process.env.OPENAI_API_KEY || "";
    const hasKey = Boolean((keyFromFile || keyFromEnv).trim());

    return res.json({ hasKey });
  } catch (error: any) {
    return res.status(500).json({
      hasKey: false,
      error: error.message || "Server error",
    });
  }
});

export default router;
