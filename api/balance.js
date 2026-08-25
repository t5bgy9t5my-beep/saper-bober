const balances = globalThis.__boberBalances || new Map();
globalThis.__boberBalances = balances;

const START_BALANCE = 1000;

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const { action, telegramId } = req.body || {};

    if (!telegramId) {
      return res.status(400).json({
        ok: false,
        error: "Telegram ID required",
      });
    }

    const id = String(telegramId);

    if (!balances.has(id)) {
      balances.set(id, START_BALANCE);
    }

    let balance = balances.get(id);

    if (action === "get") {
      return res.status(200).json({
        ok: true,
        telegramId: id,
        balance,
      });
    }

    if (action === "deposit") {
      const amount = Number(req.body.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          ok: false,
          error: "Invalid amount",
        });
      }

      balance += amount;
      balances.set(id, balance);

      return res.status(200).json({
        ok: true,
        balance,
      });
    }

    if (action === "withdraw") {
      const amount = Number(req.body.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          ok: false,
          error: "Invalid amount",
        });
      }

      if (amount > balance) {
        return res.status(400).json({
          ok: false,
          error: "Insufficient balance",
        });
      }

      balance -= amount;
      balances.set(id, balance);

      return res.status(200).json({
        ok: true,
        balance,
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
