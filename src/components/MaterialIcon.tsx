import React, { useState } from 'react';

interface MaterialIconProps {
  icon?: string | null;
  image?: string | null;
  className?: string;
  fallbackIcon?: string;
}

export const MaterialIcon: React.FC<MaterialIconProps> = ({
  icon,
  image,
  className = 'w-6 h-6',
  fallbackIcon = 'code',
}) => {
  const [imgError, setImgError] = useState(false);

  // If image is provided and hasn't failed to load, render the image
  if (image && !imgError) {
    return (
      <img
        src={image}
        alt="item icon"
        className={`${className} object-contain rounded`}
        onError={() => setImgError(true)}
      />
    );
  }

  // Fallback to Material Symbol icon
  const iconName = icon?.trim() || fallbackIcon;

  return (
    <span
      className={`material-symbols-outlined select-none text-indigo-400 ${className} flex items-center justify-center`}
      style={{ fontSize: '26px' }}
    >
      {iconName}
    </span>
  );
};
