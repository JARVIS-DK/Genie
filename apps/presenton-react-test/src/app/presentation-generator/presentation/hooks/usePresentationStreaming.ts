import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import {
  clearPresentationData,
  setPresentationData,
  setStreaming,
} from "../../../../store/slices/presentationGeneration";
import { jsonrepair } from "jsonrepair";
import { toast } from "sonner";
import { MixpanelEvent, trackEvent } from "../../../../utils/mixpanel";

export const usePresentationStreaming = (
  presentationId: string,
  stream: string | null,
  setLoading: (loading: boolean) => void,
  setError: (error: boolean) => void,
  fetchUserSlides: () => void
) => {
  const dispatch = useDispatch();
  const previousSlidesLength = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!presentationId) return;
    let accumulated = "";

    const cleanupStream = () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      dispatch(setStreaming(false));
    };

    const removeStreamFromURL = () => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("stream");
        window.history.replaceState({}, "", url.toString());
      } catch (err) {
        console.error("Failed to modify URL:", err);
      }
    };

    const startStream = () => {
      dispatch(setStreaming(true));
      dispatch(clearPresentationData());
      setLoading(true);

      trackEvent(MixpanelEvent.Presentation_Stream_API_Call);

      const es = new EventSource(`/api/v1/ppt/presentation/stream/${presentationId}`);
      eventSourceRef.current = es;

      es.addEventListener("response", (evt: any) => {
        try {
          const payload = JSON.parse(evt.data);

          switch (payload.type) {
            case "chunk": {
              accumulated += payload.chunk;

              try {
                const repaired = jsonrepair(accumulated);
                const partial = JSON.parse(repaired);

                if (partial.slides?.length) {
                  const hasNewSlides =
                    partial.slides.length !== previousSlidesLength.current;

                  if (hasNewSlides) {
                    dispatch(
                      setPresentationData({
                        ...partial,
                        slides: partial.slides,
                      })
                    );
                    previousSlidesLength.current = partial.slides.length;
                    setLoading(false);
                  }
                }
              } catch {
                // JSON incomplete — we wait for more chunks
              }
              break;
            }

            case "complete": {
              cleanupStream();
              try {
                dispatch(setPresentationData(payload.presentation));
                setLoading(false);
                removeStreamFromURL();
              } catch (err) {
                console.error("Error parsing complete payload:", err);
              }
              accumulated = "";
              break;
            }

            case "closing": {
              cleanupStream();
              dispatch(setPresentationData(payload.presentation));
              setLoading(false);
              removeStreamFromURL();
              break;
            }

            case "error": {
              cleanupStream();
              setError(true);
              setLoading(false);
              toast.error("Streaming failed", {
                description:
                  payload.detail ||
                  "Connection was lost. Please try again.",
              });
              break;
            }
          }
        } catch (err) {
          console.error("Failed to parse stream event:", err);
        }
      });

      es.onerror = () => {
        cleanupStream();
        setError(true);
        setLoading(false);
        console.error("EventSource connection error");
        toast.error("Connection lost. Try refreshing.");
      };
    };

    if (stream) {
      startStream();
    } else {
      fetchUserSlides();
    }

    return () => cleanupStream();
  }, [presentationId, stream, dispatch, setLoading, setError, fetchUserSlides]);
};
