import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { CometChat } from "@cometchat-pro/chat";

const appID = "2723800d667b3393"; // Replace with your CometChat App ID
const region = "in"; // Replace with your CometChat region

const initCometChat = async () => {
  try {
    await CometChat.init(appID, { region });
    console.log("✅ CometChat Initialized Successfully");
  } catch (error) {
    console.error("❌ CometChat Initialization Failed", error);
  }
};

// Start CometChat initialization before rendering the app
initCometChat().then(() => {
  console.log("🔄 Rendering App...");

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('❌ Root element not found!');
    throw new Error('Root element not found');
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    
    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <AuthProvider>
            <SocketProvider>
              <App />
            </SocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </React.StrictMode>
    );
    console.log('✅ App rendered successfully');
  } catch (error) {
    console.error('❌ Failed to render app:', error);
    rootElement.innerHTML = `
      <div style="color: red; padding: 20px;">
        ⚠️ Error loading application. Please check console for details.
      </div>
    `;
  }
});
