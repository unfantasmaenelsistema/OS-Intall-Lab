import React, { useState } from 'react';

interface GhostLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const GhostLogo: React.FC<GhostLogoProps> = ({ 
  className = "w-6 h-6", 
  size,
  showText = false 
}) => {
  const [imageError, setImageError] = useState(false);

  const style: React.CSSProperties | undefined = size 
    ? { width: `${size}px`, height: `${size}px`, maxWidth: `${size}px`, maxHeight: `${size}px` } 
    : undefined;

  const imageElement = (
    <img
      src={imageError ? "/icono.svg" : "/icono.png"}
      alt="Logo Un Fantasma en el Sistema"
      className={`aspect-square object-contain shrink-0 select-none pointer-events-none inline-block ${className}`}
      style={style}
      onError={() => setImageError(true)}
      loading="eager"
      decoding="async"
    />
  );

  if (!showText) {
    return imageElement;
  }

  return (
    <span className="inline-flex items-center gap-2 shrink-0">
      {imageElement}
      <span className="font-semibold text-sm text-slate-100 tracking-tight">
        Un Fantasma en el Sistema
      </span>
    </span>
  );
};
