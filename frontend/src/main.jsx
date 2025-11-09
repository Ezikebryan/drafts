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

// For Vercel deployment, we need to handle the imports differently
// Check if we're in a Farcaster environment
const isFarcasterEnvironment = typeof window !== 'undefined' && window.miniapps;

// If not in Farcaster environment, import and use Wagmi
let renderApp = () => {
  createRoot(document.getElementById("root")).render(<App />);
};

if (!isFarcasterEnvironment) {
  // Use a function that will be called after imports
  const renderWithWagmi = async () => {
    try {
      const { config } = await import('./wagmi.ts');
      const { WagmiProvider } = await import('wagmi');
      const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
      
      const queryClient = new QueryClient();
      
      const AppWithProviders = () => (
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </WagmiProvider>
      );
      
      createRoot(document.getElementById("root")).render(<AppWithProviders />);
    } catch (error) {
      console.error("Failed to load Wagmi providers:", error);
      // Fallback to regular app
      createRoot(document.getElementById("root")).render(<App />);
    }
  };
  
  renderApp = renderWithWagmi;
}

// Render the app
renderApp();