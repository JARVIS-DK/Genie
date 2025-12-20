import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import * as z from "zod";

export const layoutId = "company-traction-slide";
export const layoutName = "Company Traction Slide";
export const layoutDescription =
  "A slide layout designed to present company traction data, including growth statistics over the years, a chart visualization, and key metrics in a visually appealing format.";

const growthStatsSchema = z
  .object({
    year: z.string(),
  })
  .catchall(z.number())
  .meta({
    description:
      "Growth statistics for a specific year, with any number of metrics as key-value pairs where keys are metric names and values are numbers.",
  });

// growthStats: list of dicts, each dict is { year: string, <metric1>: number, <metric2>: number, ... }
const tractionSchema = z.object({
  companyName: z.string().min(2).max(50).default("presenton").meta({
    description: "Company name displayed in header",
  }),
  date: z.string().min(5).max(50).default("June 13, 2038").meta({
    description: "Today Date displayed in header",
  }),
  title: z.string().default("Company Traction").meta({
    description: "Main title of the slide",
  }),
  description: z
    .string()
    .min(3)
    .max(200)
    .default(
      "Traction is a period where the company is feeling momentum during its development period. If traction momentum is not harnessed, sales figures can decline and the customer base can shrink. In general, companies will judge success by the amount of revenue and new customers they receive.",
    )
    .meta({
      description:
        "Main content text describing the company's traction and growth momentum.",
    }),
  // growthStats is a list of objects, each with a 'year' and any number of metric keys (all numbers)
  growthStats: z
    .array(growthStatsSchema)
    .min(1)
    .max(20)
    .default([
      growthStatsSchema.parse({
        year: "2020",
        artificialIntelligence: 5,
        internetOfThings: 10,
        others: 8,
      }),
      growthStatsSchema.parse({
        year: "2021",
        artificialIntelligence: 10,
        internetOfThings: 20,
        others: 15,
      }),
      growthStatsSchema.parse({
        year: "2022",
        artificialIntelligence: 20,
        internetOfThings: 30,
        others: 22,
      }),
      growthStatsSchema.parse({
        year: "2023",
        artificialIntelligence: 28,
        internetOfThings: 38,
        others: 29,
      }),
      growthStatsSchema.parse({
        year: "2024",
        artificialIntelligence: 35,
        internetOfThings: 45,
        others: 34,
      }),
      growthStatsSchema.parse({
        year: "2025",
        artificialIntelligence: 45,
        internetOfThings: 53,
        others: 42,
      }),
      growthStatsSchema.parse({
        year: "2026",
        artificialIntelligence: 55,
        internetOfThings: 65,
        others: 52,
      }),
      growthStatsSchema.parse({
        year: "2029",
        artificialIntelligence: 55,
        internetOfThings: 65,
        others: 52,
      }),
    ])
    .meta({
      description:
        "Growth statistics for the company, used for chart visualization. Each entry is an object representing a specific year, with the 'year' key as a string (e.g., '2020'), and additional keys for each metric (such as 'artificialIntelligence', 'internetOfThings', 'others'), where the values are numbers representing the metric's value for that year. Example:\n\n[\n  { year: '2020', artificialIntelligence: 5, internetOfThings: 10, others: 8 },\n  { year: '2021', artificialIntelligence: 10, internetOfThings: 20, others: 15 },\n  ...\n]\nThis structure allows the chart to dynamically render multiple series over time, with each metric visualized as a separate line.",
    }),
});

export const Schema = tractionSchema;
export type CompanyTractionData = z.infer<typeof tractionSchema>;

interface Props {
  data?: Partial<CompanyTractionData>;
}

// Helper: assign colors to series
const defaultColors = [
  "#1E4CD9",
  "#3b82f6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#a21caf",
  "#6366f1",
  "#f43f5e",
  "#fbbf24",
  "#14b8a6",
];

function getSeriesKeys(
  growthStats: Array<Record<string, string | number>>,
): string[] {
  if (!growthStats.length) return [];
  // Exclude 'year' or any non-numeric keys
  const first = growthStats[0];
  return Object.keys(first).filter(
    (key) => key !== "year" && typeof first[key] === "number",
  );
}

// Compute stats for right column, generic for all series
function computeStats(
  growthStats: Array<Record<string, string | number>>,
  seriesKeys: string[],
) {
  if (!growthStats.length) return [];
  const first = growthStats[0];
  const last = growthStats[growthStats.length - 1];
  return seriesKeys.map((key) => {
    const start = typeof first[key] === "number" ? (first[key] as number) : 0;
    const end = typeof last[key] === "number" ? (last[key] as number) : 0;
    const growth = start === 0 ? 0 : ((end - start) / Math.abs(start)) * 100;
    return {
      label: key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase()),
      value: `${growth >= 0 ? "+" : ""}${Math.round(growth)}% growth`,
      description: `${key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())} growth over the period.`,
    };
  });
}

const CompanyTractionSlideLayout: React.FC<Props> = ({ data }) => {
  const growthStats = data?.growthStats || [];

  // Dynamically determine series keys
  const seriesKeys = getSeriesKeys(growthStats);

  // Prepare stats for the right column, generic for all series
  const stats = computeStats(growthStats, seriesKeys);

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
            <div className="bg-white rounded-lg shadow p-4 mb-8">
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthStats}>
                    <CartesianGrid stroke="#e5eafe" />
                    <XAxis
                      dataKey="year"
                      stroke="#1E4CD9"
                      tick={{ fill: "#1E4CD9", fontWeight: 600 }}
                    />
                    <YAxis
                      stroke="#1E4CD9"
                      tick={{ fill: "#1E4CD9", fontWeight: 600 }}
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
                    {seriesKeys.map((key, idx) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={defaultColors[idx % defaultColors.length]}
                        strokeWidth={3}
                        name={key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (str) => str.toUpperCase())}
                        dot={{
                          r: 4,
                          fill: defaultColors[idx % defaultColors.length],
                        }}
                        activeDot={{
                          r: 6,
                          fill: defaultColors[idx % defaultColors.length],
                        }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column - Description and Stats */}
          <div className="flex flex-col items-start justify-center w-[52%] gap-8">
            <p className="text-blue-600 text-base leading-relaxed font-normal mb-6 max-w-xl text-left">
              {data?.description ||
                "Traction is a period where the company is feeling momentum during its development period. If traction momentum is not harnessed, sales figures can decline and the customer base can shrink. In general, companies will judge success by the amount of revenue and new customers they receive."}
            </p>
            <div className="flex flex-row w-full gap-6">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="flex-1 bg-[#f5f8ff] rounded-lg shadow-sm px-5 py-4 flex flex-col items-start"
                >
                  <div className="bg-[#1E4CD9] text-white text-xs font-semibold px-3 py-1 rounded-sm mb-2">
                    {stat.label}
                  </div>
                  <div className="text-2xl font-bold text-[#1E4CD9] mb-1">
                    {stat.value}
                  </div>
                  <p className="text-sm text-gray-700 leading-snug">
                    {stat.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
      </div>
    </>
  );
};

export default CompanyTractionSlideLayout;
