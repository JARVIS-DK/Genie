import React from "react";
import UploadPage from "./components/UploadPage";
import Header from "../../../components/Header";

const Page: React.FC = () => {
  return (
    <div className="relative">
      <Header />

      <div className="flex flex-col items-center justify-center py-8">
        <h1 className="text-3xl font-semibold font-instrument_sans">
          Create Presentation
        </h1>
        {/* <p className='text-sm text-gray-500'>We will generate a presentation for you</p> */}
      </div>

      <UploadPage />
    </div>
  );
};

export default Page;
