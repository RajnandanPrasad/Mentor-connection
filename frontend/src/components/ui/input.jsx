import React from 'react';

export const Input = ({ 
  className = '',
  type = 'text',
  variant = 'default',
  size = 'default',
  icon,
  error,
  ...props 
}) => {
  const baseStyles = 'w-full rounded-lg font-medium transition-all border focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
  
  const variants = {
    default: 'border-neutral-300 placeholder-neutral-400',
    error: 'border-error-300 placeholder-error-400 focus:ring-error-500 focus:border-error-500',
    success: 'border-success-300 placeholder-success-400 focus:ring-success-500 focus:border-success-500',
  };

  const sizes = {
    sm: 'h-8 px-3 py-1 text-xs md:text-sm',
    default: 'h-10 px-3 md:px-4 py-2 text-sm md:text-base',
    lg: 'h-12 px-4 py-3 text-base md:text-lg',
  };

  const finalVariant = error ? 'error' : variant;

  return (
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {icon}
        </div>
      )}
      <input
        type={type}
        className={`${baseStyles} ${variants[finalVariant]} ${sizes[size]} ${icon ? 'pl-9 md:pl-10' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs md:text-sm text-error-500">{error}</p>
      )}
    </div>
  );
}; 