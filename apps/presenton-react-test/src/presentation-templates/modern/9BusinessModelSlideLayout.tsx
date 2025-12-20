import React from "react";
import * as z from "zod";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export const layoutId = "business-model-slide";
export const layoutName = "Business Model Slide";
export const layoutDescription =
  "A business model presentation slide displaying CAC metrics and monetization strategy.";

const businessModelSchema = z.object({
  companyName: z.string().min(2).max(50).default("presenton").meta({
    description: "Company name displayed in header",
  }),
  date: z.string().min(5).max(50).default("June 13, 2038").meta({
    description: "Today Date displayed in header",
  }),
  title: z.string().min(3).max(20).default("Business Model"),
  description: z
    .string()
    .default(
      "Describe how you monetize, who your customers are, your distribution channels or fee structure. The goal is to give an idea of how this business will sustain your product or service and explain how your company will make money and achieve its goals. This can be shown with graphs, statistics, or charts. Use the Lifetime Value (LTV) and Customer Acquisition Cost (CAC) metrics to provide a clearer picture.",
    )
    .meta({
      description:
        "Description of the business model, monetization strategy, and customer acquisition costs.",
    }),
  cacChart: z
    .array(
      z.object({
        label: z.string().min(3).max(20),
        percentage: z.number().min(0).max(100),
      }),
    )
    .min(2)
    .max(5)
    .default([
      { label: "Internet of Things", percentage: 70 },
      { label: "Artificial Intelligence", percentage: 60 },
      { label: "Blockchain", percentage: 50 },
      { label: "Cloud Computing", percentage: 40 },
      { label: "Cybersecurity", percentage: 30 },
    ])
    .meta({
      description:
        "Array of objects representing Customer Acquisition Cost (CAC) metrics for different business segments or channels. Each object should include a 'label' (the name of the segment or channel) and a 'percentage' (the CAC as a percentage value, from 0 to 100). This data is visualized in the bar chart to illustrate the distribution of CAC across various categories.",
    }),
});

export const Schema = businessModelSchema;
export type BusinessModelData = z.infer<typeof businessModelSchema>;

interface Props {
  data?: Partial<BusinessModelData>;
}

const BusinessModelSlide: React.FC<Props> = ({ data }) => {
  const hasChart =
    data?.cacChart && Array.isArray(data.cacChart) && data.cacChart.length > 0;
  const cacChartData = hasChart ? data.cacChart : [];

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap"
        rel="stylesheet"
      />
      <div
        className="w-full max-w-[1280px] max-h-[720px] aspect-video bg-white mx-auto rounded shadow-lg overflow-hidden relative z-20"
        style={{
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        {/* Header */}
        <div className="absolute top-8 left-10 right-10 flex justify-between items-center text-[#1E4CD9] text-sm font-semibold">
          <span>{data?.companyName}</span>
          <span>{data?.date}</span>
        </div>

        {/* Main Content */}
        <div className="px-16 py-16 flex h-full gap-8">
          {/* Left Column - Chart with Title Below */}
          <div className="flex-1 pr-12 flex flex-col justify-center">
            <h1 className="text-6xl font-bold text-blue-600 mb-4 leading-tight text-left">
              {data?.title}
            </h1>
            {hasChart && (
              <div className="bg-white rounded-lg shadow p-4 mb-8">
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={cacChartData}
                      margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                      barCategoryGap="30%"
                    >
                      <CartesianGrid stroke="#e5eafe" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#1E4CD9", fontWeight: 600 }}
                      />
                      <YAxis
                        tick={{ fill: "#1E4CD9", fontWeight: 600 }}
                        domain={[0, 100]}
                        ticks={[0, 20, 40, 60, 80, 100]}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1E4CD9",
                          border: "none",
                          color: "#fff",
                        }}
                        labelStyle={{ color: "#fff" }}
                        itemStyle={{ color: "#fff" }}
                      />
                      <Legend
                        wrapperStyle={{ color: "#1E4CD9", fontWeight: 600 }}
                        iconType="circle"
                      />
                      <Bar
                        dataKey="percentage"
                        fill="#3b82f6"
                        name="CAC %"
                        maxBarSize={48}
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Description and Optional Image */}
          <div className="flex flex-col items-start justify-center w-[52%] gap-8">
            <p className="text-blue-600 text-base leading-relaxed font-normal mb-6 max-w-xl text-left">
              {data?.description}
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
      </div>
    </>
  );
};

export default BusinessModelSlide;
