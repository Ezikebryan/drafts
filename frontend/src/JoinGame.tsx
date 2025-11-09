import React from "react";
import { motion } from "framer-motion";

export default function JoinGame({ joinCode, setJoinCode, onJoinGame, disabled }: { joinCode: string; setJoinCode: (v: string) => void; onJoinGame: () => void; disabled: boolean; }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5, delay: 0.1 }}
      className="p-6 rounded-3xl bg-white shadow-lift border-4 border-accentPink/20 hover:border-accentPink/40 transition-all"
    >
      <h3 className="text-xl font-bold mb-4 text-text flex items-center gap-2">
        Join Game <span className="text-sm font-semibold px-3 py-1 rounded-full bg-gradient-to-r from-accentPink to-accentPurple text-white">Opponent</span>
      </h3>
      <input
        className="w-full px-4 py-3 rounded-2xl bg-surface text-text font-semibold border-3 border-muted/30 focus:outline-none focus:border-accentPink focus:ring-4 focus:ring-accentPink/20 transition-all"
        placeholder="Enter join code"
        value={joinCode}
        onChange={(e) => setJoinCode(e.target.value)}
      />
      <motion.button
        whileHover={{ scale: 1.05, y: -2 }} 
        whileTap={{ scale: 0.98 }}
        disabled={disabled}
        onClick={onJoinGame}
        className="mt-4 w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-accentPink to-accentPurple text-white text-lg font-bold shadow-lift hover:shadow-[0_0_20px_rgba(255,107,107,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        Join Game (You = Player 2)
      </motion.button>
    </motion.div>
  );
}
