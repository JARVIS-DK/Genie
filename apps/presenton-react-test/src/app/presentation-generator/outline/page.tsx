import { Helmet } from "react-helmet";
import React from "react";
import Header from "../dashboard/components/Header";
import OutlinePage from "./components/OutlinePage";

const Page: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Outline Presentation</title>
        <meta
          name="description"
          content="Customize and organize your presentation outline. Drag and drop slides, add charts, and generate your presentation with ease."
        />
        <link rel="canonical" href="https://presenton.ai/create" />
        <meta
          name="keywords"
          content="presentation generator, AI presentations, data visualization, automatic presentation maker, professional slides, data-driven presentations, document to presentation, presentation automation, smart presentation tool, business presentations"
        />
      </Helmet>

      <div className="relative min-h-screen">
        <Header />
        <OutlinePage />
      </div>
    </>
  );
};

export default Page;
