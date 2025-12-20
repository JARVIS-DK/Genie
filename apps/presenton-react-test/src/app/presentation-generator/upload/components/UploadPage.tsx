/**
 * UploadPage Component (React + TypeScript version)
 *
 * This component handles the presentation upload flow:
 * ✅ configure slides & language
 * ✅ input prompt
 * ✅ upload supporting docs
 * ✅ handles API requests
 */

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";

import { clearOutlines, setPresentationId } from "../../../../store/slices/presentationGeneration";
import { ConfigurationSelects } from "./ConfigurationSelects";
import { PromptInput } from "./PromptInput";

import {
  LanguageType,
  PresentationConfig,
  ToneType,
  VerbosityType,
} from "../type";

import SupportingDoc from "./SupportingDoc";
import { Button } from "../../../../components/ui/button";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { PresentationGenerationApi } from "../../services/api/presentation-generation";
import { OverlayLoader } from "../../../../components/ui/overlay-loader";
import Wrapper from "../../../../components/Wrapper";
import { setPptGenUploadState } from "../../../../store/slices/presentationGenUpload";
import { trackEvent, MixpanelEvent } from "../../../../utils/mixpanel";

// Types for loading state
interface LoadingState {
  isLoading: boolean;
  message: string;
  duration?: number;
  showProgress?: boolean;
  extra_info?: string;
}

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const dispatch = useDispatch();

  const [files, setFiles] = useState<File[]>([]);
  const [config, setConfig] = useState<PresentationConfig>({
    slides: "8",
    language: LanguageType.English,
    prompt: "",
    tone: ToneType.Default,
    verbosity: VerbosityType.Standard,
    instructions: "",
    includeTableOfContents: false,
    includeTitleSlide: false,
    webSearch: false,
  });

  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    message: "",
    duration: 4,
    showProgress: false,
    extra_info: "",
  });

  const handleConfigChange = (key: keyof PresentationConfig, value: string | boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value } as PresentationConfig));
  };

  const validateConfiguration = (): boolean => {
    if (!config.language || !config.slides) {
      toast.error("Please select number of Slides & Language");
      return false;
    }

    if (!config.prompt.trim() && files.length === 0) {
      toast.error("No Prompt or Document Provided");
      return false;
    }

    return true;
  };

  const handleGeneratePresentation = async () => {
    if (!validateConfiguration()) return;

    try {
      if (files.length > 0) {
        await handleDocumentProcessing();
      } else {
        await handleDirectPresentationGeneration();
      }
    } catch (error: any) {
      handleGenerationError(error);
    }
  };

  const handleDocumentProcessing = async () => {
    setLoadingState({
      isLoading: true,
      message: "Processing documents...",
      showProgress: true,
      duration: 90,
      extra_info: "It might take a few minutes for large documents.",
    });

    trackEvent(MixpanelEvent.Upload_Upload_Documents_API_Call);

    const uploadedDocs = await PresentationGenerationApi.uploadDoc(files);

    trackEvent(MixpanelEvent.Upload_Decompose_Documents_API_Call);
    const decomposed = await PresentationGenerationApi.decomposeDocuments(uploadedDocs);

    dispatch(
      setPptGenUploadState({
        config,
        files: decomposed,
      })
    );

    dispatch(clearOutlines());
    trackEvent(MixpanelEvent.Navigation, { from: pathname, to: "/documents-preview" });
    navigate("/documents-preview");
  };

  const handleDirectPresentationGeneration = async () => {
    setLoadingState({
      isLoading: true,
      message: "Generating outlines...",
      showProgress: true,
      duration: 30,
    });

    trackEvent(MixpanelEvent.Upload_Create_Presentation_API_Call);

    const resp = await PresentationGenerationApi.createPresentation({
      content: config.prompt,
      n_slides: parseInt(config.slides),
      file_paths: [],
      language: config.language,
      tone: config.tone,
      verbosity: config.verbosity,
      instructions: config.instructions || null,
      include_table_of_contents: config.includeTableOfContents,
      include_title_slide: config.includeTitleSlide,
      web_search: config.webSearch,
    });

    dispatch(setPresentationId(resp.id));
    dispatch(clearOutlines());
    trackEvent(MixpanelEvent.Navigation, { from: pathname, to: "/outline" });
    navigate("/outline");
  };

  const handleGenerationError = (error: any) => {
    console.error("Error in upload page:", error);
    setLoadingState({ isLoading: false, message: "" });
    toast.error("Error", {
      description: error?.message || "Error in upload page.",
    });
  };

  return (
    <Wrapper className="pb-10 lg:max-w-[70%] xl:max-w-[65%]">
      <OverlayLoader
        show={loadingState.isLoading}
        text={loadingState.message}
        showProgress={loadingState.showProgress}
        duration={loadingState.duration}
        extra_info={loadingState.extra_info}
      />

      <div className="flex flex-col gap-4 md:items-center md:flex-row justify-between py-4">
        <p></p>
        <ConfigurationSelects config={config} onConfigChange={handleConfigChange} />
      </div>

      <div className="relative">
        <PromptInput
          value={config.prompt}
          onChange={(value) => handleConfigChange("prompt", value)}
        />
      </div>

      <SupportingDoc files={files} onFilesChange={setFiles} />

      <Button
        onClick={handleGeneratePresentation}
        className="w-full rounded-[32px] py-6 bg-[#5141e5] text-white font-semibold text-xl flex items-center justify-center hover:bg-[#5141e5]/80"
      >
        <span>Next</span>
        <ChevronRight className="!w-6 !h-6" />
      </Button>
    </Wrapper>
  );
};

export default UploadPage;
