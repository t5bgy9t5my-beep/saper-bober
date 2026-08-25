```jsx
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const MODES = {
  easy: {
    id: "easy",
    name: "Легко",
    icon: "🟢",
    mines: 3,
  },
  medium: {
    id: "medium",
    name: "Средне",
    icon: "🟡",
    mines: 5,
  },
  hard: {
    id: "hard",
    name: "Сложно",
    icon: "🔴",
    mines: 8,
  },
};

const START_BALANCE = 1000;
const DAILY_BONUS = 100;
const GRID_SIZE = 25;

function getTelegramUser() {
  const tg = window.Telegram?.WebApp;

  if (tg) {
    tg.ready();
    tg.expand();

    const user = tg.initDataUnsafe?.user;

    if (user) {
      return {
        id: String(user.id),
        name:
          user.first_name ||
          user.username ||
          "Игрок",
        username: user.username || "",
        photo: user.photo_url || "",
      };
    }
  }

  return {
    id: "demo-user",
    name: "Игрок",
    username: "demo",
    photo: "",
  };
}

function getLocalBonusStatus() {
  return (
    localStorage.getItem("bober_bonus_day") !==
    getTodayKey()
  );
}

function getTodayKey() {
  const d = new Date();

  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function loadHistory() {
  try {
    const data = JSON.parse(
      localStorage.getItem("bober_history") || "[]"
    );

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function api(action, data = {}) {
  const response = await fetch("/api/game", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action,
      ...data,
    }),
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("Сервер вернул некорректный ответ");
  }

  if (!response.ok || result.ok === false) {
    throw new Error(
      result.error || "Ошибка сервера"
    );
  }

  return result;
}

function App() {
  const [user] = useState(getTelegramUser);

  const [balance, setBalance] = useState(START_BALANCE);

  const [history, setHistory] = useState(
    loadHistory
  );

  const [mode, setMode] = useState("medium");

  const [page, setPage] = useState("game");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [bonusAvailable, setBonusAvailable] =
    useState(getLocalBonusStatus);

  const [game, setGame] = useState({
    active: false,
    finished: false,
    lost: false,
    gameId: null,
    opened: [],
    mines: [],
    multiplier: 1,
    winAmount: 0,
    claimed: false,
    bet: 10,
  });

  const currentMode = MODES[mode];

  const bets = [10, 25, 50, 100, 250, 500];

  useEffect(() => {
    loadServerBalance();
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "bober_history",
      JSON.stringify(history)
    );
  }, [history]);

  async function loadServerBalance() {
    try {
      setLoading(true);
      setError("");

      const result = await api("balance", {
        userId: user.id,
      });

      setBalance(Number(result.balance) || 0);
    } catch (err) {
      console.error(err);
      setError(
        "Не удалось получить баланс с сервера"
      );
    } finally {
      setLoading(false);
    }
  }

  function updateBalanceFromServer(result) {
    if (
      result &&
      typeof result.balance === "number"
    ) {
      setBalance(result.balance);
    }
  }

  function addHistory(item) {
    setHistory((h) =>
      [item, ...h].slice(0, 20)
    );
  }

  async function startGame() {
    if (game.active) return;

    if (balance < game.bet) {
      setError("Недостаточно средств");
      return;
    }

    try {
      setError("");
      setLoading(true);

      const result = await api("start", {
        userId: user.id,
        bet: game.bet,
      });

      updateBalanceFromServer(result);

      setGame({
        active: true,
        finished: false,
        lost: false,
        gameId: result.gameId,
        opened: [],
        mines: [],
        multiplier: 1,
        winAmount: 0,
        claimed: false,
        bet: result.bet,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Не удалось начать игру");
    } finally {
      setLoading(false);
    }
  }

  async function openCell(index) {
    if (!game.active) return;

    if (game.opened.includes(index)) return;

    if (!game.gameId) return;

    try {
      setError("");
      setLoading(true);

      const result = await api("open", {
        userId: user.id,
        gameId: game.gameId,
        cell: index,
      });

      updateBalanceFromServer(result);

      if (result.result === "mine") {
        setGame((g) => ({
          ...g,
          active: false,
          finished: true,
          lost: true,
          opened: result.opened || [
            ...g.opened,
            index,
          ],
          multiplier: 0,
          winAmount: 0,
        }));

        addHistory({
          id: Date.now(),
          mode: currentMode.name,
          bet: game.bet,
          win: 0,
          result: "lose",
          date: new Date().toLocaleTimeString(),
        });

        return;
      }

      if (result.result === "safe") {
        setGame((g) => ({
          ...g,
          opened:
            result.opened || [
              ...g.opened,
              index,
            ],
          multiplier: Number(
            result.multiplier || 1
          ),
          winAmount: Number(
            result.win || 0
          ),
        }));
      }
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Ошибка при открытии клетки"
      );
    } finally {
      setLoading(false);
    }
  }

  async function claimWin() {
    if (!game.active) return;

    if (!game.gameId) return;

    if (game.winAmount <= 0) return;

    try {
      setError("");
      setLoading(true);

      const result = await api("cashout", {
        userId: user.id,
        gameId: game.gameId,
      });

      updateBalanceFromServer(result);

      const amount = Number(result.win || 0);

      addHistory({
        id: Date.now(),
        mode: currentMode.name,
        bet: game.bet,
        win: amount,
        result: "win",
        date: new Date().toLocaleTimeString(),
      });

      setGame((g) => ({
        ...g,
        active: false,
        finished: true,
        claimed: true,
        winAmount: amount,
        multiplier: Number(
          result.multiplier || g.multiplier
        ),
      }));
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Не удалось забрать выигрыш"
      );
    } finally {
      setLoading(false);
    }
  }

  function newGame() {
    setError("");

    setGame({
      active: false,
      finished: false,
      lost: false,
      gameId: null,
      opened: [],
      mines: [],
      multiplier: 1,
      winAmount: 0,
      claimed: false,
      bet: game.bet,
    });
  }

  function setBet(value) {
    if (game.active) return;

    setGame((g) => ({
      ...g,
      bet: value,
    }));
  }

  function selectMode(id) {
    if (game.active) return;

    setMode(id);
  }

  function takeBonus() {
    if (!bonusAvailable) return;

    /*
      Пока бонус остаётся локальным.
      После подключения базы перенесём его
      на сервер, чтобы нельзя было получить
      бонус повторно через другой браузер.
    */

    setBalance((v) => v + DAILY_BONUS);

    localStorage.setItem(
      "bober_bonus_day",
      getTodayKey()
    );

    setBonusAvailable(false);
  }

  function GamePage() {
    return (
      <div className="page">
        <div className="card">
          <div className="user">
            <div>
              <span>Игрок</span>
              <strong>{user.name}</strong>
            </div>

            <div>
              <span>Баланс</span>

              <strong>
                {balance.toLocaleString("ru-RU")} ₽
              </strong>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, 1fr)",
              gap: 5,
              marginBottom: 10,
            }}
          >
            {Object.values(MODES).map(
              (item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    selectMode(item.id)
                  }
                  disabled={
                    game.active || loading
                  }
                  style={{
                    border: "0",
                    borderRadius: 10,
                    padding: "8px 4px",
                    background:
                      mode === item.id
                        ? "#a8d85b"
                        : "#11180f",
                    color:
                      mode === item.id
                        ? "#15200e"
                        : "#9aa793",
                    fontWeight: 800,
                    fontSize: 10,
                  }}
                >
                  {item.icon} {item.name}
                  <br />
                  <small>
                    {item.mines} мин
                  </small>
                </button>
              )
            )}
          </div>

          <div className="row">
            <div>
              <span
                style={{
                  color: "#74806e",
                }}
              >
                Ставка
              </span>

              <strong>
                {game.bet} ₽
              </strong>
            </div>

            <div className="bets">
              {bets.map((bet) => (
                <button
                  key={bet}
                  className={
                    game.bet === bet
                      ? "sel"
                      : ""
                  }
                  onClick={() =>
                    setBet(bet)
                  }
                  disabled={
                    game.active || loading
                  }
                >
                  {bet}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 12,
              background: "#51251e",
              color: "#ffb5a8",
              fontSize: 11,
              textAlign: "center",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div className="status">
          {game.lost ? (
            <>
              💥 БУМ!
              <span>
                Ты попал на мину. Ставка
                потеряна.
              </span>
            </>
          ) : game.claimed ? (
            <>
              💰 ВЫИГРЫШ ЗАБРАН
              <span>
                +
                {game.winAmount.toLocaleString(
                  "ru-RU"
                )} ₽
              </span>
            </>
          ) : game.finished ? (
            <>
              🎮 ИГРА ЗАКОНЧЕНА
              <span>
                Нажми «Новая игра»
              </span>
            </>
          ) : game.active ? (
            <>
              💰 МОЖНО ЗАБРАТЬ:{" "}
              {game.winAmount.toLocaleString(
                "ru-RU"
              )} ₽
              <span>
                Коэффициент ×
                {game.multiplier.toFixed(2)}
              </span>
            </>
          ) : (
            <>
              🦫 САПЁР БОБЁР
              <span>
                Выбери клетку и попробуй
                увеличить выигрыш
              </span>
            </>
          )}
        </div>

        <div className="grid">
          {Array.from({
            length: GRID_SIZE,
          }).map((_, index) => {
            const opened =
              game.opened.includes(index);

            const mine =
              game.mines.includes(index);

            return (
              <button
                key={index}
                className={`cell ${
                  opened ? "open" : ""
                } ${
                  mine && game.lost
                    ? "mine"
                    : ""
                }`}
                onClick={() =>
                  openCell(index)
                }
                disabled={
                  !game.active ||
                  opened ||
                  loading
                }
              >
                {mine && game.lost
                  ? "💣"
                  : opened
                  ? "💎"
                  : "?"}
              </button>
            );
          })}
        </div>

        <div className="stats">
          <div>
            Открыто
            <b>
              {game.opened.length}
            </b>
          </div>

          <div>
            Мин
            <b>{currentMode.mines}</b>
          </div>

          <div>
            Коэф.
            <b>
              ×
              {game.active
                ? game.multiplier.toFixed(
                    2
                  )
                : "—"}
            </b>
          </div>
        </div>

        {!game.active &&
          !game.finished && (
            <button
              onClick={startGame}
              disabled={
                loading ||
                balance < game.bet
              }
            >
              {balance < game.bet
                ? "Недостаточно средств"
                : loading
                ? "⏳ Подождите..."
                : `🎮 Начать за ${game.bet} ₽`}
            </button>
          )}

        {game.active &&
          game.winAmount > 0 && (
            <button
              className="gold"
              onClick={claimWin}
              disabled={loading}
            >
              {loading
                ? "⏳ Обработка..."
                : `💰 ЗАБРАТЬ ${game.winAmount.toLocaleString(
                    "ru-RU"
                  )} ₽`}
            </button>
          )}

        {game.finished && (
          <button
            onClick={newGame}
            disabled={loading}
          >
            🔄 Новая игра
          </button>
        )}
      </div>
    );
  }

  function BonusPage() {
    return (
      <div className="page">
        <div className="icon">🎁</div>

        <h2>Ежедневный бонус</h2>

        <p>
          Заходи каждый день и получай
          бесплатные виртуальные монеты.
        </p>

        <div className="bonus">
          +{DAILY_BONUS} ₽

          <small>
            {bonusAvailable
              ? "Бонус доступен сегодня"
              : "Бонус уже получен сегодня"}
          </small>
        </div>

        <button
          onClick={takeBonus}
          disabled={!bonusAvailable}
        >
          {bonusAvailable
            ? "🎁 Забрать бонус"
            : "Бонус получен"}
        </button>
      </div>
    );
  }

  function RatingPage() {
    const totalWins =
      history.reduce(
        (sum, item) =>
          sum + (item.win || 0),
        0
      );

    return (
      <div className="page">
        <div className="icon">🏆</div>

        <h2>Рейтинг</h2>

        <p>
          Твоя статистика пока хранится
          на этом устройстве.
        </p>

        <div className="rank">
          <span>🥇 {user.name}</span>

          <b>
            {totalWins.toLocaleString(
              "ru-RU"
            )}{" "}
            ₽
          </b>
        </div>

        <div className="rank">
          <span>🎮 Игр сыграно</span>
          <b>{history.length}</b>
        </div>

        <div className="rank">
          <span>💰 Баланс</span>

          <b>
            {balance.toLocaleString(
              "ru-RU"
            )}{" "}
            ₽
          </b>
        </div>
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
          <div className="avatar" />
        )}

        <h2>{user.name}</h2>

        {user.username && (
          <p>@{user.username}</p>
        )}

        <div className="profile">
          <div>
            Telegram ID
            <b>{user.id}</b>
          </div>

          <div>
            Баланс
            <b>
              {balance.toLocaleString(
                "ru-RU"
              )}{" "}
              ₽
            </b>
          </div>

          <div>
            Игр
            <b>{history.length}</b>
          </div>

          <div>
            Побед
            <b>
              {
                history.filter(
                  (x) =>
                    x.result === "win"
                ).length
              }
            </b>
          </div>
        </div>

        {history.length > 0 && (
          <>
            <h3>
              Последние игры
            </h3>

            {history
              .slice(0, 5)
              .map((item) => (
                <div
                  key={item.id}
                  className="rank"
                  style={{
                    marginBottom: 5,
                  }}
                >
                  <span>
                    {item.result ===
                    "win"
                      ? "💰 Победа"
                      : "💥 Мина"}
                    {" · "}
                    {item.mode}
                  </span>

                  <b>
                    {item.result ===
                    "win"
                      ? `+${item.win} ₽`
                      : `-${item.bet} ₽`}
                  </b>
                </div>
              ))}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <div className="brand">
          <div className="bob">
            🦫
          </div>

          <div>
            <small>
              TELEGRAM MINI APP
            </small>

            <h1>
              Сапёр Бобёр
            </h1>

            <p>
              Рискни. Открой. Забери.
            </p>
          </div>
        </div>

        <div className="mini">
          💰{" "}
          {balance.toLocaleString(
            "ru-RU"
          )}{" "}
          ₽
        </div>
      </header>

      <main>
        {page === "game" && (
          <GamePage />
        )}

        {page === "bonus" && (
          <BonusPage />
        )}

        {page === "rating" && (
          <RatingPage />
        )}

        {page === "profile" && (
          <ProfilePage />
        )}
      </main>

      <nav>
        <button
          className={
            page === "game"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("game")
          }
        >
          <span>🎮</span>
          <small>Игра</small>
        </button>

        <button
          className={
            page === "bonus"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("bonus")
          }
        >
          <span>🎁</span>
          <small>Бонус</small>
        </button>

        <button
          className={
            page === "rating"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("rating")
          }
        >
          <span>🏆</span>
          <small>Рейтинг</small>
        </button>

        <button
          className={
            page === "profile"
              ? "active"
              : ""
          }
          onClick={() =>
            setPage("profile")
          }
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
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```
