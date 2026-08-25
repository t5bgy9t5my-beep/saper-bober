import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const tg = window.Telegram?.WebApp;

const BETS = [10, 25, 50, 100, 250, 500, 1000];
const CELLS = 25;
const MINES = 5;

function getTelegramUser() {
  const user = tg?.initDataUnsafe?.user;

  if (user) {
    return {
      id: user.id,
      name:
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        user.username ||
        "Игрок",
      username: user.username ? `@${user.username}` : "",
      photo: user.photo_url || "",
    };
  }

  return {
    id: "demo",
    name: "Игрок",
    username: "@demo",
    photo: "",
  };
}

function App() {
  const user = useMemo(getTelegramUser, []);

  const [page, setPage] = useState("game");
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem("saper_balance");
    return saved ? Number(saved) : 1000;
  });

  const [bet, setBet] = useState(10);
  const [board, setBoard] = useState([]);
  const [opened, setOpened] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [status, setStatus] = useState("Выбери ставку и начни игру");
  const [multiplier, setMultiplier] = useState(1);
  const [bonusTaken, setBonusTaken] = useState(() => {
    const date = localStorage.getItem("saper_bonus_date");
    return date === new Date().toDateString();
  });

  useEffect(() => {
    localStorage.setItem("saper_balance", String(balance));
  }, [balance]);

  useEffect(() => {
    tg?.ready?.();
    tg?.expand?.();
  }, []);

  function createBoard() {
    const mines = new Set();

    while (mines.size < MINES) {
      mines.add(Math.floor(Math.random() * CELLS));
    }

    return Array.from({ length: CELLS }, (_, i) => mines.has(i));
  }

  function startGame() {
    if (balance < bet) {
      setStatus("Недостаточно монет");
      return;
    }

    setBalance((b) => b - bet);

    setBoard(createBoard());
    setOpened([]);
    setMultiplier(1);
    setGameOver(false);
    setGameStarted(true);
    setStatus("Открывай клетки и не попади на мину 💣");
  }

  function openCell(index) {
    if (!gameStarted || gameOver || opened.includes(index)) return;

    if (board[index]) {
      setOpened((o) => [...o, index]);
      setGameOver(true);
      setGameStarted(false);
      setMultiplier(1);
      setStatus("💥 Бобёр попал на мину! Ставка проиграна");
      return;
    }

    const newOpened = [...opened, index];
    const newMultiplier = 1 + newOpened.length * 0.2;

    setOpened(newOpened);
    setMultiplier(Number(newMultiplier.toFixed(2)));

    const safeCells = CELLS - MINES;

    if (newOpened.length >= safeCells) {
      const win = Math.floor(bet * newMultiplier);
      setBalance((b) => b + win);
      setGameOver(true);
      setGameStarted(false);
      setStatus(`🏆 Поле очищено! +${win} 🪙`);
    } else {
      setStatus(`Безопасно! Множитель ×${newMultiplier.toFixed(2)}`);
    }
  }

  function cashOut() {
    if (!gameStarted || opened.length === 0) return;

    const win = Math.floor(bet * multiplier);

    setBalance((b) => b + win);
    setGameOver(true);
    setGameStarted(false);
    setStatus(`💰 Забрал выигрыш: +${win} 🪙`);
  }

  function takeBonus() {
    if (bonusTaken) return;

    setBalance((b) => b + 100);
    setBonusTaken(true);
    localStorage.setItem("saper_bonus_date", new Date().toDateString());
  }

  function GamePage() {
    return (
      <main>
        <div className="user">
          <span>
            {user.name} {user.username}
          </span>
          <strong>{balance} 🪙</strong>
        </div>

        <div className="card">
          <div className="row">
            <div>
              <small>СТАВКА</small>
              <strong>{bet} 🪙</strong>
            </div>

            <div className="bets">
              {BETS.map((value) => (
                <button
                  key={value}
                  className={bet === value ? "sel" : ""}
                  onClick={() => !gameStarted && setBet(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="status">
            {status}
            <span>
              Мины: {MINES} · Множитель: ×{multiplier.toFixed(2)}
            </span>
          </div>

          <div className="grid">
            {board.map((isMine, index) => {
              const isOpen = opened.includes(index);

              return (
                <button
                  key={index}
                  className={`cell ${isOpen ? "open" : ""} ${
                    isOpen && isMine ? "mine" : ""
                  }`}
                  onClick={() => openCell(index)}
                >
                  {isOpen ? (isMine ? "💣" : "🪙") : "?"}
                </button>
              );
            })}

            {!gameStarted &&
              board.length === 0 &&
              Array.from({ length: CELLS }).map((_, index) => (
                <button
                  key={index}
                  className="cell"
                  onClick={() => {}}
                >
                  ?
                </button>
              ))}
          </div>

          <div className="stats">
            <div>
              Ставка
              <b>{bet} 🪙</b>
            </div>
            <div>
              Множитель
              <b>×{multiplier.toFixed(2)}</b>
            </div>
            <div>
              Баланс
              <b>{balance} 🪙</b>
            </div>
          </div>
        </div>

        {!gameStarted ? (
          <button onClick={startGame}>🎮 Начать игру</button>
        ) : (
          <button className="gold" onClick={cashOut}>
            💰 Забрать выигрыш
          </button>
        )}
      </main>
    );
  }

  function BonusPage() {
    return (
      <div className="page">
        <div className="icon">🎁</div>
        <h2>Ежедневный бонус</h2>

        <div className="bonus">
          +100 🪙
          <small>Каждый день</small>
        </div>

        <p>
          Заходи каждый день и получай бесплатные монеты для игры.
        </p>

        <button disabled={bonusTaken} onClick={takeBonus}>
          {bonusTaken ? "Бонус уже получен" : "Получить +100 🪙"}
        </button>
      </div>
    );
  }

  function RatingPage() {
    const players = [
      ["🦫 Бобёр", 12450],
      ["🐹 Рыжик", 9850],
      ["🐻 Медведь", 7420],
      [user.name, balance],
    ].sort((a, b) => b[1] - a[1]);

    return (
      <div className="page">
        <div className="icon">🏆</div>
        <h2>Рейтинг</h2>

        {players.map(([name, coins], index) => (
          <div className="rank" key={`${name}-${index}`}>
            <span>
              {index + 1}. {name}
            </span>
            <b>{coins} 🪙</b>
          </div>
        ))}
      </div>
    );
  }

  function ProfilePage() {
    return (
      <div className="page">
        {user.photo ? (
          <img className="avatar" src={user.photo} alt="" />
        ) : (
          <div className="avatar" />
        )}

        <h2>{user.name}</h2>
        <p>{user.username}</p>

        <div className="profile">
          <div>
            Баланс
            <b>{balance} 🪙</b>
          </div>

          <div>
            Telegram ID
            <b>{user.id}</b>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <div className="brand">
          <div className="bob">🦫</div>

          <div>
            <small>TELEGRAM MINI APP</small>
            <h1>Сапёр Бобёр</h1>
            <p>Не попади на мину</p>
          </div>
        </div>

        <div className="mini">
          {user.photo ? (
            <img src={user.photo} alt="" />
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
