import { useEffect, useRef, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../../store/store";
import { PresentationGenerationApi } from "../../services/api/presentation-generation";
import { addToHistory } from "../../../../store/slices/undoRedoSlice";

interface UseAutoSaveOptions {
  debounceMs?: number;
  enabled?: boolean;
}

export const useAutoSave = ({
  debounceMs = 1000,
  enabled = true,
}: UseAutoSaveOptions = {}) => {
  const dispatch = useDispatch();

  const { presentationData, isStreaming, isLoading, isLayoutLoading } =
    useSelector((state: RootState) => state.presentationGeneration);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");
  const [isSaving, setIsSaving] = useState(false);

  /**
   * ✅ Debounced auto-save logic
   */
  const debouncedSave = useCallback(
    (data: any) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(async () => {
        if (!data || isSaving) return;

        const json = JSON.stringify(data);
        if (json === lastSavedRef.current) return; // ✅ no change → no save

        try {
          setIsSaving(true);
          await PresentationGenerationApi.updatePresentationContent(data);
          lastSavedRef.current = json;
          console.log("✅ Auto-save completed");
        } catch (err) {
          console.error("❌ Auto-save failed", err);
        } finally {
          setIsSaving(false);
        }
      }, debounceMs);
    },
    [debounceMs, isSaving]
  );

  /**
   * ✅ Trigger save when presentation data changes
   */
  useEffect(() => {
    if (!enabled) return;
    if (!presentationData) return;
    if (isStreaming || isLoading || isLayoutLoading) return;

    // ✅ Save previous version for UNDO
    dispatch(
      addToHistory({
        slides: presentationData.slides,
        actionType: "AUTO_SAVE",
      })
    );

    debouncedSave(presentationData);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [
    presentationData,
    enabled,
    debouncedSave,
    isStreaming,
    isLoading,
    isLayoutLoading,
    dispatch,
  ]);

  return { isSaving };
};
