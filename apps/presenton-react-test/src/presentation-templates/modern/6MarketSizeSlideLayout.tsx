import React from "react";
import * as z from "zod";
import { ImageSchema } from "@/presentation-templates/defaultSchemes";

export const layoutId = "market-size-pitchdeck-slide";
export const layoutName = "Market Size Pitch Deck Slide";
export const layoutDescription =
  "A professional slide layout designed to present market size statistics, including TAM, SAM, and SOM, with a world map and key metrics.";

const marketSizeSlideSchema = z.object({
  title: z.string().min(3).max(15).default("Market Size").meta({
    description: "Main slide title",
  }),
  companyName: z.string().min(2).max(50).default("presenton").meta({
    description: "Company name displayed in header",
  }),
  date: z.string().min(5).max(50).default("June 13, 2038").meta({
    description: "Today Date displayed in header",
  }),
  mapImage: ImageSchema.default({
    __image_url__:
      "https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg", // You can quickly find a world map image via a Google search or use a free resource like Wikimedia Commons
    __image_prompt__: "World map with location pins or points",
  }),
  marketStats: z
    .array(
      z.object({
        label: z.string().min(3).max(30),
        value: z.string().min(3).max(30),
        description: z.string().min(3).max(130),
      }),
    )
    .min(1)
    .max(3)
    .default([
      {
        label: "Total Available Market (TAM)",
        value: "1.4 Billion",
        description:
          "In the TAM Section, we can fill in the potential of any person who can buy an offer or the maximum amount of revenue a business can earn by selling their offer.",
      },
      {
        label: "Serviceable Available Market (SAM)",
        value: "194 Million",
        description:
          "It is a part of TAM that has the potential to become a target market for the company by considering the type of product, technology available and geographical conditions.",
      },
      {
        label: "Serviceable Obtainable Market (SOM)",
        value: "167 Million",
        description:
          "The SOM is a smaller fraction of the SAM that is the target of a serviceable and realistically achievable market in the short to medium term.",
      },
    ])
    .meta({
      description:
        "Market statistics including TAM, SAM, and SOM with labels, values, and descriptions.",
    }),
  description: z
    .string()
    .default(
      "Market size is the total amount of all sales and customers that can be seen directly by stakeholders. This technique is usually calculated at the end of the year, the market size can be used by companies to determine the potential of their market and business in the future. This is very useful, especially for new companies that will offer services to those who are interested in our services.",
    )
    .meta({
      description: "Main description text for the slide",
    }),
});

export const Schema = marketSizeSlideSchema;
export type MarketSizeSlideData = z.infer<typeof marketSizeSlideSchema>;

interface MarketSizeSlideProps {
  data?: Partial<MarketSizeSlideData>;
}

const MarketSizeSlideLayout: React.FC<MarketSizeSlideProps> = ({
  data: slideData,
}) => {
  const stats = slideData?.marketStats || [];

  return (
    <>
      {/* Montserrat Font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap"
        rel="stylesheet"
      />

      <div
        className="w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video bg-white relative z-20 mx-auto overflow-hidden"
        style={{
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        {/* Header */}
        <div className="absolute top-8 left-10 right-10 flex justify-between items-center text-[#1E4CD9] text-sm font-semibold">
          <span>{slideData?.companyName || "Rimberio"}</span>
          <span>{slideData?.date || "June 13, 2038"}</span>
        </div>

        {/* Main Content */}
        <div className="flex h-full px-16 pb-16">
          {/* Title and Map on the left */}
          <div className="flex flex-col items-center justify-center w-[48%] pr-8 h-full">
            <div className="flex flex-col items-left justify-center h-full w-full">
              {/* Move the title down to align with the top of the market stats */}
              <h1
                className="text-6xl font-bold text-blue-600 mb-8 leading-tight text-left"
                style={{ marginTop: "112px" }} // 112px matches top-36 (9rem) of stats
              >
                {slideData?.title || "Market Size"}
              </h1>
              <div className="w-full bg-[#CBE3CC] rounded-md mb-8 flex items-center justify-center">
                {slideData?.mapImage?.__image_url__ && (
                  <img
                    src={slideData?.mapImage?.__image_url__}
                    alt="Market World Map with Points"
                    className="w-full object-contain rounded-md"
                    style={{ maxHeight: 220 }}
                  />
                )}
              </div>
              {slideData?.description && (
                <p className="text-blue-600 text-sm leading-relaxed font-normal mb-12 max-w-lg text-left">
                  {slideData?.description}
                </p>
              )}
            </div>
          </div>

          {/* Market Stats on the right */}
          <div className="flex flex-col items-start justify-center w-[52%] gap-8">
            <div className="absolute top-36 right-10 w-[42%] space-y-10">
              {stats.map((stat, index) => (
                <div key={index}>
                  <div className="space-y-2">
                    <div className="bg-[#1E4CD9] text-white text-sm font-semibold px-3 py-1 inline-block rounded-sm">
                      <span className="text-sm">{stat.label}</span>
                    </div>
                    <div className="text-2xl font-bold text-[#1E4CD9]">
                      {stat.value}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-snug">
                    {stat.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MarketSizeSlideLayout;
