import React from "react";
import * as z from "zod";

export const layoutId = "thank-you-slide";
export const layoutName = "Thank You Slide";
export const layoutDescription =
  "A simple, plain thank you slide for closing presentations. This is always the last slide in a presentation, providing a clean and professional closing message with company contact information.";

const thankYouSlideSchema = z.object({
  title: z.string().min(3).max(30).default("Thank You!").meta({
    description: "Main thank you message",
  }),
  subtitle: z.string().min(0).max(100).default("").meta({
    description: "Optional subtitle or closing remark",
  }),
  companyName: z.string().min(2).max(50).default("presenton").meta({
    description: "Company name displayed in header",
  }),
  date: z.string().min(5).max(50).default("June 13, 2038").meta({
    description: "Today Date displayed in header",
  }),
  address: z
    .string()
    .min(5)
    .max(100)
    .default("123 Anywhere St., Any City, ST 12345")
    .meta({
      description: "Company address for contact section",
    }),
  phone: z.string().min(5).max(30).default("+123-456-7890").meta({
    description: "Company phone number for contact section",
  }),
  website: z.string().min(5).max(100).default("www.reallygreatsite.com").meta({
    description: "Company website for contact section",
  }),
  email: z.string().default("info@reallygreatsite.com").meta({
    description: "Company email address for contact section",
  }),
});

export const Schema = thankYouSlideSchema;

export type ThankYouSlideData = z.infer<typeof thankYouSlideSchema>;

interface ThankYouSlideLayoutProps {
  data?: Partial<ThankYouSlideData>;
}

const ThankYouSlideLayout: React.FC<ThankYouSlideLayoutProps> = ({ data }) => {
  return (
    <>
      {/* Import fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap"
        rel="stylesheet"
      />

      <div
        className="w-full rounded-sm max-w-[1280px] shadow-lg max-h-[720px] aspect-video relative z-20 mx-auto overflow-hidden flex flex-col"
        style={{
          fontFamily: "Montserrat, sans-serif",
          backgroundColor: "#1E4CD9", // blue background
        }}
      >
        {/* Header */}
        <div className="absolute top-8 left-10 right-10 flex justify-between items-center text-white text-sm font-semibold">
          <span>{data?.companyName || "Rimberio"}</span>
          <span>{data?.date || "June 13, 2038"}</span>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 flex-col px-16 pb-16 justify-between">
          {/* Thank You and description */}
          <div className="flex flex-col items-start w-full pt-16">
            <h1 className="font-bold text-8xl text-white mb-6 mt-8 text-left w-full">
              {data?.title || "Thank You!"}
            </h1>
            {data?.subtitle && (
              <div className="text-xl text-blue-100 font-normal text-left w-full mb-2">
                {data.subtitle}
              </div>
            )}
          </div>

          {/* Footer area */}
          <div className="flex w-full items-end justify-between mt-auto">
            {/* Left: We are ready to assist you */}
            <div className="flex flex-col">
              <div
                className="font-bold text-white text-left mb-3"
                style={{
                  fontSize: "2rem",
                  marginBottom: 0,
                }}
              >
                We are ready to assist you
              </div>
            </div>
            {/* Right: Contacts */}
            <div className="flex flex-col items-end text-white text-sm space-y-2 min-w-[220px]">
              <div className="flex items-center gap-2">
                <span role="img" aria-label="address">
                  📍
                </span>
                <span>{data?.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <span role="img" aria-label="phone">
                  📞
                </span>
                <span>{data?.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <span role="img" aria-label="website">
                  🌐
                </span>
                <span>{data?.website}</span>
              </div>
              <div className="flex items-center gap-2">
                <span role="img" aria-label="email">
                  ✉️
                </span>
                <span>{data?.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom border line */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-white"></div>
      </div>
    </>
  );
};

export default ThankYouSlideLayout;
