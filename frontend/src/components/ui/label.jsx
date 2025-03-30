import React from 'react';

export const Label = ({ 
  children, 
  htmlFor,
  className = '', 
  ...props 
}) => {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-neutral-700 mb-1 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}; 