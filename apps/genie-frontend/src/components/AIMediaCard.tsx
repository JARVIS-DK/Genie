import React from 'react';

interface AIMediaCardProps {
  imageUrl: string;
  /** Fallback image to use if the main image fails to load */
  fallbackImageUrl?: string;
  /** Alt text / accessible title for the image */
  title: string;
  /**
   * Aspect ratio of the media area
   * - portrait: 3/4 (image grid)
   * - square: 1/1 (music cards)
   * - video: 16/9 (video thumbnails)
   */
  aspect?: 'portrait' | 'square' | 'video';
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  /** Additional classes for the outer card container */
  outerClassName?: string;
  /**
   * Optional node rendered in the top-right corner of the media area,
   * e.g. a download button.
   */
  topRightOverlay?: React.ReactNode;
  /**
   * Optional node rendered as a hover overlay centered over the media
   * area, e.g. a play button.
   */
  hoverOverlay?: React.ReactNode | null;
  /** Body content rendered below the media area (title, meta, etc.) */
  children?: React.ReactNode;
}

const AIMediaCard: React.FC<AIMediaCardProps> = ({
  imageUrl,
  fallbackImageUrl = '/no_preview_image.png',
  title,
  aspect = 'square',
  onClick,
  onMouseEnter,
  onMouseLeave,
  outerClassName,
  topRightOverlay,
  hoverOverlay,
  children,
}) => {
  const aspectClass =
    aspect === 'square' ? 'aspect-square' : aspect === 'video' ? 'aspect-video' : 'aspect-[3/4]';

  const cardClasses =
    outerClassName ??
    'bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer border border-slate-700 group h-80';

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={`${aspectClass} overflow-hidden bg-slate-700 relative`}>
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = fallbackImageUrl;
          }}
        />

        {topRightOverlay && (
          <div className="absolute top-3 right-3">{topRightOverlay}</div>
        )}

        {hoverOverlay}
      </div>

      {children && <div className="p-4">{children}</div>}
    </div>
  );
};

export default AIMediaCard;
