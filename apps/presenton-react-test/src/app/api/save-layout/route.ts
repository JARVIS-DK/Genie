import { Router, Request, Response } from "express";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { layout_name, components } = req.body;

    if (!layout_name || !components || !Array.isArray(components)) {
      return res.status(400).json({
        error: "Invalid request body. Expected layout_name and components array.",
      });
    }

    const layoutsDir = join(process.cwd(), "app_data", "layouts", layout_name);

    if (!existsSync(layoutsDir)) {
      await mkdir(layoutsDir, { recursive: true });
    }

    const savedFiles: any[] = [];

    for (const component of components) {
      const { slide_number, component_code, component_name } = component;

      if (!component_code || !component_name) {
        console.warn(
          `Skipping component for slide ${slide_number}: missing code or name`
        );
        continue;
      }

      const fileName = `${component_name}.tsx`;
      const filePath = join(layoutsDir, fileName);

      const cleanComponentCode = component_code
        .replace(/```tsx/g, "")
        .replace(/```/g, "");

      await writeFile(filePath, cleanComponentCode, "utf8");

      savedFiles.push({
        slide_number,
        component_name,
        file_path: filePath,
        file_name: fileName,
      });
    }

    return res.json({
      success: true,
      layout_name,
      path: layoutsDir,
      saved_files: savedFiles.length,
      components: savedFiles,
    });
  } catch (error) {
    console.error("Error saving layout:", error);
    return res.status(500).json({ error: "Failed to save layout components" });
  }
});

export default router;
