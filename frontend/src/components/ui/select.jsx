import React, { useState, useRef, useEffect } from 'react';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';

export const Select = ({ children, value, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-full" ref={selectRef}>
      {React.Children.map(children, child => {
        // Pass props to trigger
        if (child.type === SelectTrigger) {
          return React.cloneElement(child, {
            onClick: () => !disabled && setIsOpen(!isOpen),
            disabled
          });
        }
        // Show content only when open
        if (child.type === SelectContent) {
          return isOpen ? child : null;
        }
        return child;
      })}
    </div>
  );
};

export const SelectTrigger = ({ children, className = '', disabled = false, ...props }) => {
  return (
    <button
      type="button"
      className={`flex items-center justify-between w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-neutral-50'} ${className}`}
      {...props}
    >
      {children}
      <ChevronDownIcon className="w-4 h-4 text-neutral-500" />
    </button>
  );
};

export const SelectValue = ({ placeholder, children }) => {
  return (
    <span className="block truncate">
      {children || <span className="text-neutral-400">{placeholder}</span>}
    </span>
  );
};

export const SelectContent = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`absolute z-50 w-full min-w-[8rem] overflow-hidden rounded-md border border-neutral-200 bg-white shadow-md mt-1 max-h-60 overflow-y-auto p-1 ${className}`}
      {...props}
    >
      <div className="flex flex-col gap-1">
        {children}
      </div>
    </div>
  );
};

export const SelectItem = ({ children, value, onSelect, selected, className = '', ...props }) => {
  const handleClick = () => {
    if (onSelect) {
      onSelect(value);
    }
  };

  return (
    <div
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-neutral-100 ${selected ? 'bg-primary-50 text-primary-900 font-medium' : 'text-neutral-700'} ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
      {selected && (
        <CheckIcon className="h-4 w-4 ml-auto text-primary-600" />
      )}
    </div>
  );
}; 