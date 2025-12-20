import path from "path";
import fs from "fs";
import { Router, Request, Response } from "express";
import puppeteer from "puppeteer";
import { sanitizeFilename } from "../utils/sanitizeFilename"; // adjust path based on project structure

const router = Router();

router.post("/export-pdf", async (req: Request, res: Response) => {
  try {
    const { id, title } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Missing Presentation ID" });
    }

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection"
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    page.setDefaultNavigationTimeout(300000);
    page.setDefaultTimeout(300000);

    // ✅ Change your internal URL here if needed
    await page.goto(`http://localhost/pdf-maker?id=${id}`, {
      waitUntil: "networkidle0",
      timeout: 300000,
    });

    await page.waitForFunction('() => document.readyState === "complete"');

    try {
      await page.waitForFunction(
        `
          () => {
            const all = document.querySelectorAll('*');
            let visible = 0;

            for (const el of all) {
              const style = window.getComputedStyle(el);
              const isVisible =
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                style.opacity !== '0';

              if (isVisible && el.offsetWidth > 0 && el.offsetHeight > 0) {
                visible++;
              }
            }

            return visible / all.length >= 0.99;
          }
        `,
        { timeout: 300000 }
      );

      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.warn("Some page elements didn't finish loading:", err);
    }

    const pdfBuffer = await page.pdf({
      width: "1280px",
      height: "720px",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();

    const safeTitle = sanitizeFilename(title ?? "presentation");
    const exportDir = path.join(process.env.APP_DATA_DIRECTORY!, "exports");
    const exportPath = path.join(exportDir, `${safeTitle}.pdf`);

    await fs.promises.mkdir(exportDir, { recursive: true });
    await fs.promises.writeFile(exportPath, pdfBuffer);

    return res.json({
      success: true,
      path: exportPath,
    });

  } catch (error: any) {
    console.error("PDF Export Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to generate PDF",
    });
  }
});

export default router;
