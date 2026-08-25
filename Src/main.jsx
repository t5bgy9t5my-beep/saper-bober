import React,{useEffect,useState}from"react";
import{createRoot}from"react-dom/client";import"./styles.css";
const B=[10,25,50,100,250,500,1000],M=[1,1.2,1.45,1.7,2.1,2.7,3.5,4.5,6];
const board=()=>{let a=Array(25).fill(0),n=0;while(n<5){let i=Math.random()*25|0;if(!a[i])a[i]=1,n++}return a};
const tg=()=>window.Telegram?.WebApp;
function App(){
const[u,setU]=useState(null),[bal,setBal]=useState(()=>+localStorage.sb_bal||1000),[bonus,setBonus]=useState(()=>localStorage.sb_bonus||""),[bet,setBet]=useState(10),[b,setB]=useState(board),[o,setO]=useState([]),[s,setS]=useState("ready"),[page,setPage]=useState("game"),[msg,setMsg]=useState("");
useEffect(()=>{let t=tg();if(t){t.ready();t.expand();t.setHeaderColor?.("#10170e");t.setBackgroundColor?.("#0d120a")}setU(t?.initDataUnsafe?.user||null)},[]);
useEffect(()=>localStorage.sb_bal=bal,[bal]);
let safe=o.filter(i=>!b[i]).length,m=M[Math.min(safe,8)],win=Math.floor(bet*m),today=new Date().toISOString().slice(0,10),avail=bonus!==today;
function start(){if(bal<bet)return setMsg("Недостаточно монет");setBal(x=>x-bet);setB(board());setO([]);setS("playing");setMsg("")}
function open(i){if(s!="playing"||o.includes(i))return;let n=[...o,i];setO(n);if(b[i]){setS("lost");setMsg("Мина! Ставка потеряна.")}else if(n.filter(x=>!b[x]).length>=20){setS("won");setBal(x=>x+win);setMsg("Поле очищено! +"+win+" 🪙")}}
function cash(){if(s!="playing"||!safe)return;setBal(x=>x+win);setS("cashed");setMsg("Ты забрал "+win+" 🪙")}
function getBonus(){if(!avail)return;setBal(x=>x+100);setBonus(today);localStorage.sb_bonus=today;setMsg("🎁 +100 🪙 зачислено!")}
let name=u?.first_name||"Игрок",photo=u?.photo_url;
return <div className="app"><header><div className="brand"><div className="bob">🦫</div><div><small>TELEGRAM MINI APP</small><h1>Сапёр Бобёр</h1><p>Не попади на мину</p></div></div><button className="mini" onClick={()=>setPage("profile")}>{photo?<img src={photo}/>:<>👤</>} 🪙 {bal.toLocaleString()}</button></header>
{page==="game"&&<main className="card"><div className="user">👋 {name}<span>Telegram</span></div><div className="row"><div><small>СТАВКА</small><strong>🪙 {bet}</strong></div><div className="bets">{B.map(x=><button className={x==bet?"sel":""} onClick={()=>s!="playing"&&setBet(x)}>{x}</button>)}</div></div>
<div className={"status "+s}>{s==="ready"?"🦫 Готов?":s==="playing"?"🦫 Осторожно!":s==="lost"?"💣 БАБАХ!":s==="won"?"🏆 ПОБЕДА!":"💰 ВЫИГРЫШ!"}<span>{s==="ready"?"Нажми «Начать игру»":msg}</span></div>
<div className="grid">{b.map((mine,i)=><button className={"cell "+(o.includes(i)?"open ":"")+(o.includes(i)&&mine?"mine":"")} disabled={s!="playing"||o.includes(i)} onClick={()=>open(i)}>{o.includes(i)?mine?"💣":"🪙":""}</button>)}</div>
<div className="stats"><div>Безопасно<b>{safe}</b></div><div>Множитель<b>×{m.toFixed(2)}</b></div><div>Выигрыш<b>🪙 {win}</b></div></div>
<button className="gold" disabled={s!="playing"||!safe} onClick={cash}>💰 ЗАБРАТЬ {win} 🪙</button><button disabled={s==="playing"||bal<bet} onClick={start}>🎮 {s==="ready"?"НАЧАТЬ ИГРУ":"ИГРАТЬ ЕЩЁ"}</button></main>}
{page==="bonus"&&<section className="card page"><div className="icon">🎁</div><h2>Ежедневный бонус</h2><p>+100 виртуальных монет один раз в день.</p><div className="bonus">+100 🪙<small>{avail?"Доступен сегодня":"Уже получен сегодня"}</small></div><button className="gold" disabled={!avail} onClick={getBonus}>{avail?"ЗАБРАТЬ БОНУС":"БОНУС ПОЛУЧЕН"}</button>{msg&&<p>{msg}</p>}</section>}
{page==="rating"&&<section className="card page"><div className="icon">🏆</div><h2>Рейтинг</h2><p>Пока локальный прототип. Онлайн-рейтинг подключим с сервером.</p><div className="rank">🥇 {name}<b>🪙 {bal}</b></div></section>}
{page==="profile"&&<section className="card page">{photo?<img className="avatar" src={photo}/>:<div className="avatar">👤</div>}<h2>{name}</h2><p>Профиль Telegram</p><div className="profile"><div>Telegram ID<b>{u?.id||"локальный режим"}</b></div><div>Баланс<b>🪙 {bal}</b></div></div><button onClick={()=>setPage("game")}>🎮 В ИГРУ</button></section>}
<nav>{[["game","🎮","Игра"],["bonus","🎁","Бонус"],["rating","🏆","Рейтинг"],["profile","👤","Профиль"]].map(x=><button className={page==x[0]?"active":""} onClick={()=>{setPage(x[0]);setMsg("")}}><span>{x[1]}</span><small>{x[2]}</small></button>)}</nav></div>}
createRoot(document.getElementById("root")).render(<App/>);
