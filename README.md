# OnDrafts — Onchain Checkers (PvP) Miniapp for Farcaster (Base)

OnDrafts is a minimal on-chain checkers (draughts) game where every move is an on-chain transaction on Base. The smart contract enforces turn order, player identity, the active game state, and stores a compact board string. Move legality is enforced in the frontend before sending a transaction.

## Repo Layout
- contracts/OnDrafts.sol — Solidity contract (Ownable, ReentrancyGuard)
- scripts/deploy.js — Hardhat deploy script (writes frontend/src/contract-address.json)
- hardhat.config.js — Hardhat config with Base Sepolia network
- test/OnDrafts.test.js — Simulates two accounts creating, joining, moving, and ending a game
- frontend/ — React + Vite miniapp
- farcaster.json — Miniapp manifest
- .env.example — Environment variables

## Prerequisites
- Node.js 18+
- pnpm or npm (examples use npm)

## Install
```
npm install
cd frontend && npm install && cd ..
```

## Compile and Test
```
npm run compile
npm run test
```

## Local Deploy (localhost)
1. Start a local Hardhat node:
```
npx hardhat node
```
2. In another terminal, deploy:
```
npm run deploy:localhost
```
3. Start the frontend:
```
cd frontend
npm run dev
```
Open http://localhost:5173

## Base Sepolia Deploy
Set up .env (see .env.example):
- PRIVATE_KEY — your deployer key
- BASE_SEPOLIA_URL — RPC url (e.g., https://sepolia.base.org)
- DEV_FEE_WEI — per-move developer fee in wei

Deploy:
```
npm run deploy:base
```
Start the frontend and select the Base Sepolia network; the address file will be updated.

## Notes
- Join-code pairing: host creates a game with a join-code hash; the opponent joins using the plaintext code.
- The contract enforces: active state, turn order, player identities, and takes dev fee per move.
- Frontend must validate move legality before calling `makeMove`.
