import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const SIZE = 5;
const MINES = 5;
const START_BALANCE = 1000;
const BETS = [10, 25, 50, 100, 250, 500, 1000];
const MULTIPLIERS = [1, 1.2, 1.45, 1.7, 2.1, 2.7, 3.5, 4.5, 6];

function createBoard() {
  const board = Array(SIZE * SIZE).fill(false);
  let placed = 0;
  while (placed < MINES) {
    const index = Math.floor(Math.random() * board.length);
    if (!board[index]) {
      board[index] = true;
      placed++;
    }
  }
  return board;
}

function App() {
  const [balance, setBalance] = useState(START_BALANCE);
  const [bet, setBet] = useState(10);
  const [board, setBoard] = useState(() => createBoard());
  const [opened, setOpened] = useState([]);
  const [status, setStatus] = useState("ready");
  const [screen, setScreen] = useState("game");

  const safeCount = opened.filter((i) => !board[i]).length;
  const multiplier = useMemo(
    () => MULTIPLIERS[Math.min(safeCount, MULTIPLIERS.length - 1)],
    [safeCount]
  );
  const potentialWin = Math.floor(bet * multiplier);

  function startGame() {
    if (balance < bet) return;
    setBalance((v) => v - bet);
    setBoard(createBoard());
    setOpened([]);
    setStatus("playing");
  }

  function openCell(index) {
    if (status !== "playing" || opened.includes(index)) return;

    setOpened((prev) => [...prev, index]);

    if (board[index]) {
      setStatus("lost");
      return;
    }

    if (safeCount + 1 >= SIZE * SIZE - MINES) {
      setStatus("won");
    }
  }

  function cashOut() {
    if (status !== "playing" || safeCount === 0) return;
    setBalance((v) => v + potentialWin);
    setStatus("cashed");
  }

  function selectBet(value) {
    if (status === "playing") return;
    setBet(value);
  }

  return (
    <div className="app">
      <header className="top">
        <div className="logo">
          <div className="bober">🦫</div>
          <div>
            <div className="eyebrow">МИНИ-ИГРА</div>
            <h1>Сапёр Бобёр</h1>
            <p>Не попади на мину</p>
          </div>
        </div>

        <div className="balance">
          <span>Баланс</span>
          <b>🪙 {balance.toLocaleString("ru-RU")}</b>
        </div>
      </header>

      {screen === "game" && (
        <main>
          <section className="card">
            <div className="card-title">
              <div>
                <span className="muted">СТАВКА</span>
                <strong>🪙 {bet}</strong>
              </div>
              <div className="bet-select">
                {BETS.map((value) => (
                  <button
                    key={value}
                    className={value === bet ? "selected" : ""}
                    onClick={() => selectBet(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className={`status ${status}`}>
              {status === "ready" && <>🦫 <b>Готов?</b><span>Нажми «Начать игру»</span></>}
              {status === "playing" && <>🦫 <b>Осторожно!</b><span>Открывай клетки</span></>}
              {status === "lost" && <>💣 <b>БАБАХ!</b><span>Ты попал на мину</span></>}
              {status === "won" && <>🏆 <b>ПОЛЕ ОЧИЩЕНО!</b><span>Все безопасные клетки открыты</span></>}
              {status === "cashed" && <>💰 <b>ВЫИГРЫШ!</b><span>Монеты зачислены на баланс</span></>}
            </div>

            <div className="board">
              {board.map((mine, index) => {
                const isOpen = opened.includes(index);
                return (
                  <button
                    key={index}
                    className={`cell ${isOpen ? "open" : ""} ${isOpen && mine ? "mine" : ""}`}
                    onClick={() => openCell(index)}
                    disabled={isOpen || status !== "playing"}
                    aria-label={`Клетка ${index + 1}`}
                  >
                    {isOpen ? (mine ? "💣" : "🪙") : ""}
                  </button>
                );
              })}
            </div>

            <div className="stats">
              <div>
                <span>Безопасно</span>
                <b>{safeCount}</b>
              </div>
              <div>
                <span>Множитель</span>
                <b>×{multiplier.toFixed(2)}</b>
              </div>
              <div>
                <span>Выигрыш</span>
                <b>🪙 {potentialWin}</b>
              </div>
            </div>

            <button
              className="primary gold"
              disabled={status !== "playing" || safeCount === 0}
              onClick={cashOut}
            >
              💰 ЗАБРАТЬ {potentialWin} 🪙
            </button>

            <button
              className="primary"
              disabled={status === "playing" || balance < bet}
              onClick={startGame}
            >
              🎮 {status === "ready" ? "НАЧАТЬ ИГРУ" : "ИГРАТЬ ЕЩЁ"}
            </button>

            <div className="rules">
              <span>💣 Мин: {MINES}</span>
              <span>⬜ Поле: 5×5</span>
              <span>🪙 Виртуальные монеты</span>
            </div>
          </section>
        </main>
      )}

      {screen !== "game" && (
        <section className="placeholder card">
          <div className="placeholder-icon">
            {screen === "bonus" ? "🎁" : screen === "rating" ? "🏆" : "👤"}
          </div>
          <h2>
            {screen === "bonus" ? "Бонус" : screen === "rating" ? "Рейтинг" : "Профиль"}
          </h2>
          <p>Этот раздел добавим в следующей версии.</p>
        </section>
      )}

      <nav className="nav">
        {[
          ["game", "🎮", "Игра"],
          ["bonus", "🎁", "Бонус"],
          ["rating", "🏆", "Рейтинг"],
          ["profile", "👤", "Профиль"],
        ].map(([id, icon, label]) => (
          <button
            key={id}
            className={screen === id ? "active" : ""}
            onClick={() => setScreen(id)}
          >
            <span>{icon}</span>
            <small>{label}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
