import React from "react";
import { motion } from "framer-motion";
import { ethers } from "ethers";

export default function GameRoomHeader({ addr, chainId, gameId, playerColor, currentTurn, status, devFee }: { addr: string; chainId: number; gameId: number; playerColor: number | null; currentTurn: number; status: string; devFee: bigint; }) {
  const devFeeEth = ethers.formatEther(devFee);
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ duration: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
    >
      <div className="p-5 rounded-3xl bg-white shadow-soft border-3 border-primary/10">
        <div className="text-base font-semibold text-text mb-2">
          <strong className="text-primary">Connected:</strong> {addr ? `${addr.slice(0,6)}...${addr.slice(-4)}` : "(not connected)"}
        </div>
        <div className="text-sm text-muted mb-1.5"><strong className="text-text">Network:</strong> {chainId === 8453 ? "Base Mainnet" : `⚠️ Wrong Network (${chainId})`}</div>
        <div className="text-sm text-muted mb-1.5"><strong className="text-text">Game ID:</strong> {gameId || "(none)"}</div>
        <div className="text-sm text-muted mb-1.5"><strong className="text-text">Your Color:</strong> {playerColor === 0 ? "Player 1 (bottom)" : playerColor === 1 ? "Player 2 (top)" : "(not set)"}</div>
        <div className="text-sm text-muted"><strong className="text-text">Turn:</strong> {currentTurn === 0 ? "Player 1" : "Player 2"}</div>
      </div>
      <div className="p-5 rounded-3xl bg-gradient-to-br from-secondary/20 to-accentBlue/10 shadow-soft border-3 border-secondary/30">
        <div className="text-base font-bold text-text mb-3">
          <span>Status:</span> 
          <span className="text-primary font-bold ml-2">{status}</span>
        </div>
        <div className="text-sm text-text font-semibold flex items-center gap-2">
          <span>Dev Fee:</span> 
          <span className="px-2 py-1 rounded-full bg-white text-primary font-bold text-xs">{devFeeEth} ETH</span>
        </div>
      </div>
    </motion.div>
  );
}
