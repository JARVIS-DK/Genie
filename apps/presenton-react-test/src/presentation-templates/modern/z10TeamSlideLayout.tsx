import React from "react";
import * as z from "zod";
import { ImageSchema } from "@/presentation-templates/defaultSchemes";

export const layoutId = "modern-team-slide";
export const layoutName = "Modern Team Slide";
export const layoutDescription =
  "A clean modern team slide showcasing team members with professional profiles and blue-white design.";

const teamMemberSchema = z.object({
  name: z.string().min(2).max(50).meta({
    description: "Team member's full name",
  }),
  position: z.string().min(2).max(50).meta({
    description: "Job title or position",
  }),
  description: z.string().min(20).max(120).meta({
    description: "Brief professional description of the team member",
  }),
  image: ImageSchema,
  linkedIn: z.string().optional().meta({
    description: "LinkedIn profile URL (optional)",
  }),
});

const modernTeamSlideSchema = z.object({
  title: z.string().min(3).max(15).default("Our Team").meta({
    description: "Main title of the slide",
  }),
  subtitle: z.string().min(10).max(120).optional().meta({
    description: "Optional subtitle describing the team",
  }),
  teamMembers: z
    .array(teamMemberSchema)
    .min(2)
    .max(3)
    .default([
      {
        name: "Sarah Johnson",
        position: "CEO & Founder",
        description:
          "Strategic leader with 15+ years experience in technology and business development. Former VP at Fortune 500 company.",
        image: {
          __image_url__:
            "https://plus.unsplash.com/premium_photo-1661589856899-6dd0871f9db6?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8YnVzaW5lc3N3b21lbnxlbnwwfHwwfHx8MA%3D%3D",
          __image_prompt__: "Professional businesswoman CEO headshot",
        },
      },
      {
        name: "Michael Chen",
        position: "CTO",
        description:
          "Technology expert specializing in scalable architecture and AI solutions. PhD in Computer Science from MIT.",
        image: {
          __image_url__:
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
          __image_prompt__: "Professional businessman CTO headshot",
        },
      },
      {
        name: "Emily Rodriguez",
        position: "VP of Sales",
        description:
          "Sales leader with proven track record of building high-performing teams and driving revenue growth in B2B markets.",
        image: {
          __image_url__:
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
          __image_prompt__: "Professional businesswoman VP headshot",
        },
      },
      {
        name: "David Kim",
        position: "Head of Product",
        description:
          "Product strategist focused on user experience and market-driven solutions. Former product manager at leading tech companies.",
        image: {
          __image_url__:
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
          __image_prompt__: "Professional businessman product manager headshot",
        },
      },
    ])
    .meta({
      description: "List of team members with their information",
    }),
  companyName: z.string().min(2).max(50).default("presenton").meta({
    description: "Company name displayed in header",
  }),
  date: z.string().min(5).max(50).default("June 13, 2038").meta({
    description: "Today Date displayed in header",
  }),
});

export const Schema = modernTeamSlideSchema;

export type ModernTeamSlideData = z.infer<typeof modernTeamSlideSchema>;

interface ModernTeamSlideLayoutProps {
  data?: Partial<ModernTeamSlideData>;
}

const ModernTeamSlideLayout: React.FC<ModernTeamSlideLayoutProps> = ({
  data: slideData,
}) => {
  return (
    <>
      {/* Import Montserrat Font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap"
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
          <span>{slideData?.companyName}</span>
          <span>{slideData?.date}</span>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-start justify-center h-full px-16 pt-24 pb-10">
          {/* Title */}
          <h1
            className="text-7xl font-bold text-blue-600 mb-4 leading-tight text-left"
            style={{ letterSpacing: "-0.03em" }}
          >
            {slideData?.title}
          </h1>
          {/* Subtitle */}
          <p className="text-blue-600 text-lg leading-relaxed font-normal mb-12 max-w-lg text-left">
            {slideData?.subtitle}
          </p>
          {/* Team Members Row */}
          <div className="flex flex-row w-full justify-between items-start gap-6 mt-2">
            {slideData?.teamMembers?.map((member, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center bg-[#f7f9fc] rounded-lg shadow-md px-6 pt-6 pb-4 w-1/4 min-w-[210px] max-w-[240px] mx-auto"
                style={{ minHeight: 340 }}
              >
                {/* Photo */}
                <div className="relative w-28 h-28 mb-4 rounded overflow-hidden bg-white border-2 border-blue-100 flex items-center justify-center">
                  {member.image.__image_url__ && (
                    <img
                      src={member.image.__image_url__}
                      alt={member.image.__image_prompt__ || member.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                {/* Name */}
                <div className="text-lg font-bold text-blue-700 mb-1">
                  {member.name}
                </div>
                {/* Position Badge */}
                <div className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-sm mb-2 uppercase tracking-wide">
                  {member.position}
                </div>
                {/* Description */}
                <div className="text-sm text-gray-700 text-center mb-2 min-h-[48px]">
                  {member.description}
                </div>
                {/* LinkedIn Link (if provided) */}
                {member.linkedIn && (
                  <a
                    href={member.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 transition-colors duration-200 mt-1"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    LinkedIn
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
        {/* Bottom Divider */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
      </div>
    </>
  );
};

export default ModernTeamSlideLayout;
