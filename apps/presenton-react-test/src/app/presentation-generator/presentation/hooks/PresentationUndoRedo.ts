import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../../store/store";
import { undo, redo, finishUndoRedo } from "../../../../store/slices/undoRedoSlice";
import { setPresentationData } from "../../../../store/slices/presentationGeneration";
import { useKeyboardShortcut } from "../../hooks/use-keyboard-shortcut";

export const usePresentationUndoRedo = () => {
  const dispatch = useDispatch();

  const undoRedo = useSelector((state: RootState) => state.undoRedo);
  const { presentationData } = useSelector(
    (state: RootState) => state.presentationGeneration
  );

  const canUndo = undoRedo.past.length > 0;
  const canRedo = undoRedo.future.length > 0;

  const applySlides = (slides: any[]) => {
    if (!presentationData) return;
    const deepCopy = JSON.parse(JSON.stringify(slides));

    dispatch(
      setPresentationData({
        ...presentationData,
        slides: deepCopy,
      })
    );

    setTimeout(() => dispatch(finishUndoRedo()), 100);
  };

  const onUndo = useCallback(() => {
    if (!canUndo) return;

    const previous = undoRedo.past[undoRedo.past.length - 1];
    dispatch(undo());

    if (previous?.slides) {
      applySlides(previous.slides);
    }
  }, [canUndo, undoRedo.past, presentationData]);

  const onRedo = useCallback(() => {
    if (!canRedo) return;

    const next = undoRedo.future[0];
    dispatch(redo());

    if (next?.slides) {
      applySlides(next.slides);
    }
  }, [canRedo, undoRedo.future, presentationData]);

  /**
   * ✅ Keyboard shortcuts
   * CTRL+Z → Undo
   * CTRL+SHIFT+Z → Redo
   */
  useKeyboardShortcut(
    ["z"],
    (e) => {
      if (e.ctrlKey && !e.shiftKey && canUndo) {
        e.preventDefault();
        onUndo();
      }
      if (e.ctrlKey && e.shiftKey && canRedo) {
        e.preventDefault();
        onRedo();
      }
    },
    [canUndo, canRedo, onUndo, onRedo]
  );

  return { onUndo, onRedo, canUndo, canRedo };
};
