import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Function to detect Farcaster environment and call ready()
function initializeFarcasterSDK() {
  // Check if we're in a Farcaster environment
  const isFarcasterEnv = typeof window !== 'undefined' && (
    window.miniapps || 
    window.location.hostname.includes('farcaster') ||
    window.location.search.includes('farcaster') ||
    window.location.hash.includes('farcaster')
  );

  if (isFarcasterEnv) {
    console.log("Farcaster environment detected");
    
    // Try to call ready() immediately
    try {
      if (window.miniapps && window.miniapps.actions && typeof window.miniapps.actions.ready === 'function') {
        window.miniapps.actions.ready();
        console.log("Farcaster SDK ready() called immediately");
        return true;
      }
    } catch (error) {
      console.warn("Immediate ready() call failed:", error);
    }

    // If not immediately available, wait for it with polling
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds with 100ms intervals
    
    const checkAndReady = () => {
      attempts++;
      try {
        if (window.miniapps && window.miniapps.actions && typeof window.miniapps.actions.ready === 'function') {
          window.miniapps.actions.ready();
          console.log("Farcaster SDK ready() called after", attempts, "attempts");
          return;
        }
      } catch (error) {
        console.warn("Ready() call failed on attempt", attempts, ":", error);
      }
      
      if (attempts < maxAttempts) {
        setTimeout(checkAndReady, 100);
      } else {
        console.warn("Farcaster SDK not available after", maxAttempts, "attempts");
        // Try direct import as last resort
        try {
          import('@farcaster/miniapp-sdk').then(({ sdk }) => {
            if (sdk && sdk.actions && typeof sdk.actions.ready === 'function') {
              sdk.actions.ready();
              console.log("Farcaster SDK ready() called via import");
            }
          }).catch(error => {
            console.error("Failed to import Farcaster SDK:", error);
          });
        } catch (importError) {
          console.error("Failed to dynamically import Farcaster SDK:", importError);
        }
      }
    };
    
    // Start polling for the SDK
    checkAndReady();
    return true;
  }
  
  return false;
}

// Initialize Farcaster SDK detection
const isFarcasterEnvironment = initializeFarcasterSDK();

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