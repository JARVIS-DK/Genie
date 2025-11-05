import React, { useState } from "react";
import { Button } from "../../../../components/ui/button";
import {
  SquareArrowOutUpRight,
  Play,
  Loader2,
  Redo2,
  Undo2,
} from "lucide-react";
import Wrapper from "../../../../components/Wrapper";
import { useNavigate, useLocation } from "react-router-dom";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../components/ui/popover";
import { PresentationGenerationApi } from "../../services/api/presentation-generation";
import { OverlayLoader } from "../../../../components/ui/overlay-loader";
import { useDispatch, useSelector } from "react-redux";

import { RootState } from "../../../../store/store";
import { toast } from "sonner";

import Announcement from "../../../../components/Announcement";
import { PptxPresentationModel } from "../../../../types/pptx_models";
import HeaderNav from "../../components/HeaderNab";

import PDFIMAGE from "../assets/pdf.svg";
import PPTXIMAGE from "../assets/pptx.svg";

import { trackEvent, MixpanelEvent } from "../../../../utils/mixpanel";
import { usePresentationUndoRedo } from "../hooks/PresentationUndoRedo";
import ToolTip from "../../../../components/ToolTip";
import { clearPresentationData } from "../../../../store/slices/presentationGeneration";
import { clearHistory } from "../../../../store/slices/undoRedoSlice";

interface HeaderProps {
  presentation_id: string;
  currentSlide?: number;
}

const Header: React.FC<HeaderProps> = ({ presentation_id, currentSlide }) => {
  const [open, setOpen] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dispatch = useDispatch();

  const { presentationData, isStreaming } = useSelector(
    (state: RootState) => state.presentationGeneration
  );

  const { onUndo, onRedo, canUndo, canRedo } = usePresentationUndoRedo();

  const get_presentation_pptx_model = async (
    id: string
  ): Promise<PptxPresentationModel> => {
    const response = await fetch(`/api/presentation_to_pptx_model?id=${id}`);
    return response.json();
  };

  const downloadLink = (path: string) => {
    const link = document.createElement("a");
    link.href = path;
    link.download = path.split("/").pop() || "download";
    document.body.appendChild(link);
    link.click();
  };

  const handleExportPptx = async () => {
    if (isStreaming) return;
    try {
      setOpen(false);
      setShowLoader(true);

      trackEvent(MixpanelEvent.Header_UpdatePresentationContent_API_Call);
      await PresentationGenerationApi.updatePresentationContent(
        presentationData
      );

      trackEvent(MixpanelEvent.Header_GetPptxModel_API_Call);
      const pptx_model = await get_presentation_pptx_model(presentation_id);

      trackEvent(MixpanelEvent.Header_ExportAsPPTX_API_Call);
      const pptx_path = await PresentationGenerationApi.exportAsPPTX(
        pptx_model
      );

      if (!pptx_path) throw new Error("No path returned");
      downloadLink(pptx_path);
    } catch (error) {
      console.error(error);
      toast.error("Having trouble exporting PPTX!");
    } finally {
      setShowLoader(false);
    }
  };

  const handleExportPdf = async () => {
    if (isStreaming) return;
    try {
      setOpen(false);
      setShowLoader(true);

      trackEvent(MixpanelEvent.Header_UpdatePresentationContent_API_Call);
      await PresentationGenerationApi.updatePresentationContent(
        presentationData
      );

      trackEvent(MixpanelEvent.Header_ExportAsPDF_API_Call);
      const response = await fetch("/api/export-as-pdf", {
        method: "POST",
        body: JSON.stringify({
          id: presentation_id,
          title: presentationData?.title,
        }),
      });

      if (!response.ok) throw new Error("PDF export failed");
      const { path } = await response.json();
      downloadLink(path);
    } catch (error) {
      console.error(error);
      toast.error("Having trouble exporting PDF!");
    } finally {
      setShowLoader(false);
    }
  };

  const handleReGenerate = () => {
    dispatch(clearPresentationData());
    dispatch(clearHistory());
    trackEvent(MixpanelEvent.Header_ReGenerate_Button_Clicked, { pathname });
    navigate(`/presentation?id=${presentation_id}&stream=true`);
  };

  const ExportOptions = ({ mobile }: { mobile: boolean }) => (
    <div className={`space-y-2 ${mobile ? "mt-4" : "bg-white"} rounded-lg`}>
      <Button
        onClick={() => {
          trackEvent(MixpanelEvent.Header_Export_PDF_Button_Clicked, {
            pathname,
          });
          handleExportPdf();
        }}
        variant="ghost"
        className="w-full flex gap-2 text-[#5146E5] justify-start"
      >
        <img src={PDFIMAGE} alt="pdf" width={28} />
        Export as PDF
      </Button>

      <Button
        onClick={() => {
          trackEvent(MixpanelEvent.Header_Export_PPTX_Button_Clicked, {
            pathname,
          });
          handleExportPptx();
        }}
        variant="ghost"
        className="w-full flex gap-2 text-[#5146E5] justify-start"
      >
        <img src={PPTXIMAGE} alt="pptx" width={28} />
        Export as PPTX
      </Button>
    </div>
  );

  return (
    <>
      <OverlayLoader
        show={showLoader}
        text="Exporting presentation..."
        showProgress={true}
        duration={40}
      />

      <div className="bg-[#5146E5] w-full shadow-lg sticky top-0">
        <Announcement />
        <Wrapper className="flex items-center justify-between py-1">
          {/* Logo */}
          <a href="/dashboard" className="min-w-[162px]">
            <img className="h-16" src="/logo-white.png" alt="logo" />
          </a>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-4">
            {isStreaming && <Loader2 className="animate-spin text-white w-6" />}

            {/* Re-generate */}
            <button
              onClick={handleReGenerate}
              disabled={isStreaming}
              className="text-white disabled:opacity-50"
            >
              Re-Generate
            </button>

            {/* Undo/Redo */}
            <ToolTip content="Undo">
              <button
                disabled={!canUndo}
                onClick={onUndo}
                className="text-white disabled:opacity-50"
              >
                <Undo2 className="w-6 h-6" />
              </button>
            </ToolTip>

            <ToolTip content="Redo">
              <button
                disabled={!canRedo}
                onClick={onRedo}
                className="text-white disabled:opacity-50"
              >
                <Redo2 className="w-6 h-6" />
              </button>
            </ToolTip>

            {/* Present */}
            <Button
              onClick={() =>
                navigate(
                  `?id=${presentation_id}&mode=present&slide=${
                    currentSlide || 0
                  }`
                )
              }
              variant="ghost"
              className="border border-white text-white rounded-[32px]"
            >
              <Play className="w-4 h-4 mr-1" />
              Present
            </Button>

            {/* Export Popover */}
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button className="text-[#5146E5] bg-white rounded-[32px]">
                  <SquareArrowOutUpRight className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[250px] p-2">
                <ExportOptions mobile={false} />
              </PopoverContent>
            </Popover>

            <HeaderNav />
          </div>

          {/* Mobile menu */}
          <div className="lg:hidden flex items-center gap-4">
            <HeaderNav />
          </div>
        </Wrapper>
      </div>
    </>
  );
};

export default Header;
