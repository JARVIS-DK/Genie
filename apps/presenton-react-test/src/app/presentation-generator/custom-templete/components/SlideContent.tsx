import React, { memo } from "react";

interface SlideContentProps {
  slide: { html: string; [key: string]: any };
}

const SlideContent: React.FC<SlideContentProps> = memo(({ slide }) => {
  const cleanHtml = slide.html
    ?.replace(/```html/g, "")
    .replace(/```/g, "")
    .replace(/<html>/g, "")
    .replace(/<\/html>/g, "")
    .replace(/html/g, "");

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: cleanHtml,
      }}
    />
  );
});

export default SlideContent;
