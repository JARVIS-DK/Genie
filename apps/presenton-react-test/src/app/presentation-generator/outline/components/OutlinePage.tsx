import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import { RootState } from "../../../../store/store";
import { useSelector } from "react-redux";
import { OverlayLoader } from "../../../../components/ui/overlay-loader";
import Wrapper from "../../../../components/Wrapper";
import OutlineContent from "./OutlineContent";
import EmptyStateView from "./EmptyStateView";
import GenerateButton from "./GenerateButton";

import { TABS, Template } from "../types/index";
import { useOutlineStreaming } from "../hooks/useOutlineStreaming";
import { useOutlineManagement } from "../hooks/useOutlineManagement";
import { usePresentationGeneration } from "../hooks/usePresentationGeneration";
import TemplateSelection from "./TemplateSelection";

const OutlinePage: React.FC = () => {
  const { presentation_id, outlines } = useSelector(
    (state: RootState) => state.presentationGeneration
  );

  const [activeTab, setActiveTab] = useState<string>(TABS.OUTLINE);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );

  const streamState = useOutlineStreaming(presentation_id);
  const { handleDragEnd, handleAddSlide } = useOutlineManagement(outlines);
  const { loadingState, handleSubmit } = usePresentationGeneration(
    presentation_id,
    outlines,
    selectedTemplate,
    setActiveTab
  );

  if (!presentation_id) {
    return <EmptyStateView />;
  }

  return (
    <div className="h-[calc(100vh-72px)]">
      <OverlayLoader
        show={loadingState.isLoading}
        text={loadingState.message}
        showProgress={loadingState.showProgress}
        duration={loadingState.duration}
      />

      <Wrapper className="h-full flex flex-col w-full">
        <div className="flex-grow overflow-y-hidden w-[1200px] mx-auto">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            <TabsList className="grid w-[50%] mx-auto my-4 grid-cols-2">
              <TabsTrigger value={TABS.OUTLINE}>
                Outline & Content
              </TabsTrigger>
              <TabsTrigger value={TABS.LAYOUTS}>
                Select Template
              </TabsTrigger>
            </TabsList>

            <div className="flex-grow w-full mx-auto">
              <TabsContent
                value={TABS.OUTLINE}
                className="h-[calc(100vh-16rem)] overflow-y-auto custom_scrollbar"
              >
                <OutlineContent
                  outlines={outlines}
                  isLoading={streamState.isLoading}
                  isStreaming={streamState.isStreaming}
                  activeSlideIndex={streamState.activeSlideIndex}
                  highestActiveIndex={streamState.highestActiveIndex}
                  onDragEnd={handleDragEnd}
                  onAddSlide={handleAddSlide}
                />
              </TabsContent>

              <TabsContent
                value={TABS.LAYOUTS}
                className="h-[calc(100vh-16rem)] overflow-y-auto custom_scrollbar"
              >
                <TemplateSelection
                  selectedTemplate={selectedTemplate}
                  onSelectTemplate={setSelectedTemplate}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Bottom Action Button */}
        <div className="py-4 border-t border-gray-200">
          <div className="max-w-[1200px] mx-auto">
            <GenerateButton
              outlineCount={outlines.length}
              loadingState={loadingState}
              streamState={streamState}
              selectedTemplate={selectedTemplate}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </Wrapper>
    </div>
  );
};

export default OutlinePage;
