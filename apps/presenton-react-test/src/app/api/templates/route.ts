import { Request, Response, Router } from "express";
import { promises as fs } from "fs";
import path from "path";
import { TemplateSetting } from "@/app/presentation-generator/template-preview/types";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const templatesDirectory = path.join(process.cwd(), "presentation-templates");

    const items = await fs.readdir(templatesDirectory, { withFileTypes: true });

    const templateDirectories = items
      .filter((item) => item.isDirectory())
      .map((dir) => dir.name);

    const allLayouts: {
      templateName: string;
      templateID: string;
      files: string[];
      settings: TemplateSetting | null;
    }[] = [];

    for (const templateName of templateDirectories) {
      try {
        const templatePath = path.join(templatesDirectory, templateName);
        const templateFiles = await fs.readdir(templatePath);

        const layoutFiles = templateFiles.filter(
          (file) =>
            file.endsWith(".tsx") &&
            !file.startsWith(".") &&
            !file.includes(".test.") &&
            !file.includes(".spec.") &&
            file !== "settings.json"
        );

        let settings: TemplateSetting | null;
        const settingsPath = path.join(templatePath, "settings.json");

        try {
          const settingsContent = await fs.readFile(settingsPath, "utf-8");
          settings = JSON.parse(settingsContent) as TemplateSetting;
        } catch {
          console.warn(`No settings.json for template ${templateName}, using defaults`);
          settings = {
            description: `${templateName} presentation layouts`,
            ordered: false,
            default: false,
          };
        }

        if (layoutFiles.length > 0) {
          allLayouts.push({
            templateName,
            templateID: templateName,
            files: layoutFiles,
            settings,
          });
        }
      } catch (error) {
        console.error(`Error reading template directory ${templateName}:`, error);
      }
    }

    return res.json(allLayouts);
  } catch (error) {
    console.error("Error reading presentation-templates directory:", error);
    return res
      .status(500)
      .json({ error: "Failed to read presentation-templates directory" });
  }
});

export default router;
