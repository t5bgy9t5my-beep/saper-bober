function generateMines(count) {
  const mines = new Set();

  while (mines.size < count) {
    mines.add(Math.floor(Math.random() * 25));
  }

  return [...mines];
}

export default function handler(req, res) {
  if (req.method === "POST") {
    const minesCount = Number(req.body?.mines || 5);

    if (![3, 5, 8].includes(minesCount)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid mines count",
      });
    }

    const gameId =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

    const mines = generateMines(minesCount);

    return res.status(200).json({
      ok: true,
      gameId,
      mines,
      minesCount,
    });
  }

  return res.status(405).json({
    ok: false,
    error: "Method not allowed",
  });
}
