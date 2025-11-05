import React, { useEffect, useState, useMemo } from "react";
import { Loader2, PlusIcon, Trash2, WandSparkles, StickyNote, SendHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../components/ui/popover";
import { Textarea } from "../../../../components/ui/textarea";
import { toast } from "sonner";
import { PresentationGenerationApi } from "../../services/api/presentation-generation";
import ToolTip from "../../../../components/ToolTip";
import { RootState } from "../../../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { deletePresentationSlide, updateSlide } from "../../../../store/slices/presentationGeneration";
import { useTemplateLayouts } from "../../hooks/useTempleteLayout";
import NewSlide from "../../components/NewSlide";
import { addToHistory } from "../../../../store/slices/undoRedoSlice";
import { useLocation } from "react-router-dom";
import { trackEvent, MixpanelEvent } from "../../../../utils/mixpanel";

interface SlideContentProps {
  slide: any;
  index: number;
  presentationId: string;
}

const SlideContent: React.FC<SlideContentProps> = ({ slide, index, presentationId }) => {
  const dispatch = useDispatch();
  const location = useLocation();

  const [isUpdating, setIsUpdating] = useState(false);
  const [showNewSlideSelection, setShowNewSlideSelection] = useState(false);

  const { presentationData, isStreaming } = useSelector(
    (state: RootState) => state.presentationGeneration
  );

  const { renderSlideContent, loading } = useTemplateLayouts();

  const handleSubmit = async () => {
    const element = document.getElementById(`slide-${slide.index}-prompt`) as HTMLInputElement;
    const value = element?.value;
    if (!value?.trim()) {
      toast.error("Please enter a prompt before submitting");
      return;
    }

    setIsUpdating(true);

    try {
      trackEvent(MixpanelEvent.Slide_Edit_API_Call);

      const response = await PresentationGenerationApi.editSlide(slide.id, value);

      if (response) {
        dispatch(updateSlide({ index: slide.index, slide: response }));
        toast.success("Slide updated successfully");
      }
    } catch (error: any) {
      console.error("Error editing slide:", error);
      toast.error("Error in slide editing.", {
        description: error.message || "Error in slide editing.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const onDeleteSlide = async () => {
    try {
      trackEvent(MixpanelEvent.Slide_Delete_API_Call);

      dispatch(
        addToHistory({
          slides: presentationData?.slides,
          actionType: "DELETE_SLIDE",
        })
      );

      dispatch(deletePresentationSlide(slide.index));
    } catch (error: any) {
      console.error("Error deleting slide:", error);
      toast.error("Error deleting slide.", {
        description: error.message || "Error deleting slide.",
      });
    }
  };

  // Scroll to newest slide when streaming generates more
  useEffect(() => {
    if (
      presentationData &&
      presentationData.slides &&
      presentationData.slides.length > 1 &&
      isStreaming
    ) {
      const lastSlideIndex = presentationData.slides.length - 1;
      const slideElement = document.getElementById(
        `slide-${presentationData.slides[lastSlideIndex].index}`
      );
      if (slideElement) {
        slideElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [presentationData?.slides?.length, isStreaming]);

  const slideContent = useMemo(() => {
    return renderSlideContent(slide, !isStreaming); // Edit mode only when not streaming
  }, [slide, isStreaming, renderSlideContent]);

  // Load Tailwind if custom template
  useEffect(() => {
    if (loading) return;
    if (slide.layout.includes("custom")) {
      const alreadyLoaded = document.querySelector('script[src*="tailwindcss.com"]');
      if (!alreadyLoaded) {
        const script = document.createElement("script");
        script.src = "https://cdn.tailwindcss.com";
        script.async = true;
        document.head.appendChild(script);
      }
    }
  }, [slide, loading, isStreaming]);

  return (
    <div
      id={`slide-${slide.index}`}
      className="w-full max-w-[1280px] main-slide flex items-center justify-center relative max-md:mb-4"
    >
      {isStreaming && (
        <Loader2 className="w-8 h-8 absolute right-2 top-2 z-30 text-blue-800 animate-spin" />
      )}

      <div data-layout={slide.layout} data-group={slide.layout_group} className="w-full group">

        {loading ? (
          <div className="flex flex-col bg-white aspect-video items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          slideContent
        )}

        {/* ✅ Add New Slide */}
        {!showNewSlideSelection && (
          <div className="group-hover:opacity-100 hidden md:block opacity-0 transition-opacity my-4 duration-300">
            {!isStreaming && !loading && (
              <ToolTip content="Add new slide below">
                <div
                  onClick={() => {
                    trackEvent(MixpanelEvent.Slide_Add_New_Slide_Button_Clicked, { pathname: location.pathname });
                    setShowNewSlideSelection(true);
                  }}
                  className="bg-white shadow-md w-[80px] py-2 border hover:border-[#5141e5] duration-300 rounded-lg mx-auto flex justify-center cursor-pointer"
                >
                  <PlusIcon className="text-gray-500" />
                </div>
              </ToolTip>
            )}
          </div>
        )}

        {/* ✅ New Slide Selector */}
        {showNewSlideSelection && !loading && (
          <NewSlide
            index={index}
            templateID={`${slide.layout.split(":")[0]}`}
            setShowNewSlideSelection={setShowNewSlideSelection}
            presentationId={presentationId}
          />
        )}

        {/* ✅ Delete Slide */}
        {!isStreaming && !loading && (
          <ToolTip content="Delete slide">
            <div
              className="absolute top-2 right-2 sm:top-4 sm:right-4 hidden md:block cursor-pointer"
              onClick={() => {
                trackEvent(MixpanelEvent.Slide_Delete_Slide_Button_Clicked, { pathname: location.pathname });
                onDeleteSlide();
              }}
            >
              <Trash2 className="text-gray-500" />
            </div>
          </ToolTip>
        )}

        {/* ✅ Prompt Editor (Wand Button) */}
        {!isStreaming && (
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 hidden md:block">
            <Popover>
              <PopoverTrigger>
                <ToolTip content="Update slide using prompt">
                  <div className="p-2 bg-[#5141e5] rounded-lg cursor-pointer hover:shadow-md">
                    <WandSparkles className="text-white" />
                  </div>
                </ToolTip>
              </PopoverTrigger>

              <PopoverContent side="right" align="start" className="w-[280px] sm:w-[400px] z-20">
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                  }}
                >
                  <Textarea
                    id={`slide-${slide.index}-prompt`}
                    className="w-full p-2 text-sm"
                    placeholder="Enter your prompt..."
                    disabled={isUpdating}
                    rows={4}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />

                  <button
                    disabled={isUpdating}
                    type="submit"
                    className={`bg-[#5146E5] text-white px-4 py-2 rounded-[32px] flex items-center justify-end gap-2 ml-auto ${
                      isUpdating ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                  >
                    {isUpdating ? "Updating..." : "Update"}
                    <SendHorizontal />
                  </button>
                </form>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* ✅ Speaker Notes */}
        {!isStreaming && slide?.speaker_note && (
          <div className="absolute top-2 right-10 sm:top-4 sm:right-14 hidden md:block">
            <Popover>
              <PopoverTrigger asChild>
                <div className="cursor-pointer">
                  <ToolTip content="Show speaker notes">
                    <StickyNote className="text-gray-500" />
                  </ToolTip>
                </div>
              </PopoverTrigger>

              <PopoverContent side="left" align="start" className="w-[320px] z-30">
                <p className="text-xs font-semibold text-gray-600">Speaker notes</p>
                <div className="text-sm text-gray-800 max-h-64 overflow-auto whitespace-pre-wrap">
                  {slide.speaker_note}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlideContent;
