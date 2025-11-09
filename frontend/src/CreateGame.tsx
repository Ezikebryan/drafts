import React from "react";
import { motion } from "framer-motion";

export default function CreateGame({ createCode, setCreateCode, onCreateGame, disabled }: { createCode: string; setCreateCode: (v: string) => void; onCreateGame: () => void; disabled: boolean; }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5 }}
      className="p-6 rounded-3xl bg-white shadow-lift border-4 border-primary/20 hover:border-primary/40 transition-all"
    >
      <h3 className="text-xl font-bold mb-4 text-text flex items-center gap-2">
        Create Game <span className="text-sm font-semibold px-3 py-1 rounded-full bg-gradient-to-r from-primary to-primaryDark text-white">Host</span>
      </h3>
      <input
        className="w-full px-4 py-3 rounded-2xl bg-surface text-text font-semibold border-3 border-muted/30 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all"
        placeholder="Join code (e.g., GAME123)"
        value={createCode}
        onChange={(e) => setCreateCode(e.target.value)}
      />
      <motion.button
        whileHover={{ scale: 1.05, y: -2 }} 
        whileTap={{ scale: 0.98 }}
        disabled={disabled}
        onClick={onCreateGame}
        className="mt-4 w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-primary to-primaryDark text-white text-lg font-bold shadow-lift btn-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        Create Game (You = Player 1)
      </motion.button>
    </motion.div>
  );
}
