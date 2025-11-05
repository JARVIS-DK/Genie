import React from "react";
import SettingPage from "./SettingPage";
import { Helmet } from "react-helmet";

const Page: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Settings | Presenton</title>
        <meta name="description" content="Settings page" />
      </Helmet>

      <SettingPage />
    </>
  );
};

export default Page;
