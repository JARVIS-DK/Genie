import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import PdfMakerPage from "./PdfMakerPage";

interface PdfMakerPageWrapperProps {}

const PdfMakerPageWrapper: React.FC<PdfMakerPageWrapperProps> = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const queryId = params.get("id");

  if (!queryId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold">No presentation id found</h1>
        <p className="text-gray-500 pb-4">Please try again</p>
        <Button onClick={() => navigate("/dashboard")}>Go to home</Button>
      </div>
    );
  }

  return <PdfMakerPage presentation_id={queryId} />;
};

export default PdfMakerPageWrapper;
