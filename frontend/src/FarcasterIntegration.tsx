import React, { useEffect, useState } from 'react';

interface FarcasterIntegrationProps {
  onWalletConnected?: (address: string) => void;
  onWalletDisconnected?: () => void;
}

const FarcasterIntegration: React.FC<FarcasterIntegrationProps> = ({ 
  onWalletConnected,
  onWalletDisconnected 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if we're in a Farcaster environment
  const isFarcasterEnvironment = typeof window !== 'undefined' && (window as any).miniapps;

  // Check wallet connection status
  useEffect(() => {
    const checkWalletStatus = async () => {
      try {
        // Check if we're in a Farcaster environment
        if (!isFarcasterEnvironment) {
          return;
        }
        
        // Access the SDK through the global window object
        const sdk = (window as any).miniapps;
        
        // Check if wallet is connected
        const provider = sdk && sdk.wallet && sdk.wallet.getEthereumProvider ? 
          await sdk.wallet.getEthereumProvider() : null;
          
        if (provider) {
          // Try to get accounts
          const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
          if (accounts && accounts.length > 0) {
            setIsConnected(true);
            setAddress(accounts[0]);
            onWalletConnected?.(accounts[0]);
          }
        }
      } catch (err) {
        console.error("Error checking wallet status:", err);
        setError("Failed to check wallet status");
      }
    };

    // Only check if we're in a Farcaster environment
    if (isFarcasterEnvironment) {
      checkWalletStatus();
    }
  }, [isFarcasterEnvironment, onWalletConnected]);

  const connectWallet = async () => {
    try {
      setError(null);
      
      // Access the SDK through the global window object
      const sdk = (window as any).miniapps;
      
      const provider = sdk && sdk.wallet && sdk.wallet.getEthereumProvider ? 
        await sdk.wallet.getEthereumProvider() : null;
      
      if (!provider) {
        throw new Error("No Farcaster wallet provider found");
      }
      
      // Request accounts
      const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
      
      if (accounts && accounts.length > 0) {
        setIsConnected(true);
        setAddress(accounts[0]);
        onWalletConnected?.(accounts[0]);
      }
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setError(err.message || "Failed to connect wallet");
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setAddress(null);
    onWalletDisconnected?.();
  };

  // Render nothing if not in a Farcaster environment
  if (!isFarcasterEnvironment) {
    return null;
  }

  return (
    <div className="mb-6 p-4 rounded-2xl bg-white shadow-soft border-3 border-primary/10">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg">Farcaster Wallet</h3>
          {isConnected ? (
            <div className="mt-2">
              <p className="font-semibold">Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
              <p className="text-sm text-muted">Base Network</p>
            </div>
          ) : (
            <p className="text-muted">Not connected</p>
          )}
        </div>
        
        {isConnected ? (
          <button
            onClick={disconnectWallet}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={connectWallet}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primaryDark transition-colors"
          >
            Connect Wallet
          </button>
        )}
      </div>
      
      {error && (
        <div className="mt-3 p-2 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="mt-3 text-sm text-muted">
        <p>Playing on Farcaster? Use the native wallet integration for the best experience.</p>
      </div>
    </div>
  );
};

export default FarcasterIntegration;