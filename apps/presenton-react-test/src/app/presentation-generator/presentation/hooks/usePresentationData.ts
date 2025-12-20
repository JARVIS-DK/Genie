import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { setPresentationData } from "../../../../store/slices/presentationGeneration";
import { DashboardApi } from "../../services/api/dashboard";
import { clearHistory } from "../../../../store/slices/undoRedoSlice";

export const usePresentationData = (
  presentationId: string,
  setLoading: (loading: boolean) => void,
  setError: (error: boolean) => void
) => {
  const dispatch = useDispatch();

  const fetchUserSlides = useCallback(async () => {
    setLoading(true);

    try {
      const data = await DashboardApi.getPresentation(presentationId);

      if (!data) {
        setError(true);
        toast.error("No presentation found");
        return;
      }

      dispatch(setPresentationData(data));
      dispatch(clearHistory());
      setError(false);
    } catch (error) {
      console.error("❌ Error fetching user slides:", error);
      setError(true);
      toast.error("Failed to load presentation");
    } finally {
      setLoading(false);
    }
  }, [presentationId, dispatch, setLoading, setError]);

  return { fetchUserSlides };
};
