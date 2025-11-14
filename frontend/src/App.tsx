import React, { useEffect, useMemo, useState } from "react";
import { CONTRACT_ADDRESS } from "./address.js";
import { ABI } from "./abi.js";
import { ethers } from "ethers";
import Board from "./Board";
import CreateGame from "./CreateGame";
import JoinGame from "./JoinGame";
import GameRoomHeader from "./GameRoomHeader";
import { motion } from "framer-motion";
import FarcasterIntegration from "./FarcasterIntegration";
// Add Wagmi hooks
import { useAccount, useConnect, usePublicClient, useWalletClient } from 'wagmi';
import { writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import { config } from './wagmi';

type BoardArray = number[][]; // 8x8

function initBoard(): BoardArray {
  const board = Array(8).fill(null).map(() => Array(8).fill(0));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) board[r][c] = 1;
  for (let r = 5; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) board[r][c] = 2;
  return board;
}
function boardToString(board: BoardArray): string { return board.map(r => r.join('')).join(','); }
function stringToBoard(str: string): BoardArray { if (!str || str === "start") return initBoard(); return str.split(',').map(r => r.split('').map(Number)); }

export default function App() {
  // Web3
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [addr, setAddr] = useState<string>("");
  const [chainId, setChainId] = useState<number>(0);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [devFee, setDevFee] = useState<bigint>(0n);

  // Wagmi hooks
  const { isConnected, address, chainId: wagmiChainId } = useAccount();
  const { connect, connectors } = useConnect();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Game
  const [createCode, setCreateCode] = useState<string>("");
  const [joinCode, setJoinCode] = useState<string>("");
  const [gameId, setGameId] = useState<number>(0);
  const [board, setBoard] = useState<BoardArray>(initBoard());
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [currentTurn, setCurrentTurn] = useState<number>(0); // 0 red, 1 black
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [playerColor, setPlayerColor] = useState<number | null>(null); // 0 red, 1 black
  const [status, setStatus] = useState<string>("");
  const [pending, setPending] = useState<boolean>(false);
  const [moveLog, setMoveLog] = useState<string[]>([]);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);

  // Auto-connect to Farcaster wallet if available
  useEffect(() => {
    if (connectors[0] && !isConnected) {
      // Try to connect automatically
      connect({ connector: connectors[0] });
    }
  }, [connectors, isConnected, connect]);

  // Update address and chain when Wagmi state changes
  useEffect(() => {
    if (isConnected && address) {
      setAddr(address);
    }
    if (wagmiChainId) {
      setChainId(wagmiChainId);
    }
  }, [isConnected, address, wagmiChainId]);

  // Handle wallet connection using Wagmi
  useEffect(() => {
    if (isConnected && address) {
      // Create ethers provider from Wagmi clients
      if (publicClient) {
        const ethersProvider = new ethers.BrowserProvider(publicClient.transport as any);
        setProvider(ethersProvider);
      }
      
      // Set status based on chain
      if (wagmiChainId === 8453) {
        setStatus("Ready to play!");
      } else {
        setStatus("⚠️ Wrong Network! This app only works on Base mainnet. Please switch to Base (chain ID: 8453).");
      }
    } else {
      setStatus("Wallet not connected. Please connect to play.");
    }
  }, [isConnected, address, wagmiChainId, publicClient]);

  const handleWalletConnected = (address: string) => {
    setAddr(address);
  };

  const handleWalletDisconnected = () => {
    setAddr("");
    setProvider(null);
    setSigner(null);
    setChainId(0);
    setStatus("Wallet disconnected. Please connect to play.");
  };

  // Contract setup
  const contractAddress = useMemo(() => {
    // Strictly require Base mainnet (chain ID 8453) for production
    if (chainId === 8453) {
      return CONTRACT_ADDRESS.base || "";
    }
    // Reject other networks
    return "";
  }, [chainId]);

  useEffect(() => {
    if (!(provider && contractAddress && isConnected)) return;
    // Create contract using the provider - Wagmi will handle signing through the wallet client
    const c = new ethers.Contract(contractAddress, ABI, provider);
    setContract(c as any);
    (async () => { try { const fee: bigint = await (c as any).devFee(); setDevFee(fee); } catch (e) { console.warn("devFee fetch failed", e); } })();
  }, [provider, contractAddress, isConnected]);

  // Event listeners + polling fallback
  useEffect(() => {
    if (!contract) return;
    const onJoined = (joinedGameId: bigint, black: string) => {
      if (playerColor === 0 && Number(joinedGameId) === gameId) { setGameActive(true); setStatus("Opponent joined. Your turn (RED)."); }
      if (playerColor === 1 && Number(joinedGameId) === gameId) { setGameActive(true); }
    };
    const onMove = (mGameId: bigint, player: string, newBoardStr: string, nextTurn: number) => {
      if (Number(mGameId) !== gameId) return;
      setBoard(stringToBoard(newBoardStr));
      setCurrentTurn(Number(nextTurn)); // This is the key fix - update the current turn from the event
      setMoveLog(l => [player.slice(0,6)+"…"+player.slice(-4)+" → turn="+Number(nextTurn), ...l].slice(0,10));
      setPending(false);
    };
    contract.on("GameJoined", onJoined);
    contract.on("MoveMade", onMove);
    const poll = setInterval(async () => {
      if (!gameId) return;
      try {
        const g = await contract.games(gameId);
        setGameActive(g.active);
        setCurrentTurn(Number(g.turn)); // Also update turn in polling
        setBoard(stringToBoard(g.board));
      } catch {}
    }, 2000);
    return () => { try { contract.off("GameJoined", onJoined); contract.off("MoveMade", onMove); } catch{} clearInterval(poll); };
  }, [contract, gameId, playerColor]);

  async function onCreateGame() {
    if (!contract || !createCode) return;
    try {
      const hash = ethers.keccak256(ethers.toUtf8Bytes(createCode));
      setStatus("Creating game..."); setPending(true);
      const initialBoard = boardToString(initBoard());
      
      // Use wagmi's writeContract for proper transaction signing
      const txHash = await writeContract(config, {
        address: (await contract.getAddress()) as `0x${string}`,
        abi: ABI,
        functionName: 'createGame',
        args: [hash, initialBoard]
      });
      
      // Wait for transaction confirmation
      await waitForTransactionReceipt(config, { hash: txHash });
      
      // After successful transaction, update the UI
      const next: bigint = await contract.nextGameId();
      setGameId(Number(next));
      setBoard(initBoard());
      setPlayerColor(0); // Creator is always red (playerColor 0)
      setCurrentTurn(0); // Red goes first (turn 0)
      setGameActive(false);
      setSelectedSquare(null);
      setStatus(`Game #${Number(next)} created. Share code "${createCode}" with opponent.`);
      setPending(false);
    } catch (error: any) {
      console.error("Create game error:", error);
      if (error.code === "ACTION_REJECTED" || error.code === 4001 || error.message?.includes("user rejected") || error.message?.includes("User rejected")) {
        setStatus("Game creation cancelled.");
      } else if (error.code === "INSUFFICIENT_FUNDS" || error.message?.includes("insufficient funds") || error.message?.includes("gas required exceeds allowance")) {
        setStatus("Not enough Base ETH in your wallet.");
      } else if (error.message?.includes("VoidSigner")) {
        setStatus("Wallet not connected properly. Please reconnect your wallet.");
      } else {
        setStatus("Failed to create game: " + (error.reason || error.message || "Unknown error"));
      }
      setPending(false);
    }
  }

  async function onJoinGame() {
    if (!contract || !joinCode) return;
    try {
      setStatus("Joining game..."); setPending(true);
      
      const txHash = await writeContract(config, {
        address: (await contract.getAddress()) as `0x${string}`,
        abi: ABI,
        functionName: 'joinGame',
        args: [joinCode]
      });
      
      const receipt = await waitForTransactionReceipt(config, { hash: txHash });
      
      // Get the game ID from the GameJoined event
      let joinedGameId: number | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === "GameJoined") {
            joinedGameId = Number(parsed.args[0]);
            setGameId(joinedGameId);
            
            // Fetch initial game state
            const g = await contract.games(joinedGameId);
            setBoard(stringToBoard(g.board));
            setCurrentTurn(Number(g.turn));
            setGameActive(g.active);
            break;
          }
        } catch { 
          // Continue to next log if parsing fails
        }
      }
      
      setPlayerColor(1); // Joiner is always black (playerColor 1)
      setSelectedSquare(null);
      setStatus("Successfully joined! Game starting...");
      setPending(false);
    } catch (error: any) {
      console.error("Join game error:", error);
      if (error.code === "ACTION_REJECTED" || error.code === 4001 || error.message?.includes("user rejected") || error.message?.includes("User rejected")) {
        setStatus("Join cancelled.");
      } else if (error.code === "INSUFFICIENT_FUNDS" || error.message?.includes("insufficient funds") || error.message?.includes("gas required exceeds allowance")) {
        setStatus("Not enough Base ETH in your wallet.");
      } else if (error.message?.includes("VoidSigner")) {
        setStatus("Wallet not connected properly. Please reconnect your wallet.");
      } else {
        setStatus("Failed to join game: " + (error.reason || error.message || "Unknown error"));
      }
      setPending(false);
    }
  }

  function getValidMovesForPiece(fromR: number, fromC: number): [number, number][] {
    const moves: [number, number][] = [];
    const piece = board[fromR][fromC];
    if (piece === 0) return moves;
    
    // Check if this piece belongs to the current player
    if (playerColor === 0 && !(piece === 1 || piece === 3)) return moves;
    if (playerColor === 1 && !(piece === 2 || piece === 4)) return moves;
    
    const isKing = piece === 3 || piece === 4;
    const directions = isKing 
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] // King can move all directions
      : piece === 1 
        ? [[1, -1], [1, 1]] // Red moves down
        : [[-1, -1], [-1, 1]]; // Black moves up
    
    // Check regular moves and jump moves
    for (const [dr, dc] of directions) {
      // Regular move (1 square)
      const r1 = fromR + dr;
      const c1 = fromC + dc;
      if (r1 >= 0 && r1 < 8 && c1 >= 0 && c1 < 8 && board[r1][c1] === 0) {
        moves.push([r1, c1]);
      }
      
      // Jump move (2 squares, capturing opponent)
      const r2 = fromR + dr * 2;
      const c2 = fromC + dc * 2;
      const midR = fromR + dr;
      const midC = fromC + dc;
      
      if (r2 >= 0 && r2 < 8 && c2 >= 0 && c2 < 8 && board[r2][c2] === 0) {
        const mid = board[midR][midC];
        // Check if there's an opponent piece to jump over
        if (playerColor === 0 && (mid === 2 || mid === 4)) {
          moves.push([r2, c2]);
        } else if (playerColor === 1 && (mid === 1 || mid === 3)) {
          moves.push([r2, c2]);
        }
      }
    }
    
    return moves;
  }

  function isValidMove(fromR: number, fromC: number, toR: number, toC: number): boolean {
    const piece = board[fromR][fromC]; if (piece === 0) return false;
    if (playerColor === 0 && !(piece === 1 || piece === 3)) return false; if (playerColor === 1 && !(piece === 2 || piece === 4)) return false;
    if (board[toR][toC] !== 0) return false;
    const rowDiff = toR - fromR; const colDiff = Math.abs(toC - fromC);
    const isKing = piece === 3 || piece === 4;
    if (!isKing) { if (piece === 1 && rowDiff < 0) return false; if (piece === 2 && rowDiff > 0) return false; }
    if (Math.abs(rowDiff) === 1 && colDiff === 1) return true;
    if (Math.abs(rowDiff) === 2 && colDiff === 2) {
      const midR = (fromR + toR) / 2; const midC = (fromC + toC) / 2; const mid = board[midR][midC];
      if (playerColor === 0 && (mid === 2 || mid === 4)) return true; if (playerColor === 1 && (mid === 1 || mid === 3)) return true;
    }
    return false;
  }

  async function submitMove(newBoard: BoardArray) {
    if (!contract || !gameId) return;
    try {
      setStatus("Submitting move..."); setPending(true);
      
      const txHash = await writeContract(config, {
        address: (await contract.getAddress()) as `0x${string}`,
        abi: ABI,
        functionName: 'makeMove',
        args: [gameId, boardToString(newBoard)],
        value: devFee
      });
      
      await waitForTransactionReceipt(config, { hash: txHash });
      
      // Update the UI after successful transaction
      const g = await contract.games(gameId);
      setBoard(stringToBoard(g.board));
      setCurrentTurn(Number(g.turn)); // This is the key fix - update the current turn
      setStatus("Move recorded."); setPending(false);
    } catch (error: any) {
      console.error("Move error:", error);
      // Check if user rejected the transaction
      if (error.code === "ACTION_REJECTED" || error.code === 4001 || error.message?.includes("user rejected") || error.message?.includes("User rejected")) {
        setStatus("Move cancelled.");
      } 
      // Check for insufficient funds
      else if (error.code === "INSUFFICIENT_FUNDS" || error.message?.includes("insufficient funds") || error.message?.includes("gas required exceeds allowance")) {
        setStatus("Not enough Base ETH in your wallet.");
      }
      else if (error.message?.includes("VoidSigner")) {
        setStatus("Wallet not connected properly. Please reconnect your wallet.");
      }
      // Handle turn validation errors from the contract
      else if (error.message?.includes("red's turn") || error.message?.includes("black's turn")) {
        setStatus("It's not your turn to move.");
        // Refresh the game state to get the correct turn
        const g = await contract.games(gameId);
        setCurrentTurn(Number(g.turn));
      }
      else {
        setStatus("Failed to submit move: " + (error.reason || error.message || "Unknown error"));
      }
      setPending(false);
    }
  }

  function handleSquareClick(displayR: number, displayC: number) {
    if (!gameActive) { setStatus("Game not active yet."); return; }
    if (currentTurn !== playerColor) { setStatus("Not your turn."); return; }
    const r = playerColor === 0 ? 7 - displayR : displayR; const c = displayC;
    if (selectedSquare) {
      const [sr, sc] = selectedSquare; 
      if (sr === r && sc === c) { 
        setSelectedSquare(null); 
        setValidMoves([]);
        return; 
      }
      if (isValidMove(sr, sc, r, c)) {
        const next = board.map(row => [...row]); const piece = next[sr][sc]; next[sr][sc] = 0;
        if (Math.abs(r - sr) === 2) { const midR = (sr + r) / 2; const midC = (sc + c) / 2; next[midR][midC] = 0; }
        if ((piece === 1 && r === 7) || (piece === 2 && r === 0)) next[r][c] = piece + 2; else next[r][c] = piece;
        setBoard(next); 
        setSelectedSquare(null); 
        setValidMoves([]);
        submitMove(next);
      } else { 
        setStatus("Invalid move."); 
        setSelectedSquare(null);
        setValidMoves([]);
      }
    } else {
      const piece = board[r][c]; if (piece === 0) return;
      if (playerColor === 0 && (piece === 1 || piece === 3)) {
        setSelectedSquare([r, c]);
        setValidMoves(getValidMovesForPiece(r, c));
      } else if (playerColor === 1 && (piece === 2 || piece === 4)) {
        setSelectedSquare([r, c]);
        setValidMoves(getValidMovesForPiece(r, c));
      }
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Floating background bubbles */}
      <div className="floating-bubble bubble-1"></div>
      <div className="floating-bubble bubble-2"></div>
      <div className="floating-bubble bubble-3"></div>
      <div className="floating-bubble bubble-4"></div>
      
      <div className="max-w-5xl mx-auto p-4 sm:p-6 relative z-10">
        <header className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
            className="flex items-center justify-center gap-3 mb-3"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primaryDark shadow-lift flex-shrink-0" />
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accentBlue">
              Draftsmaster
            </h1>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-base md:text-lg text-text font-semibold"
          >
            Every move is a transaction on Base
          </motion.div>
        </header>

        {/* Farcaster Integration */}
        <FarcasterIntegration 
          onWalletConnected={handleWalletConnected}
          onWalletDisconnected={handleWalletDisconnected}
        />

        <GameRoomHeader addr={addr} chainId={chainId} gameId={gameId} playerColor={playerColor} currentTurn={currentTurn} status={status || (gameActive ? "Active" : "Waiting")} devFee={devFee} />

        {!gameId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CreateGame createCode={createCode} setCreateCode={setCreateCode} onCreateGame={onCreateGame} disabled={!createCode || !contract} />
            <JoinGame joinCode={joinCode} setJoinCode={setJoinCode} onJoinGame={onJoinGame} disabled={!joinCode || !contract} />
          </div>
        )}

        {gameId > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mt-8 w-full"
          >
            <Board
              board={board}
              playerColor={playerColor}
              selectedSquare={selectedSquare}
              validMoves={validMoves}
              onSquareClick={handleSquareClick}
              currentTurn={currentTurn}
              gameActive={gameActive}
            />
          </motion.div>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white shadow-soft border-3 border-primary/10">
            <strong className="text-xl text-text font-bold">
              {status || "Connect wallet and create/join a game"}
            </strong>
            {pending && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="mt-4 flex items-center gap-3 text-base text-primary font-bold bg-primary/10 px-4 py-3 rounded-2xl"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-5 h-5 border-3 border-primary border-t-transparent rounded-full"
                />
                Transaction pending…
              </motion.div>
            )}
          </div>
          <div className="p-6 rounded-3xl bg-white shadow-soft border-3 border-accentBlue/10">
            <div className="text-lg font-bold mb-3 text-text">
              Move History
            </div>
            <ul className="text-sm space-y-2 max-h-32 overflow-y-auto">
              {moveLog.length === 0 && <li className="text-muted">No moves yet</li>}
              {moveLog.map((m, i) => (
                <motion.li 
                  key={i} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="text-text font-medium"
                >
                  • {m}
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }}
          className="mt-8 p-6 rounded-3xl bg-gradient-to-br from-secondary/20 to-accentPurple/10 shadow-soft border-3 border-secondary/30 text-base"
        >
          <strong className="text-xl text-text font-bold mb-4 block">
            How to Play
          </strong>
          <ul className="list-none pl-0 space-y-2.5 text-text font-medium">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">1</span>
              <span>Player 1 (host) sees board from bottom; Player 2 (joiner) from top</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">2</span>
              <span>Click a piece, then click destination square</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">3</span>
              <span>Regular pieces move diagonally forward; Kings (♔) move both ways</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">4</span>
              <span>Jump over an opponent's piece to capture</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">5</span>
              <span>Reach the far end to promote to King</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">6</span>
              <span>Each on-chain move pays the dev fee</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}