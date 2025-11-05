import { useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export interface PresentationNavigation {
  isPresentMode: boolean;
  stream: string | null;
  currentSlide: number;
  handleSlideClick: (index: number) => void;
  toggleFullscreen: () => void;
  handlePresentExit: () => void;
  handleSlideChange: (newSlide: number, presentationData: any) => void;
}

export const usePresentationNavigation = (
  presentationId: string,
  selectedSlide: number,
  setSelectedSlide: (slide: number) => void,
  setIsFullscreen: (fullscreen: boolean) => void
): PresentationNavigation => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const fullscreenLock = useRef(false);

  // Parse URL query params
  const params = new URLSearchParams(search);

  const isPresentMode = params.get("mode") === "present";
  const stream = params.get("stream");
  const currentSlide = Number(params.get("slide") ?? selectedSlide ?? 0);

  /** ✅ Scroll and mark selected slide */
  const handleSlideClick = useCallback(
    (index: number) => {
      const el = document.getElementById(`slide-${index}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setSelectedSlide(index);
    },
    [setSelectedSlide]
  );

  /** ✅ Safe fullscreen toggle (prevents rapid double-triggering) */
  const toggleFullscreen = useCallback(() => {
    if (fullscreenLock.current) return;
    fullscreenLock.current = true;

    const release = () => {
      fullscreenLock.current = false;
    };

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setTimeout(release, 300);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setTimeout(release, 300);
      });
    }
  }, [setIsFullscreen]);

  /** ✅ Exit present mode */
  const handlePresentExit = useCallback(() => {
    setIsFullscreen(false);
    navigate(`/presentation?id=${presentationId}`, { replace: true });
  }, [navigate, presentationId, setIsFullscreen]);

  /** ✅ Change slide, update URL */
  const handleSlideChange = useCallback(
    (newSlide: number, presentationData: any) => {
      const len = presentationData?.slides?.length ?? 0;
      if (newSlide < 0 || newSlide >= len) return;

      setSelectedSlide(newSlide);

      navigate(
        `/presentation?id=${presentationId}&mode=present&slide=${newSlide}`,
        { replace: true }
      );
    },
    [navigate, presentationId, setSelectedSlide]
  );

  return {
    isPresentMode,
    stream,
    currentSlide,
    handleSlideClick,
    toggleFullscreen,
    handlePresentExit,
    handleSlideChange,
  };
};
