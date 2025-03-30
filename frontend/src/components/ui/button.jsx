import React from 'react';

export const Button = ({ 
  children, 
  variant = 'default', 
  size = 'default', 
  className = '', 
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-soft hover:shadow-button active:translate-y-0.5';
  
  const variants = {
    default: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500',
    outline: 'border-2 border-primary-500 text-primary-600 hover:bg-primary-50 focus-visible:ring-primary-500',
    secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 focus-visible:ring-secondary-400',
    accent: 'bg-accent-500 text-white hover:bg-accent-600 focus-visible:ring-accent-400',
    ghost: 'hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900',
    link: 'underline-offset-4 hover:underline text-primary-600 hover:text-primary-700 shadow-none hover:shadow-none'
  };

  const sizes = {
    default: 'h-10 py-2 px-4 text-sm md:text-base',
    sm: 'h-8 px-2.5 py-1 text-xs md:text-sm',
    lg: 'h-12 px-6 py-2.5 text-base md:text-lg',
    xl: 'h-14 px-8 py-3 text-lg md:text-xl',
    icon: 'h-10 w-10 p-2'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}; 