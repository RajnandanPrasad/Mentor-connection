import React, { createContext, useContext, useState } from 'react';

const TabsContext = createContext({
  value: '',
  onValueChange: () => {}
});

export const Tabs = ({ 
  children, 
  value, 
  onValueChange, 
  className = '', 
  ...props 
}) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={`w-full ${className}`} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div 
      className={`inline-flex items-center justify-center rounded-md bg-neutral-100 p-1 ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};

export const TabsTrigger = ({ 
  children, 
  value, 
  className = '', 
  ...props 
}) => {
  const { value: selectedValue, onValueChange } = useContext(TabsContext);
  const isSelected = selectedValue === value;
  
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all 
        ${isSelected ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'} 
        ${className}`}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ 
  children, 
  value, 
  className = '', 
  ...props 
}) => {
  const { value: selectedValue } = useContext(TabsContext);
  
  if (selectedValue !== value) return null;
  
  return (
    <div className={`mt-2 ${className}`} {...props}>
      {children}
    </div>
  );
}; 