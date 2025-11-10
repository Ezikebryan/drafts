import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Initialize Farcaster SDK if available
const isFarcasterEnvironment = typeof window !== 'undefined' && window.miniapps;

if (isFarcasterEnvironment) {
  // Call ready() to hide splash screen immediately
  try {
    // Try to import the SDK properly
    import('@farcaster/miniapp-sdk').then(({ sdk }) => {
      if (sdk && sdk.actions && sdk.actions.ready) {
        sdk.actions.ready();
      }
    }).catch(error => {
      console.warn("Failed to import Farcaster SDK:", error);
      // Fallback to direct access
      const sdk = window.miniapps;
      if (sdk && sdk.actions && sdk.actions.ready) {
        sdk.actions.ready();
      }
    });
  } catch (error) {
    console.warn("Failed to initialize Farcaster SDK:", error);
    // Fallback to direct access
    try {
      const sdk = window.miniapps;
      if (sdk && sdk.actions && sdk.actions.ready) {
        sdk.actions.ready();
      }
    } catch (fallbackError) {
      console.warn("Failed to initialize Farcaster SDK with fallback:", fallbackError);
    }
  }
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