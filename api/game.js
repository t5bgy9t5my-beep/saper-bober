```javascript
const games = new Map();
const balances = new Map();

const BOARD_SIZE = 25;
const MINES = 5;
const START_BALANCE = 1000;

function getBalance(userId) {
  if (!balances.has(userId)) {
    balances.set(userId, START_BALANCE);
  }

  return balances.get(userId);
}

function setBalance(userId, value) {
  balances.set(userId, Number(value.toFixed(2)));
}

function createGame(bet, userId) {
  const mines = new Set();

  while (mines.size < MINES) {
    mines.add(Math.floor(Math.random() * BOARD_SIZE));
  }

  return {
    userId,
    bet: Number(bet),
    mines: [...mines],
    opened: [],
    multiplier: 1,
    win: 0,
    status: "playing",
  };
}

function createGameId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const {
      action,
      gameId,
      cell,
      bet,
      userId = "demo-user",
    } = req.body || {};

    // =========================
    // START
    // =========================

    if (action === "start") {
      const gameBet = Number(bet);

      if (
        !Number.isFinite(gameBet) ||
        gameBet <= 0
      ) {
        return res.status(400).json({
          ok: false,
          error: "Invalid bet",
        });
      }

      if (gameBet > 100000) {
        return res.status(400).json({
          ok: false,
          error: "Bet is too large",
        });
      }

      const balance = getBalance(String(userId));

      if (balance < gameBet) {
        return res.status(400).json({
          ok: false,
          error: "Insufficient balance",
          balance,
        });
      }

      // Списываем ставку СЕРВЕРНО.
      const newBalance = balance - gameBet;
      setBalance(String(userId), newBalance);

      const id = createGameId();

      const game = createGame(
        gameBet,
        String(userId)
      );

      games.set(id, game);

      return res.status(200).json({
        ok: true,
        gameId: id,
        boardSize: BOARD_SIZE,
        mines: MINES,
        bet: game.bet,
        multiplier: 1,
        win: 0,
        balance: newBalance,
        status: "playing",
      });
    }

    // =========================
    // OPEN
    // =========================

    if (action === "open") {
      if (!gameId || !games.has(gameId)) {
        return res.status(400).json({
          ok: false,
          error: "Game not found",
        });
      }

      const game = games.get(gameId);

      if (String(game.userId) !== String(userId)) {
        return res.status(403).json({
          ok: false,
          error: "Game belongs to another user",
        });
      }

      if (game.status !== "playing") {
        return res.status(400).json({
          ok: false,
          error: "Game already finished",
        });
      }

      const cellNumber = Number(cell);

      if (
        !Number.isInteger(cellNumber) ||
        cellNumber < 0 ||
        cellNumber >= BOARD_SIZE
      ) {
        return res.status(400).json({
          ok: false,
          error: "Invalid cell",
        });
      }

      if (game.opened.includes(cellNumber)) {
        return res.status(400).json({
          ok: false,
          error: "Cell already opened",
        });
      }

      game.opened.push(cellNumber);

      // =========================
      // MINE
      // =========================

      if (game.mines.includes(cellNumber)) {
        game.status = "lost";
        game.win = 0;

        return res.status(200).json({
          ok: true,
          result: "mine",
          cell: cellNumber,
          multiplier: 0,
          win: 0,
          bet: game.bet,
          opened: game.opened,
          balance: getBalance(String(userId)),
          status: "lost",
        });
      }

      // =========================
      // SAFE
      // =========================

      game.multiplier = Number(
        (game.multiplier * 1.25).toFixed(2)
      );

      game.win = Number(
        (game.bet * game.multiplier).toFixed(2)
      );

      return res.status(200).json({
        ok: true,
        result: "safe",
        cell: cellNumber,
        multiplier: game.multiplier,
        win: game.win,
        bet: game.bet,
        opened: game.opened,
        balance: getBalance(String(userId)),
        status: "playing",
      });
    }

    // =========================
    // CASHOUT
    // =========================

    if (action === "cashout") {
      if (!gameId || !games.has(gameId)) {
        return res.status(400).json({
          ok: false,
          error: "Game not found",
        });
      }

      const game = games.get(gameId);

      if (String(game.userId) !== String(userId)) {
        return res.status(403).json({
          ok: false,
          error: "Game belongs to another user",
        });
      }

      if (game.status !== "playing") {
        return res.status(400).json({
          ok: false,
          error: "Game is not active",
        });
      }

      if (game.win <= 0) {
        return res.status(400).json({
          ok: false,
          error: "Nothing to cash out",
        });
      }

      // ВАЖНО:
      // сумма берётся только из серверного состояния игры.
      const win = game.win;

      const balance = getBalance(String(userId));

      const newBalance = balance + win;

      setBalance(String(userId), newBalance);

      game.status = "cashed_out";

      return res.status(200).json({
        ok: true,
        result: "cashout",
        bet: game.bet,
        multiplier: game.multiplier,
        win,
        balance: newBalance,
        status: "cashed_out",
      });
    }

    // =========================
    // BALANCE
    // =========================

    if (action === "balance") {
      const balance = getBalance(String(userId));

      return res.status(200).json({
        ok: true,
        balance,
      });
    }

    // =========================
    // UNKNOWN ACTION
    // =========================

    return res.status(400).json({
      ok: false,
      error: "Unknown action",
    });
  } catch (error) {
    console.error("GAME ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Server error",
    });
  }
}
```
