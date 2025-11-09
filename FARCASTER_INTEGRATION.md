# Farcaster Integration for Draftsmaster

This document explains how the Farcaster integration works in the Draftsmaster application.

## Overview

The Draftsmaster application now includes native Farcaster wallet integration, allowing users to play on-chain checkers directly within the Farcaster ecosystem. The integration provides:

1. Native wallet connection through Farcaster
2. Batch transaction support for improved user experience
3. Seamless integration with the existing Ethereum wallet flow

## Key Components

### 1. FarcasterIntegration Component

The [FarcasterIntegration.tsx](file:///c%3A/Users/Elon/Documents/Ezike/frontend/src/FarcasterIntegration.tsx) component handles:
- Wallet connection/disconnection
- Farcaster miniapp initialization
- UI for wallet status

### 2. Batch Transaction Hook

The [useFarcasterBatchTransaction.ts](file:///c%3A/Users/Elon/Documents/Ezike/frontend/src/useFarcasterBatchTransaction.ts) hook provides:
- Support for EIP-5792 batch transactions
- Fallback to individual transactions when batch is not supported

### 3. App Integration

The main [App.tsx](file:///c%3A/Users/Elon/Documents/Ezike/frontend/src/App.tsx) file integrates:
- Farcaster wallet detection
- Seamless switching between Farcaster and regular Ethereum wallets
- Enhanced transaction flow using batch transactions when available

## How It Works

1. **Initialization**: When the app loads, it checks if it's running within a Farcaster environment
2. **Wallet Connection**: Users can connect their Farcaster wallet through the dedicated UI component
3. **Transaction Flow**: When making moves, the app attempts to use batch transactions for better UX
4. **Fallback**: If batch transactions aren't supported, it falls back to individual transactions

## Benefits

- **Improved UX**: Batch transactions allow multiple operations in a single confirmation
- **Native Integration**: Seamless experience for Farcaster users
- **Backward Compatibility**: Works with regular Ethereum wallets when Farcaster isn't available
- **Network Enforcement**: Ensures all transactions happen on Base mainnet

## Future Enhancements

- Add support for Farcaster frames for game sharing
- Implement notifications for game events
- Add deep linking for direct game joins