import React from "react";
import * as z from "zod";
import { ImageSchema, IconSchema } from "@/presentation-templates/defaultSchemes";

export const layoutId = "about-company-slide";
export const layoutName = "About Our Company Slide";
export const layoutDescription =
  "A slide layout providing an overview of the company, its background, and key information.";

const aboutCompanySlideSchema = z.object({
  title: z.string().min(3).max(30).default("About Our Company").meta({
    description: "Main title of the slide",
  }),
  content: z
    .string()
    .min(25)
    .max(400)
    .default(
      "In the presentation session, the background/introduction can be filled with information that is arranged systematically and effectively with respect to an interesting topic to be used as material for discussion at the opening of the presentation session. The introduction can provide a general overview for those who are listening to your presentation so that the key words on the topic of discussion are emphasized during this background/introductory presentation session.",
    )
    .meta({
      description: "Main content text describing the company or topic",
    }),
  companyName: z.string().min(2).max(50).default("presenton").meta({
    description: "Company name displayed in header",
  }),
  date: z.string().min(5).max(30).default("June 13, 2038").meta({
    description: "Today Date displayed in header",
  }),
  image: ImageSchema.optional().meta({
    description:
      "Optional supporting image for the slide (building, office, etc.)",
  }),
});

export const Schema = aboutCompanySlideSchema;

export type AboutCompanySlideData = z.infer<typeof aboutCompanySlideSchema>;

interface AboutCompanySlideLayoutProps {
  data?: Partial<AboutCompanySlideData>;
}

const AboutCompanySlideLayout: React.FC<AboutCompanySlideLayoutProps> = ({
  data: slideData,
}) => {
  return (
    <>
      {/* Import fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap"
        rel="stylesheet"
      />

      <div
        className="w-full rounded-sm max-w-[1280px] shadow-lg  aspect-video bg-white relative z-20 mx-auto overflow-hidden"
        style={{
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        {/* Header */}
        <div className="absolute top-8 left-10 right-10 flex justify-between items-center text-[#1E4CD9] text-sm font-semibold">
          <span>{slideData?.companyName}</span>
          <span>{slideData?.date}</span>
        </div>

        {/* Main content area */}
        <div className="flex h-full px-16 pb-16">
          {/* Left side - Image */}
          <div className="flex-1 pr-16 flex items-center pt-8">
            <div className="w-full h-96 overflow-hidden">
              {slideData?.image ? (
                <img
                  src={slideData.image.__image_url__}
                  alt={slideData.image.__image_prompt__}
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Default building facade */
                <div className="w-full h-full bg-gray-200 relative">
                  {/* Building structure simulation */}
                  <div className="absolute inset-0 bg-gray-300"></div>

                  {/* Horizontal lines (building floors) */}
                  <div className="absolute inset-0">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-full border-t border-gray-400 opacity-60"
                        style={{ top: `${(i + 1) * 8}%` }}
                      ></div>
                    ))}
                  </div>

                  {/* Vertical lines (building columns) */}
                  <div className="absolute inset-0">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute h-full border-l border-gray-400 opacity-40"
                        style={{ left: `${(i + 1) * 16}%` }}
                      ></div>
                    ))}
                  </div>

                  {/* Windows */}
                  <div className="absolute inset-0 grid grid-cols-4 gap-2 p-4">
                    {[...Array(32)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-blue-100 opacity-60 rounded-sm border border-gray-300"
                      ></div>
                    ))}
                  </div>

                  {/* Building edge highlight */}
                  <div className="absolute right-0 top-0 w-1 h-full bg-white opacity-80"></div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Content */}
          <div className="flex-1 pl-16 flex flex-col justify-center">
            {slideData?.title && (
              <h2 className="text-6xl font-bold text-blue-600 mb-12 leading-tight">
                {slideData?.title}
              </h2>
            )}

            {slideData?.content && (
              <div className="text-lg text-blue-600 leading-relaxed font-normal max-w-lg">
                {slideData?.content}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AboutCompanySlideLayout;
