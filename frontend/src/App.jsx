import React, { useEffect, useMemo, useState } from "react";
import { CONTRACT_ADDRESS } from "./address.js";
import { ABI } from "./abi.js";
import { ethers } from "ethers";
import Board from "./Board";
import CreateGame from "./CreateGame";
import JoinGame from "./JoinGame";
import GameRoomHeader from "./GameRoomHeader";

// Initialize empty 8x8 board: 0=empty, 1=red, 2=black, 3=red king, 4=black king
function initBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(0));
  // Red pieces (rows 0-2)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) board[row][col] = 1;
    }
  }
  // Black pieces (rows 5-7)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) board[row][col] = 2;
    }
  }
  return board;
}

function boardToString(board) {
  return board.map(row => row.join('')).join(',');
}

function stringToBoard(str) {
  if (!str || str === "start") return initBoard();
  return str.split(',').map(row => row.split('').map(Number));
}

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [addr, setAddr] = useState("");
  const [chainId, setChainId] = useState(0);
  const [contract, setContract] = useState(null);
  const [devFee, setDevFee] = useState(0n);

  const [createCode, setCreateCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [gameId, setGameId] = useState(0);
  const [board, setBoard] = useState(initBoard());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [currentTurn, setCurrentTurn] = useState(0); // 0=red, 1=black
  const [gameActive, setGameActive] = useState(false);
  const [playerColor, setPlayerColor] = useState(null); // 0=red, 1=black
  const [status, setStatus] = useState("");
  const [opponentAddr, setOpponentAddr] = useState("");

  useEffect(() => {
    const eth = window.ethereum || window.miniapps?.ethereum || null;
    if (!eth) { 
      setStatus("No Ethereum provider found. Please install MetaMask.");
      return;
    }
    const p = new ethers.BrowserProvider(eth);
    setProvider(p);
    (async () => {
      try {
        await eth.request({ method: "eth_requestAccounts" });
        const s = await p.getSigner();
        setSigner(s);
        setAddr(await s.getAddress());
        const net = await p.getNetwork();
        setChainId(Number(net.chainId));
      } catch (error) {
        console.error("Wallet connection error:", error);
        setStatus("Failed to connect wallet: " + error.message);
      }
    })();
  }, []);

  const contractAddress = useMemo(() => {
    if (chainId === 31337) return CONTRACT_ADDRESS.localhost || "";
    return CONTRACT_ADDRESS.baseSepolia || "";
  }, [chainId]);

  useEffect(() => {
    if (provider && contractAddress && signer) {
      try {
        const c = new ethers.Contract(contractAddress, ABI, provider).connect(signer);
        setContract(c);
        (async () => {
          try {
            const fee = await c.devFee();
            setDevFee(fee);
          } catch (e) {
            console.error("Failed to fetch devFee:", e);
          }
        })();
      } catch (error) {
        console.error("Contract initialization error:", error);
        setStatus("Failed to initialize contract: " + error.message);
      }
    }
  }, [provider, signer, contractAddress]);

  useEffect(() => {
    if (!contract) return;
    const onJoined = (joinedGameId, black) => {
      if (playerColor === 0 && Number(joinedGameId) === gameId) {
        setGameActive(true);
        setStatus("Opponent joined. Your turn (RED).");
      }
      if (playerColor === 1 && Number(joinedGameId) === gameId) {
        setGameActive(true);
      }
    };
    const onMove = (mGameId, player, newBoardStr, nextTurn) => {
      if (Number(mGameId) !== gameId) return;
      setBoard(stringToBoard(newBoardStr));
      setCurrentTurn(Number(nextTurn));
    };
    contract.on("GameJoined", onJoined);
    contract.on("MoveMade", onMove);
    const poll = setInterval(async () => {
      if (!gameId) return;
      try {
        const g = await contract.games(gameId);
        setGameActive(g.active);
        setCurrentTurn(Number(g.turn));
        setBoard(stringToBoard(g.board));
      } catch {}
    }, 2000);
    return () => {
      try { contract.off("GameJoined", onJoined); contract.off("MoveMade", onMove); } catch {}
      clearInterval(poll);
    };
  }, [contract, gameId, playerColor]);

  async function onCreateGame() {
    if (!contract || !createCode) return;
    try {
      const hash = ethers.keccak256(ethers.toUtf8Bytes(createCode));
      setStatus("Creating game...");
      const initialBoard = boardToString(initBoard());
      const tx = await contract.createGame(hash, initialBoard);
      await tx.wait();
      const next = await contract.nextGameId();
      setGameId(Number(next));
      setBoard(initBoard());
      setPlayerColor(0); // Host is red
      setCurrentTurn(0);
      setGameActive(false); // Not active until opponent joins
      setStatus(`Game #${Number(next)} created. Share code: "${createCode}" with opponent.`);
    } catch (error) {
      console.error("Create game error:", error);
      setStatus("Failed to create game: " + error.message);
    }
  }

  async function onJoinGame() {
    if (!contract || !joinCode) return;
    try {
      setStatus("Joining game...");
      const tx = await contract.joinGame(joinCode);
      const rc = await tx.wait();
      const next = await contract.nextGameId();
      setGameId(Number(next));
      const g = await contract.games(next);
      setBoard(stringToBoard(g.board));
      setCurrentTurn(Number(g.turn));
      setGameActive(g.active);
      setPlayerColor(1); // Joiner is black
      setOpponentAddr(g.red);
      setStatus(`Joined game #${Number(next)}. You are BLACK. Wait for RED's turn.`);
    } catch (error) {
      console.error("Join game error:", error);
      setStatus("Failed to join game: " + error.message);
    }
  }

  async function submitMove(newBoard) {
    if (!contract || !gameId) return;
    try {
      setStatus("Submitting move on-chain...");
      const boardStr = boardToString(newBoard);
      const tx = await contract.makeMove(gameId, boardStr, { value: devFee });
      await tx.wait();
      const g = await contract.games(gameId);
      setBoard(stringToBoard(g.board));
      setCurrentTurn(Number(g.turn));
      setStatus("Move recorded on-chain. Opponent's turn.");
    } catch (error) {
      console.error("Move error:", error);
      setStatus("Failed to submit move: " + error.message);
    }
  }

  function isValidMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    if (piece === 0) return false;
    
    // Check if it's player's piece
    if (playerColor === 0 && (piece !== 1 && piece !== 3)) return false;
    if (playerColor === 1 && (piece !== 2 && piece !== 4)) return false;

    const rowDiff = toRow - fromRow;
    const colDiff = Math.abs(toCol - fromCol);

    // Regular move (1 square diagonally)
    if (Math.abs(rowDiff) === 1 && colDiff === 1) {
      if (piece === 1 && rowDiff < 0) return false; // Red moves down only (unless king)
      if (piece === 2 && rowDiff > 0) return false; // Black moves up only (unless king)
      return board[toRow][toCol] === 0;
    }

    // Jump move (2 squares, capture opponent)
    if (Math.abs(rowDiff) === 2 && colDiff === 2) {
      const midRow = (fromRow + toRow) / 2;
      const midCol = (fromCol + toCol) / 2;
      const midPiece = board[midRow][midCol];
      
      if (board[toRow][toCol] !== 0) return false;
      
      // Check if middle piece is opponent's
      if (playerColor === 0 && (midPiece === 2 || midPiece === 4)) return true;
      if (playerColor === 1 && (midPiece === 1 || midPiece === 3)) return true;
    }

    return false;
  }

  function handleSquareClick(displayRow, col) {
    if (!gameActive) { setStatus("Game not active yet."); return; }
    if (currentTurn !== playerColor) { setStatus("Not your turn!"); return; }

    const row = playerColor === 0 ? 7 - displayRow : displayRow;

    if (selectedSquare) {
      const [fromRow, fromCol] = selectedSquare;
      if (fromRow === row && fromCol === col) { setSelectedSquare(null); return; }

      if (isValidMove(fromRow, fromCol, row, col)) {
        const newBoard = board.map(r => [...r]);
        const piece = newBoard[fromRow][fromCol];
        newBoard[fromRow][fromCol] = 0;
        if (Math.abs(row - fromRow) === 2) {
          const midRow = (fromRow + row) / 2;
          const midCol = (fromCol + col) / 2;
          newBoard[midRow][midCol] = 0;
        }
        if ((piece === 1 && row === 7) || (piece === 2 && row === 0)) {
          newBoard[row][col] = piece + 2;
        } else {
          newBoard[row][col] = piece;
        }
        setBoard(newBoard);
        setSelectedSquare(null);
        submitMove(newBoard);
      } else {
        setStatus("Invalid move!");
        setSelectedSquare(null);
      }
    } else {
      const piece = board[row][col];
      if (piece === 0) return;
      if (playerColor === 0 && (piece === 1 || piece === 3)) setSelectedSquare([row, col]);
      else if (playerColor === 1 && (piece === 2 || piece === 4)) setSelectedSquare([row, col]);
    }
  }

  function renderPiece(piece) {
    if (piece === 0) return null;
    const isRed = piece === 1 || piece === 3;
    const isKing = piece === 3 || piece === 4;
    return (
      <div style={{
        width: 50,
        height: 50,
        borderRadius: '50%',
        background: isRed ? '#dc2626' : '#1f2937',
        border: '2px solid ' + (isRed ? '#991b1b' : '#000'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 20
      }}>
        {isKing ? '♔' : ''}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
        <header className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-semibold text-white">OnDrafts — Onchain Checkers</h1>
          <div className="text-sm text-gray-400">Every move is a transaction on Base</div>
        </header>
      
        <GameRoomHeader addr={addr} chainId={chainId} gameId={gameId} playerColor={playerColor} currentTurn={currentTurn} status={status || (gameActive ? "Active" : "Waiting")} devFee={devFee} />

        {!gameId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CreateGame createCode={createCode} setCreateCode={setCreateCode} onCreateGame={onCreateGame} disabled={!createCode || !contract} />
            <JoinGame joinCode={joinCode} setJoinCode={setJoinCode} onJoinGame={onJoinGame} disabled={!joinCode || !contract} />
          </div>
        )}

      {gameId > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
          <div style={{ display: 'inline-block', border: '4px solid #8b4513', borderRadius: 8, overflow: 'hidden' }}>
            {Array.from({ length: 8 }).map((_, displayRow) => (
              <div key={displayRow} style={{ display: 'flex' }}>
                {Array.from({ length: 8 }).map((_, colIdx) => {
                  const actualRow = playerColor === 0 ? 7 - displayRow : displayRow;
                  const piece = board[actualRow][colIdx];
                  const isLight = (displayRow + colIdx) % 2 === 0;
                  const isSelected = selectedSquare && selectedSquare[0] === actualRow && selectedSquare[1] === colIdx;
                  return (
                    <div
                      key={colIdx}
                      onClick={() => handleSquareClick(displayRow, colIdx)}
                      style={{
                        width: 64,
                        height: 64,
                        background: isSelected ? '#fbbf24' : (isLight ? '#f5deb3' : '#8b4513'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: gameActive && currentTurn === playerColor ? 'pointer' : 'default',
                        border: isSelected ? '3px solid #f59e0b' : 'none'
                      }}
                    >
                      {renderPiece(piece)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

        <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 text-center">
          <strong>📢 {status || "Connect wallet and create/join a game"}</strong>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-yellow-100/10 border border-yellow-200/20 text-sm">
          <strong>How to play:</strong>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>🔴 RED (host) moves first; board bottom for RED</li>
            <li>Click a piece, then click destination square</li>
            <li>Regular pieces move diagonally forward; Kings move both ways</li>
            <li>Jump over an opponent's piece to capture</li>
            <li>Reach the far end to promote to King</li>
            <li>Each on-chain move pays the dev fee</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
