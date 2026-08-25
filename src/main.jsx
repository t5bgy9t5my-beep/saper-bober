import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const BALANCE_KEY = "saper_bober_balance";
const HISTORY_KEY = "saper_bober_history";
const BONUS_KEY = "saper_bober_bonus_date";

const BETS = [10, 25, 50, 100, 250, 500, 1000];

const Telegram =
  window.Telegram && window.Telegram.WebApp
    ? window.Telegram.WebApp
    : null;

if (Telegram) {
  Telegram.ready();
  Telegram.expand();
}

function getTelegramUser() {
  const user = Telegram?.initDataUnsafe?.user;

  if (user) {
    return {
      id: user.id,
      name:
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        "Игрок",
      username: user.username ? `@${user.username}` : "",
      photo: user.photo_url || "",
    };
  }

  return {
    id: "demo",
    name: "Игрок",
    username: "",
    photo: "",
  };
}

function loadNumber(key, fallback) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) ? value : fallback;
}

function loadHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
}

function todayKey() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

function generateMines(count = 5) {
  const mines = new Set();

  while (mines.size < count) {
    mines.add(Math.floor(Math.random() * 25));
  }

  return mines;
}

function App() {
  const [user] = useState(getTelegramUser);

  const [balance, setBalance] = useState(() =>
    loadNumber(BALANCE_KEY, 1000)
  );

  const [history, setHistory] = useState(loadHistory);

  const [page, setPage] = useState("game");

  const [bet, setBet] = useState(100);

  const [gameState, setGameState] = useState("idle");
  const [mines, setMines] = useState(new Set());
  const [opened, setOpened] = useState(new Set());

  const [currentWin, setCurrentWin] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);

  const [gameId, setGameId] = useState(1);

  const [bonusAvailable, setBonusAvailable] = useState(() => {
    return localStorage.getItem(BONUS_KEY) !== todayKey();
  });

  useEffect(() => {
    localStorage.setItem(BALANCE_KEY, String(balance));
  }, [balance]);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const telegramName = user.name;
  const avatar = user.photo;

  const openedCount = opened.size;

  const multiplier = useMemo(() => {
    if (openedCount <= 0) return 1;

    const values = {
      1: 1.15,
      2: 1.35,
      3: 1.6,
      4: 2.0,
      5: 2.5,
      6: 3.2,
      7: 4.0,
      8: 5.0,
      9: 6.5,
      10: 8.0,
      11: 10.0,
      12: 12.5,
      13: 15.0,
      14: 18.0,
      15: 22.0,
      16: 27.0,
      17: 33.0,
      18: 40.0,
      19: 50.0,
      20: 65.0,
    };

    return values[openedCount] || 1;
  }, [openedCount]);

  function startGame() {
    if (gameState !== "idle") return;

    if (bet > balance) {
      alert("Недостаточно монет для этой ставки.");
      return;
    }

    setBalance((value) => value - bet);
    setMines(generateMines(5));
    setOpened(new Set());
    setCurrentWin(0);
    setCurrentMultiplier(1);
    setGameState("playing");
  }

  function openCell(index) {
    if (gameState !== "playing") return;
    if (opened.has(index)) return;

    if (mines.has(index)) {
      const lostGame = {
        id: gameId,
        date: new Date().toLocaleString("ru-RU"),
        bet,
        opened: opened.size,
        multiplier: Number(multiplier.toFixed(2)),
        win: 0,
        result: "Проигрыш",
      };

      setHistory((items) => [lostGame, ...items]);
      setGameId((id) => id + 1);

      setOpened((old) => {
        const next = new Set(old);
        next.add(index);
        return next;
      });

      setCurrentWin(0);
      setGameState("lost");
      return;
    }

    const nextOpened = new Set(opened);
    nextOpened.add(index);

    setOpened(nextOpened);

    const nextCount = nextOpened.size;

    const values = {
      1: 1.15,
      2: 1.35,
      3: 1.6,
      4: 2.0,
      5: 2.5,
      6: 3.2,
      7: 4.0,
      8: 5.0,
      9: 6.5,
      10: 8.0,
      11: 10.0,
      12: 12.5,
      13: 15.0,
      14: 18.0,
      15: 22.0,
      16: 27.0,
      17: 33.0,
      18: 40.0,
      19: 50.0,
      20: 65.0,
    };

    const nextMultiplier = values[nextCount] || 1;

    const nextWin = Math.floor(bet * nextMultiplier);

    setCurrentMultiplier(nextMultiplier);
    setCurrentWin(nextWin);
  }

  function takeWin() {
    if (gameState !== "playing") return;
    if (currentWin <= 0) return;

    const win = currentWin;

    setBalance((value) => value + win);

    const completedGame = {
      id: gameId,
      date: new Date().toLocaleString("ru-RU"),
      bet,
      opened: opened.size,
      multiplier: Number(currentMultiplier.toFixed(2)),
      win,
      result: "Забрано",
    };

    setHistory((items) => [completedGame, ...items]);
    setGameId((id) => id + 1);

    setGameState("won");
  }

  function newGame() {
    setGameState("idle");
    setMines(new Set());
    setOpened(new Set());
    setCurrentWin(0);
    setCurrentMultiplier(1);
  }

  function takeBonus() {
    if (!bonusAvailable) return;

    const today = todayKey();

    localStorage.setItem(BONUS_KEY, today);

    setBalance((value) => value + 100);
    setBonusAvailable(false);
  }

  function renderCell(index) {
    const isOpen = opened.has(index);
    const isMine = mines.has(index);

    let content = "";

    if (isOpen && isMine) {
      content = "💣";
    } else if (isOpen) {
      content = "💎";
    }

    return (
      <button
        key={index}
        className={`cell ${isOpen ? "open" : ""} ${
          isOpen && isMine ? "mine" : ""
        }`}
        onClick={() => openCell(index)}
        disabled={gameState !== "playing" || isOpen}
      >
        {content}
      </button>
    );
  }

  function GamePage() {
    return (
      <main>
        <section className="card">
          <div className="user">
            <div>
              Игрок: <strong>{telegramName}</strong>
            </div>

            <span>🦫 #{user.id}</span>
          </div>

          <div className="row">
            <div>
              <span>Баланс</span>
              <strong>🪙 {balance}</strong>
            </div>

            <div>
              <span>Ставка</span>

              <div className="bets">
                {BETS.map((value) => (
                  <button
                    key={value}
                    className={bet === value ? "sel" : ""}
                    disabled={gameState !== "idle"}
                    onClick={() => setBet(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="status">
          {gameState === "idle" && (
            <>
              Готов к игре
              <span>Выбери ставку и начинай</span>
            </>
          )}

          {gameState === "playing" && (
            <>
              🪙 Можно забрать: {currentWin}
              <span>
                Коэффициент ×{currentMultiplier.toFixed(2)} · открыто{" "}
                {openedCount}
              </span>
            </>
          )}

          {gameState === "won" && (
            <>
              ✅ Выигрыш забран: {currentWin} 🪙
              <span>Игра завершена</span>
            </>
          )}

          {gameState === "lost" && (
            <>
              💣 Бум!
              <span>Ты открыл мину. Ставка потеряна.</span>
            </>
          )}
        </div>

        <div className="grid">
          {Array.from({ length: 25 }, (_, index) => renderCell(index))}
        </div>

        <div className="stats">
          <div>
            Ставка
            <b>{bet} 🪙</b>
          </div>

          <div>
            Коэффициент
            <b>×{currentMultiplier.toFixed(2)}</b>
          </div>

          <div>
            Выигрыш
            <b>{currentWin} 🪙</b>
          </div>
        </div>

        {gameState === "idle" && (
          <button onClick={startGame}>🦫 НАЧАТЬ ИГРУ</button>
        )}

        {gameState === "playing" && (
          <button className="gold" onClick={takeWin} disabled={currentWin <= 0}>
            💰 ЗАБРАТЬ {currentWin} 🪙
          </button>
        )}

        {(gameState === "won" || gameState === "lost") && (
          <button onClick={newGame}>🔄 НОВАЯ ИГРА</button>
        )}
      </main>
    );
  }

  function BonusPage() {
    return (
      <section className="page">
        <div className="icon">🎁</div>

        <h2>Ежедневный бонус</h2>

        {bonusAvailable ? (
          <>
            <p>Заходи каждый день и получай бесплатные монеты.</p>

            <div className="bonus">
              +100 🪙
              <small>Сегодня доступно</small>
            </div>

            <button className="gold" onClick={takeBonus}>
              🎁 ЗАБРАТЬ БОНУС
            </button>
          </>
        ) : (
          <>
            <p>Сегодня бонус уже получен.</p>

            <div className="bonus">
              ✅
              <small>Приходи завтра</small>
            </div>
          </>
        )}
      </section>
    );
  }

  function RatingPage() {
    const ranking = [
      ["🦫 Бобёр Макс", 12850],
      ["🦫 Бобёр Алекс", 9340],
      ["🦫 Бобёр Иван", 7210],
      [telegramName, balance],
      ["🦫 Бобёр Дима", 4850],
    ].sort((a, b) => b[1] - a[1]);

    return (
      <section className="page">
        <div className="icon">🏆</div>
        <h2>Рейтинг</h2>

        {ranking.map(([name, coins], index) => (
          <div className="rank" key={`${name}-${index}`}>
            <span>
              {index + 1}. {name}
            </span>

            <b>🪙 {coins}</b>
          </div>
        ))}
      </section>
    );
  }

  function ProfilePage() {
    return (
      <section className="page">
        {avatar ? (
          <img className="avatar" src={avatar} alt="avatar" />
        ) : (
          <div className="avatar" style={{ display: "inline-grid", placeItems: "center", fontSize: 35 }}>
            🦫
          </div>
        )}

        <h2>{telegramName}</h2>

        {user.username && <p>{user.username}</p>}

        <div className="profile">
          <div>
            Telegram ID
            <b>{user.id}</b>
          </div>

          <div>
            Баланс
            <b>🪙 {balance}</b>
          </div>

          <div>
            Игр
            <b>{history.length}</b>
          </div>

          <div>
            Побед
            <b>{history.filter((item) => item.result === "Забрано").length}</b>
          </div>
        </div>

        <h3>📜 История игр</h3>

        {history.length === 0 && <p>История пока пустая.</p>}

        {history.slice(0, 10).map((item) => (
          <div className="rank" key={`${item.id}-${item.date}`}>
            <span>
              #{item.id} · {item.result}
              <br />
              <small>{item.date}</small>
            </span>

            <b>
              {item.result === "Забрано"
                ? `+${item.win} 🪙`
                : `-${item.bet} 🪙`}
            </b>
          </div>
        ))}
      </section>
    );
  }

  return (
    <div className="app">
      <header>
        <div className="brand">
          <div className="bob">🦫</div>

          <div>
            <small>SAPER BOBER</small>
            <h1>Сапёр Бобёр</h1>
            <p>Версия 0.3.1</p>
          </div>
        </div>

        <div className="mini">
          {avatar ? (
            <img src={avatar} alt="" />
          ) : (
            "🦫"
          )}
        </div>
      </header>

      {page === "game" && <GamePage />}
      {page === "bonus" && <BonusPage />}
      {page === "rating" && <RatingPage />}
      {page === "profile" && <ProfilePage />}

      <nav>
        <button
          className={page === "game" ? "active" : ""}
          onClick={() => setPage("game")}
        >
          <span>🎮</span>
          <small>Игра</small>
        </button>

        <button
          className={page === "bonus" ? "active" : ""}
          onClick={() => setPage("bonus")}
        >
          <span>🎁</span>
          <small>Бонус</small>
        </button>

        <button
          className={page === "rating" ? "active" : ""}
          onClick={() => setPage("rating")}
        >
          <span>🏆</span>
          <small>Рейтинг</small>
        </button>

        <button
          className={page === "profile" ? "active" : ""}
          onClick={() => setPage("profile")}
        >
          <span>👤</span>
          <small>Профиль</small>
        </button>
      </nav>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
