import React, { createContext, useContext, useState } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'default', duration = 5000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-0 right-0 p-3 sm:p-4 space-y-3 sm:space-y-4 z-50 max-w-full sm:max-w-sm md:max-w-md">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const Toast = ({ message, type, id }) => {
  const { addToast } = useContext(ToastContext);
  
  const handleClose = () => {
    addToast(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };
  
  const variants = {
    default: 'bg-neutral-800 text-white',
    success: 'bg-success-500 text-white',
    error: 'bg-error-500 text-white',
    warning: 'bg-warning-500 text-white',
    info: 'bg-primary-600 text-white',
  };

  return (
    <div className={`animate-fadeIn rounded-lg shadow-lg p-3 sm:p-4 min-w-[150px] sm:min-w-[200px] max-w-[calc(100vw-24px)] sm:max-w-[350px] flex items-center justify-between ${variants[type]}`}>
      <span className="text-sm sm:text-base">{message}</span>
      <button 
        onClick={handleClose}
        className="ml-3 sm:ml-4 p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
      >
        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}; 