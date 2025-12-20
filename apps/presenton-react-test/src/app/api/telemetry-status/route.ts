import { Router, Request, Response } from "express";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const isDisabled =
    process.env.DISABLE_ANONYMOUS_TELEMETRY === "true" ||
    process.env.DISABLE_ANONYMOUS_TELEMETRY === "True";

  const telemetryEnabled = !isDisabled;

  return res.json({ telemetryEnabled });
});

export default router;
