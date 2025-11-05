import { useState, useCallback, useRef } from "react";

export const useDrawingCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const slideDisplayRef = useRef<HTMLDivElement | null>(null);

  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [strokeColor, setStrokeColor] = useState<string>("#000000");
  const [eraserMode, setEraserMode] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const [canvasDimensions, setCanvasDimensions] = useState({
    width: 1280,
    height: 720,
  });

  const [didYourDraw, setDidYourDraw] = useState<boolean>(false);

  // ✅ safely return 2D context
  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext("2d") : null;
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];

    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  const startDrawing = useCallback(
    (pos: { x: number; y: number }) => {
      const ctx = getCanvasContext();
      if (!ctx) return;

      setIsDrawing(true);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);

      if (eraserMode) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = strokeWidth * 2;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
      }

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    },
    [eraserMode, strokeColor, strokeWidth]
  );

  const draw = useCallback(
    (pos: { x: number; y: number }) => {
      if (!isDrawing) return;

      const ctx = getCanvasContext();
      if (!ctx) return;

      setDidYourDraw(true);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    },
    [isDrawing]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // ✅ Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    startDrawing(getMousePos(e));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    draw(getMousePos(e));
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    stopDrawing();
  };

  // ✅ Touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    startDrawing(getTouchPos(e));
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    draw(getTouchPos(e));
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    stopDrawing();
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = getCanvasContext();
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDidYourDraw(false);
  };

  const handleEraserModeChange = (isEraser: boolean) => {
    setEraserMode(isEraser);
  };

  const handleStrokeColorChange = (color: string) => {
    setEraserMode(false);
    setStrokeColor(color);
  };

  const handleStrokeWidthChange = (width: number) => {
    setStrokeWidth(width);
  };

  return {
    canvasRef,
    slideDisplayRef,
    strokeWidth,
    strokeColor,
    eraserMode,
    isDrawing,
    canvasDimensions,
    setCanvasDimensions,
    didYourDraw,
    setDidYourDraw,

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
  };
};
