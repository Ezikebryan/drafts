import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Function to initialize Farcaster SDK properly
async function initializeFarcasterSDK() {
  try {
    // Import the SDK dynamically
    const { sdk } = await import('@farcaster/miniapp-sdk');
    
    // Call ready() to hide splash screen
    if (sdk && sdk.actions && typeof sdk.actions.ready === 'function') {
      await sdk.actions.ready();
      console.log("Farcaster SDK ready() called successfully");
      return true;
    }
  } catch (error) {
    console.warn("Failed to import or initialize Farcaster SDK:", error);
    
    // Fallback: try to access global SDK if available
    if (typeof window !== 'undefined' && window.miniapps && 
        window.miniapps.actions && typeof window.miniapps.actions.ready === 'function') {
      try {
        await window.miniapps.actions.ready();
        console.log("Farcaster SDK ready() called via global fallback");
        return true;
      } catch (fallbackError) {
        console.error("Fallback ready() call also failed:", fallbackError);
      }
    }
  }
  
  return false;
}

// Initialize Farcaster SDK
let isFarcasterEnvironment = false;

// Check if we might be in a Farcaster environment
if (typeof window !== 'undefined') {
  isFarcasterEnvironment = !!(
    window.miniapps || 
    window.location.hostname.includes('farcaster') ||
    window.location.search.includes('farcaster') ||
    window.location.hash.includes('farcaster')
  );
}

// If we're likely in a Farcaster environment, initialize the SDK
if (isFarcasterEnvironment) {
  initializeFarcasterSDK().then(initialized => {
    if (initialized) {
      console.log("Farcaster environment initialized");
    } else {
      console.log("Not a Farcaster environment or initialization failed");
    }
  }).catch(error => {
    console.error("Error during Farcaster SDK initialization:", error);
  });
}

// If not in Farcaster environment, import and use Wagmi
if (!isFarcasterEnvironment) {
  import('./wagmi.ts').then(({ config }) => {
    import('wagmi').then(({ WagmiProvider }) => {
      import('@tanstack/react-query').then(({ QueryClient, QueryClientProvider }) => {
        const queryClient = new QueryClient();
        
        const AppWithProviders = () => (
          <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
              <App />
            </QueryClientProvider>
          </WagmiProvider>
        );
        
        createRoot(document.getElementById("root")).render(<AppWithProviders />);
      });
    });
  });
} else {
  // In Farcaster environment, render app directly
  createRoot(document.getElementById("root")).render(<App />);
}