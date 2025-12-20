import React from "react";
import PresentationPage from "./components/PresentationPage";
import { Button } from "../../../components/ui/button"; // ✅ updated alias
import { useNavigate, useSearchParams } from "react-router-dom";

const Page: React.FC = () => {
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

  return <PresentationPage presentation_id={queryId} />;
};

export default Page;
