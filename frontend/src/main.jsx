import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { SocketProvider } from './context/SocketContext'
import { BrowserRouter } from 'react-router-dom'

console.log('main.jsx is executing'); // Debug log

const rootElement = document.getElementById('root');
console.log('Root element:', rootElement); // Debug log

if (!rootElement) {
  console.error('Root element not found!');
  throw new Error('Root element not found');
}

// Remove the loading message if it exists
const loadingElement = document.getElementById('loading');
if (loadingElement) {
  loadingElement.remove();
}

try {
  console.log('Attempting to render app...'); // Debug log
  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    <React.StrictMode>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SocketProvider>
          <App />
        </SocketProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
  console.log('App rendered successfully'); // Debug log
} catch (error) {
  console.error('Failed to render app:', error);
  rootElement.innerHTML = `
    <div style="color: red; padding: 20px;">
      Error loading application. Please check console for details.
    </div>
  `;
}
