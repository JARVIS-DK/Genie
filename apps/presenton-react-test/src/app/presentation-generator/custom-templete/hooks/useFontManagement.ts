import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { UploadedFont, FontData } from "../types";

export const useFontManagement = () => {
  const [UploadedFonts, setUploadedFonts] = useState<UploadedFont[]>([]);
  const [fontsData, setFontsData] = useState<FontData | null>(null);

  /** ✅ Load uploaded fonts dynamically into DOM */
  useEffect(() => {
    UploadedFonts.forEach((font) => {
      const alreadyExists = document.querySelector(
        `style[data-font-url="${font.fontUrl}"]`
      );
      if (alreadyExists) return;

      const style = document.createElement("style");
      style.setAttribute("data-font-url", font.fontUrl);
      style.textContent = `
        @font-face {
          font-family: '${font.fontName}';
          src: url('${font.fontUrl}');
          font-display: swap;
        }
      `;
      document.head.appendChild(style);
    });
  }, [UploadedFonts]);

  /** ✅ Load Google fonts as <link> tags */
  useEffect(() => {
    if (!fontsData?.internally_supported_fonts) return;

    fontsData.internally_supported_fonts.forEach((font) => {
      const exists = document.querySelector(
        `link[href="${font.google_fonts_url}"]`
      );
      if (exists) return;

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = font.google_fonts_url;
      document.head.appendChild(link);
    });
  }, [fontsData]);

  /** ✅ Upload custom font */
  const uploadFont = useCallback(
    async (fontName: string, file: File): Promise<string | null> => {
      const exists = UploadedFonts.find((f) => f.fontName === fontName);
      if (exists) {
        toast.info(`Font "${fontName}" is already uploaded`);
        return exists.fontUrl;
      }

      const validExtensions = [".ttf", ".otf", ".woff", ".woff2", ".eot"];
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

      if (!validExtensions.includes(ext)) {
        toast.error("Upload only .ttf, .otf, .woff, .woff2, or .eot files");
        return null;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("Font must be less than 10MB");
        return null;
      }

      try {
        const form = new FormData();
        form.append("font_file", file);

        const res = await fetch("/api/v1/ppt/fonts/upload", {
          method: "POST",
          body: form,
        });

        if (!res.ok) throw new Error(res.statusText);

        const data = await res.json();

        const newFont: UploadedFont = {
          fontName: data.font_name || fontName,
          fontUrl: data.font_url,
          fontPath: data.font_path,
        };

        setUploadedFonts((prev) => [...prev, newFont]);
        toast.success(`Font "${fontName}" uploaded`);
        return newFont.fontUrl;
      } catch (err) {
        console.error(err);
        toast.error(`Failed to upload "${fontName}"`);
        return null;
      }
    },
    [UploadedFonts]
  );

  /** ✅ Remove custom font from DOM + state */
  const removeFont = useCallback((fontUrl: string) => {
    setUploadedFonts((prev) => prev.filter((f) => f.fontUrl !== fontUrl));

    const style = document.querySelector(`style[data-font-url="${fontUrl}"]`);
    if (style) style.remove();

    toast.info("Font removed");
  }, []);

  /** ✅ Return unsupported fonts list */
  const getAllUnsupportedFonts = useCallback((): string[] => {
    return fontsData?.not_supported_fonts ?? [];
  }, [fontsData]);

  return {
    UploadedFonts,
    fontsData,
    setFontsData,
    uploadFont,
    removeFont,
    getAllUnsupportedFonts,
  };
};
