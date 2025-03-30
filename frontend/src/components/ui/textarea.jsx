import React from 'react';

export const Textarea = ({ 
  className = '',
  variant = 'default',
  error,
  ...props 
}) => {
  const baseStyles = 'w-full rounded-lg font-medium transition-all border focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[80px] p-3';
  
  const variants = {
    default: 'border-neutral-300 placeholder-neutral-400',
    error: 'border-error-300 placeholder-error-400 focus:ring-error-500 focus:border-error-500',
    success: 'border-success-300 placeholder-success-400 focus:ring-success-500 focus:border-success-500',
  };

  const finalVariant = error ? 'error' : variant;

  return (
    <div className="relative">
      <textarea 
        className={`${baseStyles} ${variants[finalVariant]} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs md:text-sm text-error-500">{error}</p>
      )}
    </div>
  );
}; 