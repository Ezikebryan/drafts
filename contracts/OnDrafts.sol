pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract OnDrafts is Ownable, ReentrancyGuard {
    struct Game {
        address red;        // player who created the game (goes first)
        address black;      // joining player
        string board;       // serialized board state
        uint8 turn;         // 0 = red, 1 = black
        bool active;
        uint256 lastMoveAt;
    }

    mapping(uint256 => Game) public games;
    uint256 public nextGameId;
    uint256 public devFee;      // wei per move
    uint256 public devBalance;  // accumulated fees

    // Pending games addressed by join-code hash
    mapping(bytes32 => uint256) private pendingByCode;

    event GameCreated(uint256 indexed gameId, address indexed red, bytes32 joinCodeHash);
    event GameJoined(uint256 indexed gameId, address indexed black);
    event MoveMade(uint256 indexed gameId, address indexed player, string board, uint8 nextTurn);
    event GameEnded(uint256 indexed gameId, address indexed by);
    event DevFeeUpdated(uint256 fee);
    event DevWithdrawn(address indexed to, uint256 amount);

    constructor(uint256 _devFee) Ownable(msg.sender) {
        devFee = _devFee;
    }

    function setDevFee(uint256 _fee) external onlyOwner {
        devFee = _fee;
        emit DevFeeUpdated(_fee);
    }

    function withdrawDevBalance(address payable to, uint256 amount) external onlyOwner nonReentrant {
        require(amount <= devBalance, "insufficient dev balance");
        devBalance -= amount;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "withdraw failed");
        emit DevWithdrawn(to, amount);
    }

    // Host creates a pending game with a join-code hash
    function createGame(bytes32 joinCodeHash, string calldata initialBoard) external returns (uint256 gameId) {
        require(pendingByCode[joinCodeHash] == 0, "code already used");
        gameId = ++nextGameId; // start from 1 for sentinel simplicity
        games[gameId] = Game({
            red: msg.sender,
            black: address(0),
            board: initialBoard,
            turn: 0,
            active: false,
            lastMoveAt: 0
        });
        pendingByCode[joinCodeHash] = gameId;
        emit GameCreated(gameId, msg.sender, joinCodeHash);
    }

    // Opponent joins by providing the plaintext join-code; contract checks keccak256
    function joinGame(string calldata joinCode) external returns (uint256 gameId) {
        bytes32 codeHash = keccak256(bytes(joinCode));
        gameId = pendingByCode[codeHash];
        require(gameId != 0, "invalid join code");
        Game storage g = games[gameId];
        require(g.black == address(0), "already joined");
        require(g.red != msg.sender, "host cannot join");
        g.black = msg.sender;
        g.active = true;
        g.lastMoveAt = block.timestamp;
        delete pendingByCode[codeHash];
        emit GameJoined(gameId, msg.sender);
    }

    // Frontend validates move legality; contract enforces turn, identity, active state, fee and stores board
    function makeMove(uint256 gameId, string calldata newBoard) external payable {
        Game storage g = games[gameId];
        require(g.active, "game inactive");
        if (g.turn == 0) {
            require(msg.sender == g.red, "red's turn");
        } else {
            require(msg.sender == g.black, "black's turn");
        }
        require(msg.value == devFee, "fee mismatch");
        if (msg.value > 0) {
            devBalance += msg.value;
        }
        g.board = newBoard;
        g.turn = uint8(1 - g.turn);
        g.lastMoveAt = block.timestamp;
        emit MoveMade(gameId, msg.sender, newBoard, g.turn);
    }

    function endGame(uint256 gameId) external {
        Game storage g = games[gameId];
        require(g.active, "already inactive");
        require(msg.sender == g.red || msg.sender == g.black, "only players");
        g.active = false;
        emit GameEnded(gameId, msg.sender);
    }

    function getPendingGameId(bytes32 joinCodeHash) external view returns (uint256) {
        return pendingByCode[joinCodeHash];
    }

    receive() external payable {
        devBalance += msg.value;
    }
}
