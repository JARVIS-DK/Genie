import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { RootState } from "../../../store/store";
import { Skeleton } from "../../../components/ui/skeleton";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { AlertCircle } from "lucide-react";
import { trackEvent, MixpanelEvent } from "../../../utils/mixpanel";
import { setPresentationData } from "../../../store/slices/presentationGeneration";
import { DashboardApi } from "../services/api/dashboard";
import { useLayout } from "../context/LayoutContext";
import { useFontLoader } from "../hooks/useFontLoader";
// import { useTemplateLayouts } from "../hooks/useTemplateLayout";
import { useTemplateLayouts } from "../hooks/useTempleteLayout";

interface PresentationPageProps {
  presentation_id: string;
}

const PresentationPage: React.FC<PresentationPageProps> = ({ presentation_id }) => {
  const { renderSlideContent, loading } = useTemplateLayouts();
  const location = useLocation();
  const [contentLoading, setContentLoading] = useState(true);
  const { getCustomTemplateFonts } = useLayout();
  const dispatch = useDispatch();
  const { presentationData } = useSelector((state: RootState) => state.presentationGeneration);
  const [error, setError] = useState(false);

  // Load Fonts for Custom Templates
  useEffect(() => {
    if (!loading && presentationData?.slides && presentationData.slides.length > 0) {
      const templateId = presentationData.slides[0].layout.split(":")[0].split("custom-")[1];
      const fonts = getCustomTemplateFonts(templateId);
      useFontLoader(fonts || []);
    }
  }, [presentationData, loading, getCustomTemplateFonts]);

  // Load Tailwind script if custom slide
  useEffect(() => {
    if (presentationData?.slides?.[0]?.layout.includes("custom")) {
      const existingScript = document.querySelector('script[src*="tailwindcss.com"]');
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://cdn.tailwindcss.com";
        script.async = true;
        document.head.appendChild(script);
      }
    }
  }, [presentationData]);

  // Fetch Slides
  useEffect(() => {
    fetchUserSlides();
  }, []);

  const fetchUserSlides = async () => {
    try {
      const data = await DashboardApi.getPresentation(presentation_id);
      dispatch(setPresentationData(data));
      setContentLoading(false);
    } catch (error) {
      setError(true);
      toast.error("Failed to load presentation");
      console.error("Error fetching user slides:", error);
      setContentLoading(false);
    }
  };

  return (
    <div className="flex overflow-hidden flex-col">
      {error ? (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
          <div
            className="bg-white border border-red-300 text-red-700 px-6 py-8 rounded-lg shadow-lg flex flex-col items-center"
            role="alert"
          >
            <AlertCircle className="w-16 h-16 mb-4 text-red-500" />
            <strong className="font-bold text-4xl mb-2">Oops!</strong>
            <p className="block text-2xl py-2">
              We encountered an issue loading your presentation.
            </p>
            <p className="text-lg py-2">
              Please check your internet connection or try again later.
            </p>
            <Button
              className="mt-4 bg-red-500 text-white hover:bg-red-600 focus:ring-4 focus:ring-red-300"
              onClick={() => {
                trackEvent(MixpanelEvent.PdfMaker_Retry_Button_Clicked, { pathname: location.pathname });
                window.location.reload();
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div
            id="presentation-slides-wrapper"
            className="mx-auto flex flex-col items-center overflow-hidden justify-center"
          >
            {!presentationData ||
            loading ||
            contentLoading ||
            !presentationData.slides ||
            presentationData.slides.length === 0 ? (
              <div className="relative w-full h-[calc(100vh-120px)] mx-auto">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="aspect-video bg-gray-400 my-4 w-full mx-auto max-w-[1280px]"
                  />
                ))}
              </div>
            ) : (
              presentationData.slides.map((slide: any, index: number) => (
                <div key={index} className="w-full" data-speaker-note={slide.speaker_note}>
                  {renderSlideContent(slide, true)}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PresentationPage;
