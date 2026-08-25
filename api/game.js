const games = new Map();

const BOARD_SIZE = 25;
const MINES = 5;

function createGame() {
  const mines = new Set();

  while (mines.size < MINES) {
    mines.add(Math.floor(Math.random() * BOARD_SIZE));
  }

  return {
    mines: [...mines],
    opened: [],
    multiplier: 1,
    status: "playing",
  };
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

    // Создание новой игры
    if (action === "start") {
      const id =
        Date.now().toString(36) +
        Math.random().toString(36).slice(2);

      const game = createGame();

      games.set(id, game);

      return res.status(200).json({
        ok: true,
        gameId: id,
        boardSize: BOARD_SIZE,
        mines: MINES,
        multiplier: 1,
        win: 0,
        status: "playing",
      });
    }

    // Открытие клетки
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

      // Мина
      if (game.mines.includes(cellNumber)) {
        game.status = "lost";

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

      // Безопасная клетка
      game.multiplier = Number(
        (game.multiplier * 1.25).toFixed(2)
      );

      const win = Number(
        (Number(bet) * game.multiplier).toFixed(2)
      );

      return res.status(200).json({
        ok: true,
        result: "safe",
        cell: cellNumber,
        multiplier: game.multiplier,
        win,
        opened: game.opened,
        status: "playing",
      });
    }

    // Забрать выигрыш
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

      const win = Number(
        (Number(bet) * game.multiplier).toFixed(2)
      );

      game.status = "cashed_out";

      return res.status(200).json({
        ok: true,
        result: "cashout",
        multiplier: game.multiplier,
        win,
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
