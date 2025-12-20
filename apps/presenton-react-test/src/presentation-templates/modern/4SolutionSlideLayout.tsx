import React from "react";
import * as z from "zod";
import { IconSchema } from "@/presentation-templates/defaultSchemes";

export const layoutId = "solution-slide";
export const layoutName = "Solution Slide";
export const layoutDescription =
  "A slide layout designed to present a solution to previously identified problems, showcasing key aspects of the solution with sections and icons.";

const solutionSlideSchema = z.object({
  companyName: z.string().min(2).max(50).default("presenton").meta({
    description: "Company name displayed in header",
  }),
  date: z.string().min(5).max(30).default("June 13, 2038").meta({
    description: "Today Date displayed in header",
  }),
  title: z.string().min(3).max(25).default("Businesses struggle").meta({
    description: "Main title of the slide",
  }),
  mainDescription: z
    .string()
    .min(20)
    .max(300)
    .default(
      "Show that we offer a solution that solves the problems previously described and identified. Make sure that the solutions we offer uphold the values of effectiveness, efficiency, and are highly relevant to the market situation and society is here and what is hsd sdksdf klfdslkf lkflkfsldkf.",
    )
    .meta({
      description: "Main content text describing the solution",
    }),
  sections: z
    .array(
      z.object({
        title: z.string().min(3).max(30).meta({
          description: "Section title",
        }),
        description: z.string().min(5).max(70).meta({
          description: "Section description",
        }),
        icon: IconSchema.optional().meta({
          description: "Icon for the section",
        }),
      }),
    )
    .min(2)
    .max(3)
    .default([
      {
        title: "Market",
        description:
          "Innovative and widely accepted. Innovative and widely accepted. Innovative and widely accepted.",
        icon: {
          __icon_query__: "market innovation",
          __icon_url__:
            "/static/icons/placeholder.svg",
        },
      },
      {
        title: "Industry",
        description: "Based on sound market decisions.",
        icon: {
          __icon_query__: "industry building",
          __icon_url__:
            "/static/icons/placeholder.svg",
        },
      },
      {
        title: "SEM",
        description: "Driven by precise data and analysis.",
        icon: {
          __icon_query__: "SEM data analysis",
          __icon_url__:
            "/static/icons/placeholder.svg",
        },
      },
      {
        title: "End User",
        description: "Focused on real user impact.",
        icon: {
          __icon_query__: "end user impact",
          __icon_url__:
            "/static/icons/placeholder.svg",
        },
      },
    ])
    .meta({
      description:
        "List of solution sections with titles, descriptions, and optional icons",
    }),
});

export const Schema = solutionSlideSchema;

export type SolutionSlideData = z.infer<typeof solutionSlideSchema>;

interface SolutionSlideLayoutProps {
  data?: Partial<SolutionSlideData>;
}

const SolutionSlideLayout: React.FC<SolutionSlideLayoutProps> = ({
  data: slideData,
}) => {
  const sections = slideData?.sections || [];

  return (
    <>
      {/* Import Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap"
        rel="stylesheet"
      />

      <div
        className="w-full rounded-sm max-w-[1280px] shadow-lg  aspect-video bg-white relative z-20 mx-auto overflow-hidden border-2 border-gray-800"
        style={{
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        {/* Header */}
        <div className="absolute top-8 left-10 right-10 flex justify-between items-center text-[#1E4CD9] text-sm font-semibold">
          <span>{slideData?.companyName}</span>
          <span>{slideData?.date}</span>
        </div>

        {/* Main Content */}
        <div className="flex justify-center items-center h-full px-16 pb-16 gap-4">
          {/* Title and Description */}
          <div className="w-full flex flex-col items-start mb-4">
            <h1 className="text-6xl font-bold text-blue-600 mb-8 leading-tight text-left">
              {slideData?.title}
            </h1>
            <p className="text-blue-600 text-lg leading-relaxed font-normal mb-12 max-w-lg text-left">
              {slideData?.mainDescription}
            </p>
          </div>
          {/* Four Small Boxes in a Row */}
          <div className="grid grid-cols-2 gap-4 w-full ">
            {sections.map((section, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center text-center bg-[#F5F8FE] rounded-lg shadow px-3 py-4 "
              >
                <div className="mb-2">
                  {section?.icon?.__icon_url__ && (
                    <img
                      src={section.icon.__icon_url__}
                      alt={section.icon.__icon_query__}
                      className="w-12 h-12 mb-2"
                    />
                  )}
                </div>
                <h2 className="text-lg font-semibold text-blue-600 mb-1">
                  {section.title}
                </h2>
                <div className="w-8 h-1 bg-blue-600 mb-2"></div>
                <p className="text-blue-600 text-xs leading-snug">
                  {section.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Border */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
      </div>
    </>
  );
};

export default SolutionSlideLayout;
