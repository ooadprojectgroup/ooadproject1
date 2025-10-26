import React, { useState } from 'react';

// A resilient image that swaps to a fallback if the primary src fails
// Props: src, alt, fallback, style, className, height, width, loading
const DEFAULT_FALLBACK = 'https://via.placeholder.com/600x400?text=No+Image';

export default function ImageWithFallback({
  src,
  alt = '',
  fallback = DEFAULT_FALLBACK,
  style,
  className,
  height,
  width,
  loading = 'lazy'
}) {
  const [imgSrc, setImgSrc] = useState(src || fallback);

  const mergedStyle = {
    objectFit: 'cover',
    height: height || undefined,
    width: width || '100%',
    ...style,
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      style={mergedStyle}
      className={className}
      loading={loading}
      onError={() => {
        if (imgSrc !== fallback) setImgSrc(fallback);
      }}
    />
  );
}
