import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { sanitizeFilename } from "@/app/(presentation-generator)/utils/others";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }

    const sanitizedFilePath = sanitizeFilename(filePath);
    const normalizedPath = path.normalize(sanitizedFilePath);

    const allowedBaseDirs = [
      process.env.APP_DATA_DIRECTORY || "/app/user_data",
      process.env.TEMP_DIRECTORY || "/tmp",
      "/app/user_data",
    ];

    const resolvedPath = fs.realpathSync(path.resolve(normalizedPath));

    const isPathAllowed = allowedBaseDirs.some((baseDir) => {
      const resolvedBaseDir = fs.realpathSync(path.resolve(baseDir));
      return (
        resolvedPath.startsWith(resolvedBaseDir + path.sep) ||
        resolvedPath === resolvedBaseDir
      );
    });

    if (!isPathAllowed) {
      console.error("Unauthorized file access attempt:", resolvedPath);
      return res
        .status(403)
        .json({ error: "Access denied: File path not allowed" });
    }

    const content = fs.readFileSync(resolvedPath, "utf-8");
    return res.json({ content });
  } catch (error) {
    console.error("Error reading file:", error);
    return res.status(500).json({ error: "Failed to read file" });
  }
});

export default router;
