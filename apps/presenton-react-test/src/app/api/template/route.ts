import { Request, Response, Router } from "express";
import puppeteer from "puppeteer";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const groupName = req.query.group as string | undefined;

  if (!groupName) {
    return res.status(400).json({ error: "Missing group name" });
  }

  const schemaPageUrl = `http://localhost/schema?group=${encodeURIComponent(
    groupName
  )}`;

  let browser: puppeteer.Browser | null = null;

  try {
    browser = await puppeteer.launch({
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
        "--disable-ipc-flooding-protection",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    page.setDefaultNavigationTimeout(300000);
    page.setDefaultTimeout(300000);

    await page.goto(schemaPageUrl, {
      waitUntil: "networkidle0",
      timeout: 300000,
    });

    await page.waitForSelector("[data-layouts]", { timeout: 300000 });
    await page.waitForSelector("[data-settings]", { timeout: 300000 });

    const { dataLayouts, dataGroupSettings } = await page.$eval(
      "[data-layouts]",
      (el) => ({
        dataLayouts: el.getAttribute("data-layouts"),
        dataGroupSettings: el.getAttribute("data-settings"),
      })
    );

    let slides: any[] = [];
    let groupSettings: any = null;

    try {
      slides = JSON.parse(dataLayouts || "[]");
    } catch {
      slides = [];
    }

    try {
      groupSettings = JSON.parse(dataGroupSettings || "null");
    } catch {
      groupSettings = null;
    }

    const response = {
      name: groupName,
      ordered: groupSettings?.ordered ?? false,
      slides: slides.map((slide) => ({
        id: slide.id,
        name: slide.name,
        description: slide.description,
        json_schema: slide.json_schema,
      })),
    };

    return res.json(response);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to fetch or parse client page" });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

export default router;
