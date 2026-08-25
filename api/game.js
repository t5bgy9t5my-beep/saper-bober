```javascript
const games = new Map();

const BOARD_SIZE = 25;
const MINES = 5;

function createGame(bet) {
  const mines = new Set();

  while (mines.size < MINES) {
    mines.add(Math.floor(Math.random() * BOARD_SIZE));
  }

  return {
    bet: Number(bet),
    mines: [...mines],
    opened: [],
    multiplier: 1,
    status: "playing",
    win: 0,
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
    } = req.body || {};

    // =========================
    // START GAME
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

      const id = createGameId();

      const game = createGame(gameBet);

      games.set(id, game);

      return res.status(200).json({
        ok: true,
        gameId: id,
        boardSize: BOARD_SIZE,
        mines: MINES,
        bet: game.bet,
        multiplier: 1,
        win: 0,
        status: "playing",
      });
    }

    // =========================
    // OPEN CELL
    // =========================

    if (action === "open") {
      if (!gameId || !games.has(gameId)) {
        return res.status(400).json({
          ok: false,
          error: "Game not found",
        });
      }

      const game = games.get(gameId);

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
          status: "lost",
        });
      }

      // =========================
      // SAFE CELL
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

      if (game.status !== "playing") {
        return res.status(400).json({
          ok: false,
          error: "Game is not active",
        });
      }

      // ВАЖНО:
      // ставка берётся только из серверной игры.
      // bet из запроса клиента здесь НЕ используется.

      game.status = "cashed_out";

      return res.status(200).json({
        ok: true,
        result: "cashout",
        bet: game.bet,
        multiplier: game.multiplier,
        win: game.win,
        status: "cashed_out",
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
