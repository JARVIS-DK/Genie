import express, { Request, Response, Router } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";

const router = Router();
const userDataDir = process.env.APP_DATA_DIRECTORY!;

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(userDataDir, "uploads");
    fs.mkdirSync(uploadsDir, { recursive: true });

    // Generate unique filename
    const filename = `${crypto.randomBytes(16).toString("hex")}.png`;
    const filePath = path.join(uploadsDir, filename);

    // Write file to disk
    fs.writeFileSync(filePath, file.buffer);

    return res.json({
      success: true,
      filePath: `${uploadsDir}/${filename}`,
    });
  } catch (error) {
    console.error("Error saving image:", error);
    return res.status(500).json({ error: "Failed to save image" });
  }
});

export default router;
