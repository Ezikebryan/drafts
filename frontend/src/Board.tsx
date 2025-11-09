import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Board({ board, playerColor, selectedSquare, validMoves, onSquareClick, currentTurn, gameActive }: { board: number[][]; playerColor: number | null; selectedSquare: [number, number] | null; validMoves: [number, number][]; onSquareClick: (displayR: number, displayC: number) => void; currentTurn: number; gameActive: boolean; }) {
  const displayRows = Array.from({ length: 8 });

  function pieceSvg(piece: number) {
    if (piece === 0) return null;
    const isP1 = piece === 1 || piece === 3;
    const isKing = piece === 3 || piece === 4;
    const fill = isP1 ? "url(#greenGrad)" : "url(#pinkGrad)";
    const stroke = isP1 ? "#46A302" : "#FF6B6B";
    return (
      <svg width="54" height="54" viewBox="0 0 60 60" className="drop-shadow-lg">
        <defs>
          <radialGradient id="greenGrad" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#58CC02"/>
            <stop offset="50%" stopColor="#46A302"/>
            <stop offset="100%" stopColor="#3A8602"/>
          </radialGradient>
          <radialGradient id="pinkGrad" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#FF6B6B"/>
            <stop offset="50%" stopColor="#C77DFF"/>
            <stop offset="100%" stopColor="#A855F7"/>
          </radialGradient>
        </defs>
        <circle cx="30" cy="30" r="24" fill={fill} stroke={stroke} strokeWidth="3" />
        {isKing && (
          <text x="30" y="37" textAnchor="middle" fontSize="28" fill="#FFD93D" style={{ filter: "drop-shadow(0 0 8px rgba(255,217,61,0.9))" }}>♔</text>
        )}
      </svg>
    );
  }

  return (
    <div className="w-full max-w-[640px] mx-auto">
      <div className="square-container rounded-3xl shadow-lift overflow-hidden border-4 border-white">
        {displayRows.map((_, displayRow) => (
          <div key={displayRow} className="flex" style={{ height: '12.5%' }}>
            {Array.from({ length: 8 }).map((_, colIdx) => {
              const actualRow = playerColor === 0 ? 7 - displayRow : displayRow;
              const piece = board[actualRow][colIdx];
              const isLight = (displayRow + colIdx) % 2 === 0;
              const isSelected = selectedSquare && selectedSquare[0] === actualRow && selectedSquare[1] === colIdx;
              const isValidMove = validMoves.some(([r, c]) => r === actualRow && c === colIdx);
              const pieceKey = `${actualRow}-${colIdx}-${piece}`;
              
              return (
                <motion.button
                  key={colIdx}
                  onClick={() => onSquareClick(displayRow, colIdx)}
                  whileHover={{ scale: gameActive && currentTurn !== null ? 1.05 : 1 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-center transition-all duration-200 relative"
                  style={{ 
                    width: '12.5%',
                    height: '100%',
                    background: isSelected 
                      ? "linear-gradient(135deg, #4CC9F0, #58CC02)" 
                      : (isLight ? "#FFF8E7" : "#FFD6A5"), 
                    border: isSelected ? "3px solid #58CC02" : "none",
                    boxShadow: isSelected ? "0 0 15px rgba(88,204,2,0.5)" : "none"
                  }}
                >
                  {/* Valid move indicator */}
                  {isValidMove && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                    >
                      <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-primary shadow-lg animate-pulse" />
                    </motion.div>
                  )}
                  
                  <AnimatePresence mode="wait">
                    {piece !== 0 && (
                      <motion.div
                        key={pieceKey}
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.3, opacity: 0 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 500, 
                          damping: 25,
                          mass: 0.5
                        }}
                        whileHover={{ y: -3, transition: { duration: 0.2 } }}
                        className="w-full h-full flex items-center justify-center"
                        style={{ maxWidth: '54px', maxHeight: '54px' }}
                      >
                        {pieceSvg(piece)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
