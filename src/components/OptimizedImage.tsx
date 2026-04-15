import { memo } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  style?: React.CSSProperties;
}

/**
 * Performance-optimized image component:
 * - Lazy loading by default (eager for above-fold with priority=true)
 * - Async decoding to avoid blocking main thread
 * - Aspect-ratio CSS for zero CLS
 * - fetchPriority="high" for LCP images
 */
const OptimizedImage = memo(({
  src,
  alt,
  width,
  height,
  className = "",
  priority = false,
  style,
}: OptimizedImageProps) => (
  <img
    src={src}
    alt={alt}
    width={width}
    height={height}
    loading={priority ? "eager" : "lazy"}
    decoding={priority ? "sync" : "async"}
    fetchPriority={priority ? "high" : "auto"}
    className={className}
    style={{
      aspectRatio: `${width} / ${height}`,
      ...style,
    }}
  />
));

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
