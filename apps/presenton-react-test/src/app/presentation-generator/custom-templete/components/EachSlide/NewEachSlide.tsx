import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { useDrawingCanvas } from "../../hooks/useDrawingCanvas";
import { EachSlideProps } from "../../types";
import { SlideContentDisplay } from "./SlideContentDisplay";
import { useHtmlEdit } from "../../hooks/useHtmlEdit";
import { SlideActions } from "./SlideActions";
import { HtmlEditor } from "./HtmlEditor";
import { EditControls } from "./EditControls";
import { useSlideEdit } from "../../hooks/useSlideEdit";

const EachSlide: React.FC<EachSlideProps> = ({
  slide,
  index,
  retrySlide,
  setSlides,
  onSlideUpdate,
  isProcessing,
}) => {
  // Drawing hook
  const {
    canvasRef,
    slideDisplayRef,
    strokeWidth,
    strokeColor,
    eraserMode,
    isDrawing,
    canvasDimensions,
    setCanvasDimensions,
    didYourDraw,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleClearCanvas,
    handleEraserModeChange,
    handleStrokeColorChange,
    handleStrokeWidthChange,
  } = useDrawingCanvas();

  // Slide edit hook
  const {
    isEditMode,
    isUpdating,
    prompt,
    slideContentRef,
    setPrompt,
    handleSave,
    handleEditClick,
    handleCancelEdit,
  } = useSlideEdit(slide, index, onSlideUpdate, setSlides);

  // HTML edit hook
  const {
    isHtmlEditMode,
    handleHtmlEditClick,
    handleHtmlEditCancel,
    handleHtmlSave,
  } = useHtmlEdit(slide, index, onSlideUpdate, setSlides);

  // Adjust canvas size when edit starts
  React.useEffect(() => {
    if (isEditMode && slideContentRef.current && slide.html) {
      const rect = slideContentRef.current.getBoundingClientRect();
      setCanvasDimensions({
        width: Math.max(rect.width, 800),
        height: Math.max(rect.height, 600),
      });
    }
  }, [isEditMode, slide.html, setCanvasDimensions, slideContentRef]);

  // Save including drawings
  const handleSaveWithDrawing = () => {
    handleSave(slideDisplayRef!, didYourDraw);
  };

  // Delete slide
  const handleDeleteSlide = () => {
    setSlides((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="border-2 font-instrument_sans w-full relative">
      <CardHeader className="max-w-[1280px] mx-auto px-0 py-6">
        <CardTitle className="text-xl">
          <SlideActions
            slide={slide}
            index={index}
            onRetry={() => retrySlide(index)}
            isProcessing={isProcessing}
            isEditMode={isEditMode}
            isHtmlEditMode={isHtmlEditMode}
            onEditClick={handleEditClick}
            onHtmlEditClick={handleHtmlEditClick}
            onDelete={handleDeleteSlide}
          />
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* HTML Editor Drawer */}
        <HtmlEditor
          slide={slide}
          isHtmlEditMode={isHtmlEditMode}
          onSave={handleHtmlSave}
          onCancel={handleHtmlEditCancel}
        />

        {/* Editing controls (draw, erase, prompt, update) */}
        <EditControls
          isEditMode={isEditMode}
          prompt={prompt}
          isUpdating={isUpdating}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          eraserMode={eraserMode}
          onPromptChange={setPrompt}
          onSave={handleSaveWithDrawing}
          onCancel={handleCancelEdit}
          onStrokeWidthChange={handleStrokeWidthChange}
          onStrokeColorChange={handleStrokeColorChange}
          onEraserModeChange={handleEraserModeChange}
          onClearCanvas={handleClearCanvas}
        />

        {/* Slide preview + canvas drawing */}
        <SlideContentDisplay
          slide={slide}
          isEditMode={isEditMode}
          isHtmlEditMode={isHtmlEditMode}
          slideContentRef={slideContentRef}
          slideDisplayRef={slideDisplayRef}
          canvasRef={canvasRef}
          canvasDimensions={canvasDimensions}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          eraserMode={eraserMode}
          isDrawing={isDrawing}
          didYourDraw={didYourDraw}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          retrySlide={() => retrySlide(index)}
        />
      </CardContent>
    </Card>
  );
};

export default EachSlide;
