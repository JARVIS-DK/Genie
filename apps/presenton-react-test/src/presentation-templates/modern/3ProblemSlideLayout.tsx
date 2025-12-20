import React from "react";
import * as z from "zod";
import { ImageSchema, IconSchema } from "@/presentation-templates/defaultSchemes";

export const layoutId = "problem-statement-slide";
export const layoutName = "Problem Statement Slide";
export const layoutDescription =
  "A slide layout designed to present a clear problem statement, including categories of problems, company information, and an optional image.";

const problemStatementSlideSchema = z.object({
  title: z.string().min(3).max(20).default("Problem").meta({
    description: "Main title of the problem statement slide",
  }),
  description: z
    .string()
    .min(50)
    .max(200)
    .default(
      "A problem needs to be discussed further and in detail because this problem is the main foundation in the initial development of a product, service, and decision making. Without a well-defined problem, it will have an impact on a job that is unfocused, unmanaged, and less relevant.",
    )
    .meta({
      description: "Main content text describing the problem statement",
    }),
  problemCategories: z
    .array(
      z.object({
        title: z.string().min(3).max(30).meta({
          description: "Title of the problem category",
        }),
        description: z.string().min(20).max(100).meta({
          description: "Description of the problem category",
        }),
        icon: IconSchema.optional().meta({
          description: "Optional icon for the problem category",
        }),
      }),
    )
    .min(2)
    .max(3)
    .default([
      {
        title: "Inefficiency",
        description:
          "Businesses struggle to find digital tools that meet their needs, causing operational slowdowns.",
        icon: {
          __icon_url__:
            "/static/icons/placeholder.svg",
          __icon_query__: "warning alert inefficiency",
        },
      },
      {
        title: "High Costs",
        description:
          "Outdated systems increase expenses, while small businesses struggle to expand their market reach.",
        icon: {
          __icon_url__:
            "/static/icons/placeholder.svg",
          __icon_query__: "trending up costs chart",
        },
      },
      {
        title: "Inefficiency",
        description:
          "Businesses struggle to find digital tools that meet their needs, causing operational slowdowns.",
        icon: {
          __icon_url__:
            "/static/icons/placeholder.svg",
          __icon_query__: "warning alert inefficiency",
        },
      },
      {
        title: "Inefficiency",
        description:
          "Businesses struggle to find digital tools that meet their needs, causing operational slowdowns.",
        icon: {
          __icon_url__:
            "/static/icons/placeholder.svg",
          __icon_query__: "warning alert inefficiency",
        },
      },
    ])
    .meta({
      description:
        "List of problem categories with titles, descriptions, and optional icons",
    }),
  companyName: z.string().min(2).max(50).default("presenton").meta({
    description: "Company name displayed in header",
  }),
  date: z.string().min(5).max(30).default("June 13, 2038").meta({
    description: "Today Date displayed in header",
  }),
});

export const Schema = problemStatementSlideSchema;

export type ProblemStatementSlideData = z.infer<
  typeof problemStatementSlideSchema
>;

interface ProblemStatementSlideLayoutProps {
  data?: Partial<ProblemStatementSlideData>;
}

const ProblemStatementSlideLayout: React.FC<
  ProblemStatementSlideLayoutProps
> = ({ data: slideData }) => {
  const problemCategories = slideData?.problemCategories || [];

  return (
    <>
      {/* Import fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap"
        rel="stylesheet"
      />

      <div
        className="w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-blue-600 relative z-20 mx-auto overflow-hidden text-white"
        style={{
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        {/* Header */}
        <div className="absolute top-8 left-10 right-10 flex justify-between items-center text-white text-sm font-semibold">
          <span>{slideData?.companyName}</span>
          <span>{slideData?.date}</span>
        </div>

        {/* Main content area */}
        <div className="flex h-full px-16 pb-16">
          {/* Left side - Main Problem */}
          <div className="flex-1 pr-16 flex flex-col justify-center">
            <div className="flex flex-col items-start justify-center h-full">
              <h2 className="text-5xl font-bold text-white mb-8 leading-tight text-left">
                {slideData?.title}
              </h2>

              <div className="text-lg text-white leading-relaxed font-normal mb-12 max-w-lg text-left">
                {slideData?.description}
              </div>
            </div>
          </div>

          {/* Right side - Problem Categories with Icons */}
          <div className="flex-1 pl-16 flex flex-col justify-center">
            <div className="w-full max-w-xl mx-auto grid grid-cols-1 gap-8">
              {problemCategories.map((category, index) => (
                <div
                  key={index}
                  className="flex items-start gap-5 bg-white bg-opacity-5 rounded-lg p-5"
                >
                  <div className="flex-shrink-0">
                    {category.icon?.__icon_url__ && (
                      <img
                        src={category.icon?.__icon_url__}
                        alt={category.icon?.__icon_query__}
                        className="w-12 h-12"
                        style={{ filter: "invert(1)" }}
                      />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">
                      {category.title}
                    </h3>
                    <p className="text-sm text-blue-100 leading-relaxed max-w-md">
                      {category.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom border line */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-white"></div>
      </div>
    </>
  );
};

export default ProblemStatementSlideLayout;
