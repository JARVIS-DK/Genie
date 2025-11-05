import { Request, Response, Router } from "express";

const router = Router();

const canChangeKeys = process.env.CAN_CHANGE_KEYS !== "false";

router.get("/can-change", (_req: Request, res: Response) => {
  res.json({ canChange: canChangeKeys });
});

export default router;
