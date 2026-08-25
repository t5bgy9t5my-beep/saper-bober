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

function createBoard() {
  const mines = new Set();

  while (mines.size < MINES) {
    mines.add(Math.floor(Math.random() * CELLS));
  }

  return Array.from({ length: CELLS }, (_, i) => mines.has(i));
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

  const [gameResult, setGameResult] = useState(null);

  const [status, setStatus] = useState(
    "Выбери ставку и начни игру"
  );

  const [multiplier, setMultiplier] = useState(1);

  const [bonusTaken, setBonusTaken] = useState(() => {
    const date = localStorage.getItem("saper_bonus_date");
    return date === new Date().toDateString();
  });

  /*
   * Потенциальный выигрыш.
   *
   * Пока игра идёт:
   * ставка × текущий коэффициент.
   *
   * Например:
   * 100 × 1.40 = 140 монет.
   */
  const potentialWin = Math.floor(bet * multiplier);

  const potentialProfit = Math.max(0, potentialWin - bet);

  useEffect(() => {
    localStorage.setItem("saper_balance", String(balance));
  }, [balance]);

  useEffect(() => {
    tg?.ready?.();
    tg?.expand?.();
  }, []);

  function startGame() {
    if (balance < bet) {
      setStatus("Недостаточно монет");
      return;
    }

    const newBoard = createBoard();

    setBalance((b) => b - bet);

    setBoard(newBoard);
    setOpened([]);
    setMultiplier(1);
    setGameOver(false);
    setGameStarted(true);
    setGameResult(null);

    setStatus("Открывай клетки и не попади на мину 💣");
  }

  function openCell(index) {
    if (!gameStarted || gameOver || opened.includes(index)) {
      return;
    }

    /*
     * МИНА
     */
    if (board[index]) {
      setOpened((o) => [...o, index]);

      setGameOver(true);
      setGameStarted(false);

      setGameResult({
        type: "lose",
        amount: bet,
      });

      setStatus("💥 МИНА!");
      return;
    }

    /*
     * БЕЗОПАСНАЯ КЛЕТКА
     */
    const newOpened = [...opened, index];

    /*
     * Коэффициент растёт
     */
    const newMultiplier = Number(
      (1 + newOpened.length * 0.2).toFixed(2)
    );

    const newPotentialWin = Math.floor(
      bet * newMultiplier
    );

    setOpened(newOpened);
    setMultiplier(newMultiplier);

    /*
     * Все безопасные клетки открыты
     */
    const safeCells = CELLS - MINES;

    if (newOpened.length >= safeCells) {
      setBalance((b) => b + newPotentialWin);

      setGameOver(true);
      setGameStarted(false);

      setGameResult({
        type: "win",
        amount: newPotentialWin,
      });

      setStatus("🎉 ПОЛЕ ОЧИЩЕНО!");
      return;
    }

    /*
     * Обычная безопасная клетка
     */
    setStatus(
      `🟢 Безопасно! Теперь можно забрать ${newPotentialWin} 🪙`
    );
  }

  function cashOut() {
    if (!gameStarted || opened.length === 0) {
      return;
    }

    const win = Math.floor(bet * multiplier);

    setBalance((b) => b + win);

    setGameOver(true);
    setGameStarted(false);

    setGameResult({
      type: "cashout",
      amount: win,
    });

    setStatus(`💰 Вы забрали ${win} 🪙`);
  }

  function takeBonus() {
    if (bonusTaken) {
      return;
    }

    setBalance((b) => b + 100);

    setBonusTaken(true);

    localStorage.setItem(
      "saper_bonus_date",
      new Date().toDateString()
    );
  }

  function resetBoardForNewGame() {
    setBoard([]);
    setOpened([]);
    setMultiplier(1);
    setGameOver(false);
    setGameStarted(false);
    setGameResult(null);
    setStatus("Выбери ставку и начни игру");
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

          {/* Ставка */}
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
                  disabled={gameStarted}
                  onClick={() => setBet(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {/* Главный статус */}
          <div className="status">
            {status}

            <span>
              Мины: {MINES} · Множитель: ×
              {multiplier.toFixed(2)}
            </span>
          </div>

          {/* ПОТЕНЦИАЛЬНЫЙ ВЫИГРЫШ */}
          {gameStarted && opened.length > 0 && (
            <div
              style={{
                marginBottom: "10px",
                padding: "14px",
                borderRadius: "15px",
                background: "#10170d",
                border: "1px solid #34432b",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "9px",
                  color: "#87947d",
                  fontWeight: "800",
                  marginBottom: "3px",
                }}
              >
                ПОТЕНЦИАЛЬНЫЙ ВЫИГРЫШ
              </div>

              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "900",
                  color: "#c9ed79",
                  lineHeight: "1.1",
                }}
              >
                {potentialWin} 🪙
              </div>

              <div
                style={{
                  fontSize: "11px",
                  color: "#a7b19f",
                  marginTop: "5px",
                }}
              >
                ×{multiplier.toFixed(2)} · +{potentialProfit} 🪙
                к ставке
              </div>
            </div>
          )}

          {/* Результат */}
          {gameResult && (
            <div
              style={{
                marginBottom: "10px",
                padding: "15px",
                borderRadius: "15px",
                textAlign: "center",
                background:
                  gameResult.type === "lose"
                    ? "#351d18"
                    : "#172511",
                border:
                  gameResult.type === "lose"
                    ? "1px solid #63352a"
                    : "1px solid #3c5a2e",
              }}
            >
              {gameResult.type === "lose" ? (
                <>
                  <div style={{ fontSize: "30px" }}>
                    💥
                  </div>

                  <strong
                    style={{
                      display: "block",
                      fontSize: "18px",
                    }}
                  >
                    МИНА!
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: "5px",
                      color: "#d08d7c",
                      fontSize: "11px",
                    }}
                  >
                    −{gameResult.amount} 🪙
                  </span>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "30px" }}>
                    🎉
                  </div>

                  <strong
                    style={{
                      display: "block",
                      fontSize: "18px",
                    }}
                  >
                    ВЫИГРЫШ
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: "5px",
                      color: "#b9df76",
                      fontSize: "13px",
                      fontWeight: "800",
                    }}
                  >
                    +{gameResult.amount} 🪙
                  </span>
                </>
              )}
            </div>
          )}

          {/* Игровое поле */}
          <div className="grid">
            {board.length > 0
              ? board.map((isMine, index) => {
                  const isOpen = opened.includes(index);

                  return (
                    <button
                      key={index}
                      className={`cell ${
                        isOpen ? "open" : ""
                      } ${
                        isOpen && isMine ? "mine" : ""
                      }`}
                      onClick={() => openCell(index)}
                    >
                      {isOpen
                        ? isMine
                          ? "💣"
                          : "🪙"
                        : "?"}
                    </button>
                  );
                })
              : Array.from({ length: CELLS }).map(
                  (_, index) => (
                    <button
                      key={index}
                      className="cell"
                      disabled
                    >
                      ?
                    </button>
                  )
                )}
          </div>

          {/* Статистика */}
          <div className="stats">
            <div>
              Ставка
              <b>{bet} 🪙</b>
            </div>

            <div>
              Коэффициент
              <b>×{multiplier.toFixed(2)}</b>
            </div>

            <div>
              Забрать
              <b>
                {gameStarted && opened.length > 0
                  ? `${potentialWin} 🪙`
                  : "—"}
              </b>
            </div>
          </div>
        </div>

        {/* Кнопки */}
        {!gameStarted && !gameResult && (
          <button onClick={startGame}>
            🎮 Начать игру
          </button>
        )}

        {gameStarted && opened.length === 0 && (
          <button onClick={() => startGame()}>
            🎮 Начать игру
          </button>
        )}

        {gameStarted && opened.length > 0 && (
          <button className="gold" onClick={cashOut}>
            💰 Забрать {potentialWin} 🪙
          </button>
        )}

        {gameResult && (
          <button onClick={resetBoardForNewGame}>
            🔄 Играть снова
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
          Заходи каждый день и получай бесплатные
          монеты для игры.
        </p>

        <button
          disabled={bonusTaken}
          onClick={takeBonus}
        >
          {bonusTaken
            ? "Бонус уже получен"
            : "Получить +100 🪙"}
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
          <div
            className="rank"
            key={`${name}-${index}`}
          >
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
          <img
            className="avatar"
            src={user.photo}
            alt=""
          />
        ) : (
          <div className="avatar">🦫</div>
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
            <img
              src={user.photo}
              alt=""
            />
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
          className={
            page === "game" ? "active" : ""
          }
          onClick={() => setPage("game")}
        >
          <span>🎮</span>
          <small>Игра</small>
        </button>

        <button
          className={
            page === "bonus" ? "active" : ""
          }
          onClick={() => setPage("bonus")}
        >
          <span>🎁</span>
          <small>Бонус</small>
        </button>

        <button
          className={
            page === "rating" ? "active" : ""
          }
          onClick={() => setPage("rating")}
        >
          <span>🏆</span>
          <small>Рейтинг</small>
        </button>

        <button
          className={
            page === "profile" ? "active" : ""
          }
          onClick={() => setPage("profile")}
        >
          <span>👤</span>
          <small>Профиль</small>
        </button>
      </nav>
    </div>
  );
}

createRoot(
  document.getElementById("root")
).render(<App />);
