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
    win: 0,
    status: "playing",
    createdAt: Date.now(),
  };
}

function makeGameId() {
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
      bet = 10,
    } = req.body || {};

    // =========================
    // START
    // =========================

    if (action === "start") {
      const numericBet = Number(bet);

      if (
        !Number.isFinite(numericBet) ||
        numericBet <= 0
      ) {
        return res.status(400).json({
          ok: false,
          error: "Invalid bet",
        });
      }

      const id = makeGameId();

      const game = createGame(numericBet);

      games.set(id, game);

      return res.status(200).json({
        ok: true,
        gameId: id,
        boardSize: BOARD_SIZE,
        mines: MINES,
        bet: game.bet,
        multiplier: game.multiplier,
        win: 0,
        opened: [],
        status: "playing",
      });
    }

    // =========================
    // STATE
    // =========================

    if (action === "state") {
      if (!gameId || !games.has(gameId)) {
        return res.status(200).json({
          ok: true,
          exists: false,
        });
      }

      const game = games.get(gameId);

      return res.status(200).json({
        ok: true,
        exists: true,
        gameId,
        boardSize: BOARD_SIZE,
        mines: MINES,
        bet: game.bet,
        multiplier: game.multiplier,
        win: game.win,
        opened: game.opened,
        status: game.status,
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

      // МИНА
      if (game.mines.includes(cellNumber)) {
        game.status = "lost";
        game.multiplier = 0;
        game.win = 0;

        return res.status(200).json({
          ok: true,
          result: "mine",
          cell: cellNumber,
          multiplier: 0,
          win: 0,
          opened: game.opened,
          status: "lost",
        });
      }

      // БЕЗОПАСНАЯ КЛЕТКА
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

      if (game.win <= 0) {
        return res.status(400).json({
          ok: false,
          error: "Nothing to cash out",
        });
      }

      game.status = "cashed_out";

      const win = game.win;

      return res.status(200).json({
        ok: true,
        result: "cashout",
        multiplier: game.multiplier,
        win,
        opened: game.opened,
        status: "cashed_out",
      });
    }

    return res.status(400).json({
      ok: false,
      error: "Unknown action",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: "Server error",
    });
  }
}
