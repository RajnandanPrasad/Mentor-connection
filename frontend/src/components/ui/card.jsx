import React from 'react';

export const Card = ({ 
  children, 
  variant = 'default',
  className = '', 
  ...props 
}) => {
  const baseStyles = 'rounded-xl overflow-hidden';
  
  const variants = {
    default: 'bg-white shadow-card hover:shadow-lg transition-shadow',
    outlined: 'border border-neutral-200 bg-white',
    elevated: 'shadow-lg bg-white',
    gradient: 'bg-gradient-card shadow-card',
    glass: 'glassmorphism'
  };

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', ...props }) => (
  <div 
    className={`p-4 md:p-6 border-b border-neutral-100 ${className}`} 
    {...props}
  >
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', ...props }) => (
  <h3 
    className={`text-lg md:text-xl font-semibold text-neutral-900 ${className}`} 
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '', ...props }) => (
  <p 
    className={`text-sm text-neutral-500 mt-1 ${className}`} 
    {...props}
  >
    {children}
  </p>
);

export const CardContent = ({ children, className = '', ...props }) => (
  <div 
    className={`p-4 md:p-6 ${className}`} 
    {...props}
  >
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div 
    className={`p-4 md:p-6 border-t border-neutral-100 ${className}`} 
    {...props}
  >
    {children}
  </div>
); 