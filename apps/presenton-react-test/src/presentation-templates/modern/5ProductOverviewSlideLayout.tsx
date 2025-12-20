import React from "react";
import * as z from "zod";
import { ImageSchema } from "@/presentation-templates/defaultSchemes";

export const layoutId = "product-overview-slide";
export const layoutName = "Product Overview Slide";
export const layoutDescription =
  "A slide layout designed to showcase a company's products or services, highlighting their features and benefits in a structured format.";

const productOverviewSlideSchema = z.object({
  companyName: z.string().min(2).max(50).default("presenton").meta({
    description: "Company name displayed in header",
  }),
  date: z.string().min(5).max(50).default("June 13, 2038").meta({
    description: "Today Date displayed in header",
  }),
  title: z.string().min(3).max(40).default("Product Overview").meta({
    description: "Main title of the slide",
  }),
  mainDescription: z
    .string()
    .min(50)
    .max(400)
    .default(
      "Provide an explanation of the general profile of the services we have. Arrange information about our products services in a systematic and fact-based manner. Also express our pride in the service that we have done well.",
    )
    .meta({
      description: "Main content text describing the product overview",
    }),
  products: z
    .array(
      z.object({
        title: z.string().min(3).max(50).meta({
          description: "Product title",
        }),
        description: z.string().min(30).max(140).meta({
          description: "Product description",
        }),
        image: ImageSchema.meta({
          description: "Product image",
        }),
        isBlueBackground: z.boolean().default(false).meta({
          description: "Whether the product box has a blue background",
        }),
      }),
    )
    .min(2)
    .max(2)
    .default([
      {
        title: "Internet of Things",
        description:
          "Detail and explain each product. Our examination of community and market issues increases with additional products/services.",
        image: {
          __image_url__:
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop",
          __image_prompt__: "Person working on electronics with headphones",
        },
        isBlueBackground: true,
      },
      {
        title: "Smart Home Platform",
        description:
          "Our alternate product category is available. Our products must work together to solve social and economic issues.",
        image: {
          __image_url__:
            "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=300&h=200&fit=crop",
          __image_prompt__:
            "Woman working at computer with technical equipment",
        },
        isBlueBackground: true,
      },
    ])
    .meta({
      description: "List of products or services to showcase",
    }),
});

export const Schema = productOverviewSlideSchema;

export type ProductOverviewSlideData = z.infer<
  typeof productOverviewSlideSchema
>;

interface ProductOverviewSlideLayoutProps {
  data?: Partial<ProductOverviewSlideData>;
}

const ProductOverviewSlideLayout: React.FC<ProductOverviewSlideLayoutProps> = ({
  data: slideData,
}) => {
  const products = slideData?.products || [];

  // Make the product boxes smaller
  const PRODUCT_BOX_HEIGHT = 400; // px (smaller than before)
  const PRODUCT_BOX_WIDTH = 200; // px (smaller than before)
  const TEXT_SECTION_HEIGHT = Math.round(PRODUCT_BOX_HEIGHT * 0.56); // ~190px
  const IMAGE_SECTION_HEIGHT = PRODUCT_BOX_HEIGHT - TEXT_SECTION_HEIGHT; // ~150px

  return (
    <>
      {/* Import Google Fonts */}
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
          <span>{slideData?.companyName}</span>
          <span>{slideData?.date}</span>
        </div>

        {/* Main Content */}
        <div className="flex h-full px-16 pb-16">
          {/* Title and Description on the left */}
          <div className="flex flex-col items-start justify-center w-[48%] pr-8">
            <h1 className="text-6xl font-bold text-blue-600 mb-8 leading-tight text-left">
              {slideData?.title}
            </h1>
            <p className="text-blue-600 text-lg leading-relaxed font-normal mb-12 max-w-lg text-left">
              {slideData?.mainDescription}
            </p>
          </div>

          {/* Product Grid on the right */}
          <div className="flex flex-row items-center justify-end w-[62%] gap-8">
            {/* First Column: Normal order (Text above, Image below) */}
            <div className="flex flex-col items-center gap-4 justify-center h-full">
              {products[0] && (
                <div
                  className="flex flex-col items-stretch"
                  style={{
                    width: `${PRODUCT_BOX_WIDTH + 40}px`,
                    height: `${PRODUCT_BOX_HEIGHT + 60}px`,
                  }}
                >
                  {/* Top Section - Blue background with text */}
                  <div
                    className={`${products[0].isBlueBackground ? "bg-blue-600" : "bg-gray-100"} p-5 flex flex-col justify-center text-center rounded-t-md`}
                    style={{ height: `${TEXT_SECTION_HEIGHT + 32}px` }}
                  >
                    <h2
                      className={`text-xl font-semibold mb-3 ${products[0].isBlueBackground ? "text-white" : "text-blue-600"}`}
                    >
                      {products[0].title}
                    </h2>
                    <p
                      className={`text-sm leading-relaxed ${products[0].isBlueBackground ? "text-white" : "text-blue-600"}`}
                    >
                      {products[0].description}
                    </p>
                  </div>
                  {/* Bottom Section - Image */}
                  <div
                    className="rounded-b-md overflow-hidden"
                    style={{ height: `${IMAGE_SECTION_HEIGHT + 28}px` }}
                  >
                    <img
                      src={products[0].image.__image_url__}
                      alt={
                        products[0].image.__image_prompt__ || products[0].title
                      }
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
            {/* Second Column: Reverse order (Image above, Text below) */}
            <div className="flex flex-col items-center gap-4 justify-center h-full">
              {products[1] && (
                <div
                  className="flex flex-col items-stretch"
                  style={{
                    width: `${PRODUCT_BOX_WIDTH + 40}px`,
                    height: `${PRODUCT_BOX_HEIGHT + 60}px`,
                  }}
                >
                  {/* Top Section - Image */}
                  <div
                    className="rounded-t-md overflow-hidden"
                    style={{ height: `${IMAGE_SECTION_HEIGHT + 28}px` }}
                  >
                    <img
                      src={products[1].image.__image_url__}
                      alt={
                        products[1].image.__image_prompt__ || products[1].title
                      }
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Bottom Section - Blue background with text */}
                  <div
                    className={`${products[1].isBlueBackground ? "bg-blue-600" : "bg-gray-100"} p-5 flex flex-col justify-center text-center rounded-b-md`}
                    style={{ height: `${TEXT_SECTION_HEIGHT + 32}px` }}
                  >
                    <h2
                      className={`text-xl font-semibold mb-3 ${products[1].isBlueBackground ? "text-white" : "text-blue-600"}`}
                    >
                      {products[1].title}
                    </h2>
                    <p
                      className={`text-sm leading-relaxed ${products[1].isBlueBackground ? "text-white" : "text-blue-600"}`}
                    >
                      {products[1].description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Bottom Border */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
      </div>
    </>
  );
};

export default ProductOverviewSlideLayout;
