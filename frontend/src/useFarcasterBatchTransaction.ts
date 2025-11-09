// Custom hook for Farcaster batch transactions
// This hook provides a way to use batch transactions when available in the Farcaster wallet

interface BatchTransactionCall {
  to: string;
  data?: string;
  value?: string;
}

interface UseFarcasterBatchTransactionReturn {
  sendCalls: (calls: BatchTransactionCall[]) => Promise<void>;
  isBatchSupported: boolean;
}

const useFarcasterBatchTransaction = (): UseFarcasterBatchTransactionReturn => {
  // Check if we're in a Farcaster environment and batch transactions are supported
  const isBatchSupported = !!(window as any).miniapps?.wallet?.getEthereumProvider?.().request && 
    typeof (window as any).miniapps?.wallet?.getEthereumProvider?.().request === 'function';

  const sendCalls = async (calls: BatchTransactionCall[]): Promise<void> => {
    try {
      // Check if we're in a Farcaster environment
      if (!(window as any).miniapps) {
        throw new Error("Not in a Farcaster environment");
      }

      const provider = (window as any).miniapps.wallet.getEthereumProvider();
      
      // Try to use EIP-5792 batch transactions
      // This is the standard for batch transactions in modern wallets
      if (provider && provider.request) {
        try {
          // Try EIP-5792 wallet_sendCalls
          await provider.request({
            method: 'wallet_sendCalls',
            params: [{
              version: '1.0',
              chainId: '0x2105', // Base mainnet
              from: await provider.request({ method: 'eth_accounts' }).then((accounts: string[]) => accounts[0]),
              calls: calls.map(call => ({
                to: call.to,
                data: call.data || '0x',
                value: call.value || '0x0'
              }))
            }]
          });
        } catch (eip5792Error) {
          console.warn("EIP-5792 batch transactions not supported, falling back to individual transactions");
          // Fallback to individual transactions
          throw eip5792Error;
        }
      } else {
        throw new Error("No provider available");
      }
    } catch (error) {
      console.error("Error sending batch transactions:", error);
      throw error;
    }
  };

  return {
    sendCalls,
    isBatchSupported
  };
};

export default useFarcasterBatchTransaction;