import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Initialize Farcaster SDK if available
if (typeof window !== 'undefined' && window.miniapps) {
  // Call ready() to hide splash screen
  (async () => {
    try {
      const sdk = window.miniapps;
      if (sdk && sdk.actions && sdk.actions.ready) {
        await sdk.actions.ready();
      }
    } catch (error) {
      console.warn("Failed to initialize Farcaster SDK:", error);
    }
  })();
}

// Only use Wagmi if not in Farcaster environment
let AppWrapper = App;

if (!window.miniapps) {
  import('./wagmi.ts').then(({ config }) => {
    import('wagmi').then(({ WagmiProvider }) => {
      import('@tanstack/react-query').then(({ QueryClient, QueryClientProvider }) => {
        const queryClient = new QueryClient();
        
        AppWrapper = () => (
          <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
              <App />
            </QueryClientProvider>
          </WagmiProvider>
        );
        
        createRoot(document.getElementById("root")).render(<AppWrapper />);
      });
    });
  });
} else {
  createRoot(document.getElementById("root")).render(<App />);
}