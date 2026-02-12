import React from 'react';

interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
  style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({ name, className = "", filled = false, style }) => {
  return (
    <span 
      className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`}
      style={style}
    >
      {name}
    </span>
  );
};
