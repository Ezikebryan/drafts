import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Immediately call sdk.actions.ready() as per Farcaster documentation
// This should be called as soon as the app loads
(async () => {
  try {
    // Import the SDK and call ready() immediately
    const { sdk } = await import('@farcaster/miniapp-sdk');
    
    // Call ready() to hide splash screen
    if (sdk && sdk.actions && typeof sdk.actions.ready === 'function') {
      await sdk.actions.ready();
      console.log("Farcaster SDK ready() called successfully");
    }
  } catch (error) {
    console.warn("Failed to import or initialize Farcaster SDK:", error);
    
    // Fallback: try to access global SDK if available
    if (typeof window !== 'undefined' && window.miniapps && 
        window.miniapps.actions && typeof window.miniapps.actions.ready === 'function') {
      try {
        await window.miniapps.actions.ready();
        console.log("Farcaster SDK ready() called via global fallback");
      } catch (fallbackError) {
        console.error("Fallback ready() call also failed:", fallbackError);
      }
    }
  }
})();

// Check if we're in a Farcaster environment for rendering logic
const isFarcasterEnvironment = typeof window !== 'undefined' && (
  window.miniapps || 
  window.location.hostname.includes('farcaster') ||
  window.location.search.includes('farcaster') ||
  window.location.hash.includes('farcaster')
);

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