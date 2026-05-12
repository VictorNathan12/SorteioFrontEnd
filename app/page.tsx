'use client';

import { useState, useRef, useEffect } from 'react';

interface Participant {
  id: string;
  name: string;
}

interface Winner {
  name: string;
  timestamp: number;
}

const PALETTE = [
  '#C084FC', '#818CF8', '#38BDF8', '#34D399',
  '#FBBF24', '#F472B6', '#FB923C', '#A78BFA',
];

function drawWheel(
  canvas: HTMLCanvasElement,
  participants: Participant[],
  rotation: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: W, height: H } = canvas;
  const cx = W / 2, cy = H / 2, r = W / 2 - 4;
  ctx.clearRect(0, 0, W, H);

  if (participants.length === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    return;
  }

  const n = participants.length;
  const arc = (Math.PI * 2) / n;
  const rotRad = (rotation * Math.PI) / 180;

  for (let i = 0; i < n; i++) {
    const start = rotRad + arc * i - Math.PI / 2;
    const end = start + arc;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = PALETTE[i % PALETTE.length];
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (n <= 14) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      const textR = r * 0.6;
      ctx.translate(textR, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      const fs = Math.max(9, Math.min(13, Math.floor((r * arc * 0.3))));
      ctx.font = `600 ${fs}px "DM Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label =
        participants[i].name.length > 11
          ? participants[i].name.slice(0, 10) + '…'
          : participants[i].name;
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export default function SorteioPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [winners, setWinners] = useState<Winner[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [confetti, setConfetti] = useState<
    Array<{ id: number; x: number; color: string; delay: number; dur: number }>
  >([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (canvasRef.current) drawWheel(canvasRef.current, participants, rotation);
  }, [participants, rotation]);

  const addParticipant = () => {
    if (!inputValue.trim()) return;
    setParticipants((p) => [...p, { id: Date.now().toString(), name: inputValue.trim() }]);
    setInputValue('');
  };

  const removeParticipant = (id: string) => {
    if (isDrawing) return;
    setParticipants((p) => p.filter((x) => x.id !== id));
  };

  const spawnConfetti = () => {
    const items = Array.from({ length: 70 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: PALETTE[i % PALETTE.length],
      delay: Math.random() * 0.8,
      dur: 2 + Math.random() * 2,
    }));
    setConfetti(items);
    setTimeout(() => setConfetti([]), 4000);
  };

  const performDraw = () => {
    if (participants.length === 0 || isDrawing) return;
    setIsDrawing(true);
    setSelectedWinner(null);

    const winnerIdx = Math.floor(Math.random() * participants.length);
    const winner = participants[winnerIdx];
    const n = participants.length;
    const segAngle = 360 / n;
    const target = rotRef.current + 360 * 7 + (360 - winnerIdx * segAngle) - segAngle / 2;

    const startRot = rotRef.current;
    const startTime = performance.now();
    const duration = 5000;

    const ease = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const cur = startRot + (target - startRot) * ease(t);
      rotRef.current = cur;
      setRotation(cur);
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        rotRef.current = target % 360;
        setRotation(target % 360);
        setIsDrawing(false);
        setSelectedWinner(winner.name);
        setWinners((prev) => [{ name: winner.name, timestamp: Date.now() }, ...prev]);
        spawnConfetti();
        setTimeout(() => setSelectedWinner(null), 5000);
      }
    };
    animRef.current = requestAnimationFrame(animate);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .sorteio-root {
          min-height: 100vh;
          background: #0a0a0f;
          color: #e2e2e8;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* subtle grid */
        .sorteio-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        .s-inner {
          position: relative;
          z-index: 1;
          max-width: 980px;
          margin: 0 auto;
          padding: 3rem 1.5rem 4rem;
        }

        /* header */
        .s-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        .s-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #a78bfa;
          border: 1px solid rgba(167,139,250,0.3);
          border-radius: 100px;
          padding: 5px 14px;
          margin-bottom: 1rem;
        }
        .s-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(2.6rem, 6vw, 4.5rem);
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.03em;
          color: #fff;
        }
        .s-title span { color: #a78bfa; }

        /* layout */
        .s-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 1.5rem;
          align-items: start;
        }
        @media (max-width: 700px) { .s-grid { grid-template-columns: 1fr; } }

        /* card */
        .s-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 1.75rem;
        }
        .s-card-title {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-bottom: 1.25rem;
        }

        /* wheel */
        .s-wheel-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }
        .s-wheel-frame {
          position: relative;
        }
        .s-pointer {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          width: 0; height: 0;
          border-left: 11px solid transparent;
          border-right: 11px solid transparent;
          border-top: 22px solid #a78bfa;
          filter: drop-shadow(0 0 8px #a78bfa88);
        }
        .s-canvas {
          border-radius: 50%;
          display: block;
        }
        .s-center {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 76px; height: 76px;
          border-radius: 50%;
          background: #0a0a0f;
          border: 3px solid rgba(255,255,255,0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
        }
        .s-center-n {
          font-family: 'Syne', sans-serif;
          font-size: 24px;
          font-weight: 800;
          color: #fff;
          line-height: 1;
        }
        .s-center-lbl {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
        }

        /* spin button */
        .s-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          max-width: 320px;
          padding: 14px 24px;
          border-radius: 14px;
          border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.03em;
          cursor: pointer;
          background: linear-gradient(135deg, #a78bfa, #818cf8);
          color: #fff;
          transition: opacity 0.2s, transform 0.15s;
          box-shadow: 0 0 32px rgba(167,139,250,0.3);
        }
        .s-btn:hover:not(:disabled) { opacity: 0.9; transform: scale(1.02); }
        .s-btn:active:not(:disabled) { transform: scale(0.97); }
        .s-btn:disabled { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.25); box-shadow: none; cursor: not-allowed; }

        /* winner banner */
        .s-winner {
          width: 100%;
          background: rgba(167,139,250,0.1);
          border: 1px solid rgba(167,139,250,0.3);
          border-radius: 14px;
          padding: 1.25rem 1.5rem;
          text-align: center;
          animation: pop 0.35s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes pop {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
        .s-winner-lbl {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #a78bfa;
          margin-bottom: 6px;
        }
        .s-winner-name {
          font-family: 'Syne', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          color: #fff;
        }

        /* sidebar */
        .s-sidebar { display: flex; flex-direction: column; gap: 1.25rem; }

        /* input */
        .s-input-row {
          display: flex;
          gap: 8px;
          margin-bottom: 1rem;
        }
        .s-input {
          flex: 1;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 9px 13px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #fff;
          outline: none;
          transition: border-color 0.15s;
        }
        .s-input::placeholder { color: rgba(255,255,255,0.22); }
        .s-input:focus { border-color: rgba(167,139,250,0.6); }
        .s-add-btn {
          width: 38px; height: 38px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.06);
          color: #a78bfa;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .s-add-btn:hover { background: rgba(167,139,250,0.15); }

        /* participant list */
        .s-list { max-height: 228px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
        .s-list::-webkit-scrollbar { width: 4px; }
        .s-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .s-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          transition: border-color 0.15s;
        }
        .s-item:hover { border-color: rgba(255,255,255,0.12); }
        .s-dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 10px; flex-shrink: 0; }
        .s-item-left { display: flex; align-items: center; font-size: 14px; color: #e2e2e8; }
        .s-remove {
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.2);
          font-size: 18px; line-height: 1;
          padding: 2px 4px;
          border-radius: 6px;
          transition: color 0.15s, background 0.15s;
        }
        .s-remove:hover { color: #f87171; background: rgba(248,113,113,0.1); }
        .s-empty {
          text-align: center;
          color: rgba(255,255,255,0.2);
          font-size: 13px;
          padding: 1.5rem 0;
        }

        /* history */
        .s-hist-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .s-clear-btn {
          font-size: 12px;
          font-family: 'DM Sans', sans-serif;
          color: rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 4px 10px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .s-clear-btn:hover { background: rgba(248,113,113,0.12); color: #f87171; border-color: rgba(248,113,113,0.2); }
        .s-hlist { max-height: 190px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
        .s-hlist::-webkit-scrollbar { width: 4px; }
        .s-hlist::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .s-hitem {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 12px;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
        }
        .s-hname { font-size: 14px; font-weight: 500; color: #e2e2e8; }
        .s-htime { font-size: 11px; color: rgba(255,255,255,0.25); margin-top: 2px; }
        .s-htrophy { font-size: 16px; }

        /* confetti */
        .s-conf-layer { position: fixed; inset: 0; pointer-events: none; z-index: 999; }
        .s-conf {
          position: absolute;
          width: 8px; height: 8px;
          border-radius: 2px;
          animation: s-fall linear forwards;
        }
        @keyframes s-fall {
          from { opacity: 1; }
          to { transform: translateY(110vh) rotate(540deg); opacity: 0; }
        }
      `}</style>

      <div className="sorteio-root">
      
        {confetti.length > 0 && (
          <div className="s-conf-layer">
            {confetti.map((c) => (
              <div
                key={c.id}
                className="s-conf"
                style={{
                  left: `${c.x}%`,
                  top: '-12px',
                  background: c.color,
                  animationDuration: `${c.dur}s`,
                  animationDelay: `${c.delay}s`,
                }}
              />
            ))}
          </div>
        )}

        <div className="s-inner">
          
          <div className="s-header">
            <div className="s-badge">✦ Sorteio ✦</div>
            <h1 className="s-title">
              Roleta <span>Premiada</span>
            </h1>
          </div>

          <div className="s-grid">
           
            <div className="s-card">
              <div className="s-wheel-wrap">
                <div className="s-wheel-frame">
                  <div className="s-pointer" />
                  <canvas
                    ref={canvasRef}
                    className="s-canvas"
                    width={300}
                    height={300}
                  />
                  <div className="s-center">
                    <span className="s-center-n">{participants.length}</span>
                    <span className="s-center-lbl">jogadores</span>
                  </div>
                </div>

                <button
                  className="s-btn"
                  onClick={performDraw}
                  disabled={participants.length === 0 || isDrawing}
                >
                  {isDrawing ? '⟳ Girando…' : '⬡ Girar Roleta'}
                </button>

                {selectedWinner && (
                  <div className="s-winner">
                    <div className="s-winner-lbl">🏆 Parabéns ao ganhador</div>
                    <div className="s-winner-name">{selectedWinner}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="s-sidebar">
            
              <div className="s-card">
                <div className="s-card-title">Participantes</div>
                <div className="s-input-row">
                  <input
                    className="s-input"
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
                    placeholder="Digite um nome..."
                  />
                  <button className="s-add-btn" onClick={addParticipant}>+</button>
                </div>
                <div className="s-list">
                  {participants.length === 0 ? (
                    <div className="s-empty">Nenhum participante</div>
                  ) : (
                    participants.map((p, i) => (
                      <div key={p.id} className="s-item">
                        <div className="s-item-left">
                          <div className="s-dot" style={{ background: PALETTE[i % PALETTE.length] }} />
                          {p.name}
                        </div>
                        <button className="s-remove" onClick={() => removeParticipant(p.id)}>×</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="s-card">
                <div className="s-hist-header">
                  <div className="s-card-title" style={{ marginBottom: 0 }}>Histórico</div>
                  {winners.length > 0 && (
                    <button className="s-clear-btn" onClick={() => setWinners([])}>Limpar</button>
                  )}
                </div>
                <div className="s-hlist">
                  {winners.length === 0 ? (
                    <div className="s-empty">Nenhum sorteio realizado</div>
                  ) : (
                    winners.map((w, i) => (
                      <div key={w.timestamp} className="s-hitem">
                        <div>
                          <div className="s-hname">#{i + 1} {w.name}</div>
                          <div className="s-htime">{new Date(w.timestamp).toLocaleTimeString('pt-BR')}</div>
                        </div>
                        <span className="s-htrophy">🏆</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}