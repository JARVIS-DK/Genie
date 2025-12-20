import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ApiResponseHandler } from "../../services/api/api-error-handler";
import { ProcessedSlide, SlideData, FontData } from "../types";

export const useSlideProcessing = (
  selectedFile: File | null,
  slides: ProcessedSlide[],
  setSlides: React.Dispatch<React.SetStateAction<ProcessedSlide[]>>,
  setFontsData: React.Dispatch<React.SetStateAction<FontData | null>>
) => {
  const [isProcessingPptx, setIsProcessingPptx] = useState(false);

  const processSlideToHtml = useCallback(
    async (slide: SlideData, index: number) => {
      console.log(
        `Starting to process slide ${slide.slide_number} at index ${index}`
      );

      setSlides((prev) =>
        prev.map((s, i) =>
          i === index ? { ...s, processing: true, error: undefined } : s
        )
      );

      try {
        const htmlResponse = await fetch("/api/v1/ppt/slide-to-html/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: slide.screenshot_url,
            xml: slide.xml_content,
            fonts: slide.normalized_fonts ?? [],
          }),
        });

        const htmlData = await ApiResponseHandler.handleResponse(
          htmlResponse,
          `Failed to convert slide ${slide.slide_number} to HTML`
        );

        console.log(`Successfully processed slide ${slide.slide_number}`);

        setSlides((prev) => {
          const newSlides = prev.map((s, i) =>
            i === index
              ? {
                  ...s,
                  processing: false,
                  processed: true,
                  html: htmlData.html,
                }
              : s
          );

          const next = index + 1;
          if (
            next < newSlides.length &&
            !newSlides[next].processed &&
            !newSlides[next].processing
          ) {
            setTimeout(() => {
              processSlideToHtml(newSlides[next], next);
            }, 1000);
          }

          return newSlides;
        });
      } catch (error) {
        console.error(`Error processing slide ${slide.slide_number}:`, error);
        const errorText =
          error instanceof Error ? error.message : "Failed to convert to HTML";

        setSlides((prev) => {
          const newSlides = prev.map((s, i) =>
            i === index
              ? { ...s, processing: false, processed: false, error: errorText }
              : s
          );

          const next = index + 1;
          if (
            next < newSlides.length &&
            !newSlides[next].processed &&
            !newSlides[next].processing
          ) {
            setTimeout(() => {
              processSlideToHtml(newSlides[next], next);
            }, 1000);
          }

          return newSlides;
        });
      }
    },
    [setSlides]
  );

  const processFile = useCallback(async () => {
    if (!selectedFile) {
      toast.error("Please select a PDF or PPTX file first");
      return;
    }

    try {
      setIsProcessingPptx(true);

      const formData = new FormData();
      const fileName = selectedFile.name.toLowerCase();
      const isPdf = fileName.endsWith(".pdf");
      const isPptx = fileName.endsWith(".pptx");

      let slidesResponseData: any;

      if (isPdf) {
        formData.append("pdf_file", selectedFile);
        const pdfResponse = await fetch("/api/v1/ppt/pdf-slides/process", {
          method: "POST",
          body: formData,
        });
        slidesResponseData = await ApiResponseHandler.handleResponse(
          pdfResponse,
          "Failed to process PDF file"
        );
      } else if (isPptx) {
        formData.append("pptx_file", selectedFile);
        const pptxResponse = await fetch("/api/v1/ppt/pptx-slides/process", {
          method: "POST",
          body: formData,
        });
        slidesResponseData = await ApiResponseHandler.handleResponse(
          pptxResponse,
          "Failed to process PPTX file"
        );
      } else {
        throw new Error("Unsupported file type. Upload PDF or PPTX.");
      }

      if (!slidesResponseData.success || !slidesResponseData.slides?.length) {
        throw new Error("No slides found in uploaded file");
      }

      if (slidesResponseData.fonts) {
        setFontsData(slidesResponseData.fonts);
      }

      const initialSlides: ProcessedSlide[] = slidesResponseData.slides.map(
        (slide: any) => ({
          slide_number: slide.slide_number,
          screenshot_url: slide.screenshot_url,
          xml_content: slide.xml_content ?? "",
          normalized_fonts: slide.normalized_fonts ?? [],
          processing: false,
          processed: false,
        })
      );

      setSlides(initialSlides);

      const hasUnsupported =
        Array.isArray(slidesResponseData.fonts?.not_supported_fonts) &&
        slidesResponseData.fonts.not_supported_fonts.length > 0;

      toast.success("Template Processing Finished", {
        description: hasUnsupported
          ? `Upload missing fonts and click Extract Template`
          : `All fonts supported. Starting extraction...`,
      });

      if (!hasUnsupported && initialSlides.length > 0) {
        setTimeout(() => processSlideToHtml(initialSlides[0], 0), 300);
      }
    } catch (err) {
      console.error("Error processing file:", err);
      toast.error("Processing failed", {
        description:
          err instanceof Error ? err.message : "Unexpected error occurred",
      });
    } finally {
      setIsProcessingPptx(false);
    }
  }, [selectedFile, setSlides, setFontsData, processSlideToHtml]);

  const retrySlide = useCallback(
    (index: number) => {
      const slide = slides[index];
      if (slide) processSlideToHtml(slide, index);
    },
    [slides, processSlideToHtml]
  );

  return {
    isProcessingPptx,
    processFile,
    processSlideToHtml,
    retrySlide,
  };
};
