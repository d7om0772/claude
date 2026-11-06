import React from 'react';
import {
  registerRoot, Composition, AbsoluteFill, Sequence, OffthreadVideo, Audio, staticFile,
  useCurrentFrame, useVideoConfig, interpolate, spring, Easing,
} from 'remotion';
import '@fontsource/tajawal/arabic-800.css';
import '@fontsource/tajawal/arabic-900.css';
import '@fontsource/tajawal/latin-800.css';
import '@fontsource/tajawal/latin-900.css';
import '@fontsource/cairo/arabic-700.css';
import '@fontsource/cairo/latin-700.css';
import '@fontsource/cairo/latin-900.css';
import WORDS from './words.json';

const FPS = 30;
const TOTAL = 35.6;
const f = (s: number) => Math.round(s * FPS);

const C = {
  bg: '#05070c', green: '#76ff4a', cyan: '#2de2ff', red: '#ff3b5c', yellow: '#ffd23f', white: '#ffffff',
};
const AR = "'Tajawal', 'Cairo', sans-serif";
const NUM = "'Cairo', 'Tajawal', sans-serif";

// scene boundaries in seconds (synced to voiceover)
const SCENES = [
  {from: 0, to: 4.82},
  {from: 4.82, to: 11.16},
  {from: 11.16, to: 16.45},
  {from: 16.45, to: 20.46},
  {from: 20.46, to: 26.36},
  {from: 26.36, to: 30.9},
  {from: 30.9, to: TOTAL},
];

/* ---------- helpers ---------- */
const useT = () => useCurrentFrame() / FPS; // local seconds
const pop = (frame: number, at: number, cfg = {damping: 12, stiffness: 160}) =>
  spring({frame: frame - f(at), fps: FPS, config: cfg});

const Footage: React.FC<{src: string; start?: number; dim?: number; tint?: string; zoom?: [number, number]}> = ({
  src, start = 0, dim = 0.55, tint = C.cyan, zoom = [1.08, 1.18],
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const s = interpolate(frame, [0, durationInFrames], zoom);
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: C.bg}}>
      <OffthreadVideo muted src={staticFile(src)} startFrom={f(start)}
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s})`, filter: 'saturate(1.15) contrast(1.05)'}} />
      <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(5,7,12,${dim + 0.15}) 0%, rgba(5,7,12,${dim - 0.2}) 35%, rgba(5,7,12,${dim}) 65%, rgba(5,7,12,${dim + 0.3}) 100%)`}} />
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 40%, ${tint}22 0%, transparent 60%)`, mixBlendMode: 'screen'}} />
    </AbsoluteFill>
  );
};

const Grid: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{
      opacity: 0.12,
      backgroundImage: `linear-gradient(${C.cyan}55 1px, transparent 1px), linear-gradient(90deg, ${C.cyan}55 1px, transparent 1px)`,
      backgroundSize: '90px 90px', backgroundPosition: `0 ${frame * 1.5}px`,
      maskImage: 'radial-gradient(circle at 50% 45%, black 20%, transparent 75%)',
    }} />
  );
};

const Chip: React.FC<{children: React.ReactNode; color: string; style?: React.CSSProperties}> = ({children, color, style}) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 16, padding: '14px 34px', borderRadius: 999,
    background: `${color}22`, border: `3px solid ${color}`, color, fontFamily: AR, fontWeight: 800, fontSize: 52,
    boxShadow: `0 0 40px ${color}55`, direction: 'rtl', ...style,
  }}>{children}</div>
);

const Card: React.FC<{children: React.ReactNode; style?: React.CSSProperties; glow?: string}> = ({children, style, glow = C.cyan}) => (
  <div style={{
    background: 'rgba(12,16,26,0.82)', border: `2px solid ${glow}66`, borderRadius: 34,
    boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 50px ${glow}33, inset 0 1px 0 rgba(255,255,255,0.08)`,
    backdropFilter: 'blur(14px)', direction: 'rtl', ...style,
  }}>{children}</div>
);

const Counter: React.FC<{to: number; from?: number; start: number; end: number; style?: React.CSSProperties; prefix?: string}> = ({
  to, from = 0, start, end, style, prefix = '',
}) => {
  const t = useT();
  const v = interpolate(t, [start, end], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return <span style={{fontFamily: NUM, fontWeight: 900, direction: 'ltr', unicodeBidi: 'isolate', ...style}}>{prefix}{Math.round(v).toLocaleString('en-US')}</span>;
};

/* ---------- scenes (times are local seconds) ---------- */

const S1: React.FC = () => {
  const fr = useCurrentFrame();
  const a = pop(fr, 0.05), b = pop(fr, 2.1), c = pop(fr, 3.55, {damping: 9, stiffness: 200});
  const shake = c > 0.05 && c < 0.98 ? Math.sin(fr * 2.3) * 6 * (1 - c) : 0;
  return (
    <AbsoluteFill>
      <Footage src="34289018.mp4" tint={C.red} />
      <Grid />
      <AbsoluteFill style={{alignItems: 'center', top: 330, direction: 'rtl'}}>
        <div style={{transform: `scale(${a}) rotate(${(1 - a) * -8}deg)`, fontFamily: AR, fontWeight: 900, fontSize: 118, color: C.white, textAlign: 'center', lineHeight: 1.15, textShadow: '0 8px 40px rgba(0,0,0,.6)'}}>
          التجميعات<br /><span style={{color: C.cyan}}>الجاهزة</span> 🤔
        </div>
        <div style={{marginTop: 50, transform: `translateX(${(1 - b) * 400}px)`, opacity: b}}>
          <Chip color={C.red}>غلاء القطع <span style={{fontSize: 60}}>📈</span></Chip>
        </div>
        <div style={{marginTop: 46, transform: `scale(${interpolate(c, [0, 1], [2.4, 1])}) rotate(-6deg) translateX(${shake}px)`, opacity: c}}>
          <div style={{fontFamily: AR, fontWeight: 900, fontSize: 92, color: C.bg, background: C.green, padding: '10px 46px', borderRadius: 22, boxShadow: `0 0 70px ${C.green}aa`}}>
            ✓ خيار أذكى
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const PARTS = [
  {n: 'كرت الشاشة', d: 'RTX 5060', i: '🎮', c: C.green},
  {n: 'المعالج', d: 'CPU', i: '🧠', c: C.cyan},
  {n: 'اللوحة الأم', d: 'Motherboard', i: '🔌', c: C.cyan},
  {n: 'الرامات', d: 'RAM', i: '⚡', c: C.cyan},
  {n: 'التخزين', d: 'SSD', i: '💾', c: C.cyan},
  {n: 'الباور + الكيس', d: 'PSU / Case', i: '📦', c: C.cyan},
];
const S2: React.FC = () => {
  const fr = useCurrentFrame();
  const t = useT();
  const title = pop(fr, 0.05);
  const total = pop(fr, 4.75, {damping: 10, stiffness: 180});
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={f(3.2)}><Footage src="6755168.mp4" start={2} dim={0.68} /></Sequence>
      <Sequence from={f(3.2)}><Footage src="34280528.mp4" dim={0.68} tint={C.red} /></Sequence>
      <Grid />
      <AbsoluteFill style={{alignItems: 'center', top: 190}}>
        <div style={{opacity: title, transform: `translateY(${(1 - title) * -60}px)`}}>
          <Chip color={C.cyan}>🛠️ تجميع قطعة قطعة</Chip>
        </div>
        <div style={{marginTop: 28, width: 860, display: 'flex', flexDirection: 'column', gap: 14}}>
          {PARTS.map((p, i) => {
            const s = pop(fr, 0.35 + i * 0.42);
            const done = t > 0.35 + i * 0.42 + 0.35;
            return (
              <Card key={i} glow={p.c} style={{
                display: 'flex', alignItems: 'center', gap: 24, padding: '14px 34px',
                opacity: s, transform: `translateX(${(1 - s) * 500}px)`,
                border: i === 0 ? `3px solid ${C.green}` : undefined,
              }}>
                <span style={{fontSize: 54}}>{p.i}</span>
                <span style={{fontFamily: AR, fontWeight: 800, fontSize: 50, color: C.white, flex: 1}}>{p.n}</span>
                <span style={{fontFamily: NUM, fontWeight: 700, fontSize: 38, color: i === 0 ? C.green : '#9fb3c8', direction: 'ltr'}}>{p.d}</span>
                <span style={{fontSize: 40, opacity: done ? 1 : 0, color: C.green}}>✔</span>
              </Card>
            );
          })}
        </div>
        <div style={{marginTop: 14, transform: `scale(${0.9 + total * 0.1})`, display: 'flex', alignItems: 'baseline', gap: 22, direction: 'rtl'}}>
          <span style={{fontFamily: AR, fontWeight: 800, fontSize: 56, color: '#c9d6e3'}}>المجموع:</span>
          <Counter to={6000} start={0.4} end={4.85} style={{fontSize: 130, color: t > 4.8 ? C.red : C.white, textShadow: t > 4.8 ? `0 0 50px ${C.red}` : 'none'}} />
          <span style={{fontFamily: AR, fontWeight: 900, fontSize: 64, color: t > 4.8 ? C.red : C.white}}>ريال</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const S3: React.FC = () => {
  const fr = useCurrentFrame();
  const t = useT();
  const q = 'تجميعة RTX 5060';
  const typed = Math.floor(interpolate(t, [0.5, 1.8], [0, q.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const bar = pop(fr, 0.05);
  const res = [pop(fr, 2.0), pop(fr, 2.25), pop(fr, 2.5)];
  const tag = pop(fr, 4.45, {damping: 8, stiffness: 190});
  return (
    <AbsoluteFill>
      <Footage src="8937985.mp4" dim={0.6} />
      <Grid />
      <AbsoluteFill style={{alignItems: 'center', top: 230}}>
        <Card style={{width: 900, padding: '26px 34px', opacity: bar, transform: `translateY(${(1 - bar) * -80}px)`}}>
          <div style={{fontFamily: AR, fontWeight: 800, fontSize: 40, color: C.yellow, marginBottom: 14}}>🛒 أمازون السعودية</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 18, background: '#fff', borderRadius: 18, padding: '16px 24px'}}>
            <span style={{fontSize: 44}}>🔍</span>
            <span style={{fontFamily: AR, fontWeight: 800, fontSize: 50, color: '#111', flex: 1}}>
              {q.slice(0, typed)}<span style={{opacity: Math.floor(fr / 8) % 2 ? 1 : 0, color: C.cyan}}>|</span>
            </span>
          </div>
        </Card>
        <div style={{marginTop: 28, display: 'flex', flexDirection: 'column', gap: 20, width: 900}}>
          {res.map((s, i) => (
            <Card key={i} glow={C.green} style={{display: 'flex', alignItems: 'center', gap: 26, padding: '20px 28px', opacity: s, transform: `translateY(${(1 - s) * 80}px)`}}>
              <div style={{width: 120, height: 120, borderRadius: 20, background: `linear-gradient(135deg, #1a2333, #0c1018)`, border: `2px solid ${C.cyan}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 66}}>🖥️</div>
              <div style={{flex: 1}}>
                <div style={{fontFamily: AR, fontWeight: 800, fontSize: 44, color: C.white}}>تجميعة جاهزة</div>
                <div style={{fontFamily: NUM, fontWeight: 700, fontSize: 36, color: C.green, direction: 'ltr', textAlign: 'right'}}>RTX 5060</div>
              </div>
              <div style={{fontFamily: AR, fontWeight: 900, fontSize: 40, color: C.yellow}}>★★★★☆</div>
            </Card>
          ))}
        </div>
        <div style={{marginTop: 40, opacity: tag, transform: `scale(${interpolate(tag, [0, 1], [2.2, 1])}) rotate(-4deg)`, display: 'flex', alignItems: 'center', gap: 30, direction: 'rtl'}}>
          <div style={{background: C.green, color: C.bg, borderRadius: 26, padding: '12px 40px', fontFamily: AR, fontWeight: 900, fontSize: 84, boxShadow: `0 0 80px ${C.green}aa`}}>
            أقل من <span style={{fontFamily: NUM}}>5,000</span>
          </div>
          <div style={{position: 'relative', fontFamily: NUM, fontWeight: 900, fontSize: 64, color: '#ffffffaa'}}>
            6,000
            <div style={{position: 'absolute', left: -8, right: -8, top: '50%', height: 8, background: C.red, transform: 'rotate(-12deg)', borderRadius: 4}} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const S4: React.FC = () => {
  const fr = useCurrentFrame();
  const t = useT();
  const badge = pop(fr, 1.2, {damping: 9, stiffness: 170});
  const price = pop(fr, 2.4);
  const pulse = 1 + Math.sin(fr / 5) * 0.02;
  return (
    <AbsoluteFill>
      <Footage src="10470834.mp4" dim={0.45} tint={C.green} zoom={[1.15, 1.3]} />
      <AbsoluteFill style={{alignItems: 'center', top: 330}}>
        <div style={{opacity: pop(fr, 0.05)}}><Chip color={C.cyan}>خيارات أفضل</Chip></div>
        <div style={{marginTop: 50, transform: `scale(${badge * pulse})`, opacity: badge}}>
          <div style={{fontFamily: NUM, fontWeight: 900, fontSize: 250, lineHeight: 1, color: C.white, letterSpacing: 6,
            textShadow: `0 0 30px ${C.green}, 0 0 80px ${C.green}, 0 0 140px ${C.green}88`, WebkitTextStroke: `4px ${C.green}`}}>
            DDR5
          </div>
        </div>
        <div style={{marginTop: 20, fontFamily: AR, fontWeight: 800, fontSize: 56, color: '#d5e2ee', opacity: badge}}>رامات أسرع ⚡</div>
        <Card glow={C.green} style={{marginTop: 50, padding: '22px 50px', opacity: price, transform: `translateY(${(1 - price) * 120}px)`, display: 'flex', alignItems: 'baseline', gap: 20}}>
          <span style={{fontFamily: AR, fontWeight: 800, fontSize: 56, color: '#c9d6e3'}}>بحدود</span>
          <Counter from={4000} to={5100} start={2.5} end={3.9} style={{fontSize: 120, color: C.green}} />
          <span style={{fontFamily: AR, fontWeight: 900, fontSize: 60, color: C.white}}>ريال</span>
        </Card>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const WARN = [
  {at: 1.4, i: '🔧', txt: 'أغلب اللوحات الأم بسيطة'},
  {at: 2.55, i: '🧩', txt: 'بعضها رامات أقدم'},
  {at: 4.0, i: '🔍', txt: 'اقرأ المواصفات قبل تشتري', ok: true},
];
const S5: React.FC = () => {
  const fr = useCurrentFrame();
  const head = pop(fr, 0.05, {damping: 8, stiffness: 200});
  const flash = interpolate(fr % 20, [0, 10, 20], [1, 0.55, 1]);
  return (
    <AbsoluteFill>
      <Footage src="6755162.mp4" start={3} dim={0.62} tint={C.yellow} />
      <AbsoluteFill style={{opacity: 0.18, backgroundImage: `repeating-linear-gradient(-45deg, ${C.yellow} 0 40px, transparent 40px 80px)`, maskImage: 'linear-gradient(180deg, black 0%, transparent 14%, transparent 86%, black 100%)'}} />
      <AbsoluteFill style={{alignItems: 'center', top: 300}}>
        <div style={{transform: `scale(${head})`, display: 'flex', alignItems: 'center', gap: 24, direction: 'rtl'}}>
          <span style={{fontSize: 130, opacity: flash}}>⚠️</span>
          <span style={{fontFamily: AR, fontWeight: 900, fontSize: 140, color: C.yellow, textShadow: `0 0 60px ${C.yellow}99`}}>انتبه!</span>
        </div>
        <div style={{marginTop: 50, display: 'flex', flexDirection: 'column', gap: 26, width: 900}}>
          {WARN.map((w, i) => {
            const s = pop(fr, w.at);
            const col = w.ok ? C.green : C.yellow;
            return (
              <Card key={i} glow={col} style={{display: 'flex', alignItems: 'center', gap: 26, padding: '28px 34px', opacity: s,
                transform: `translateX(${(1 - s) * 600}px) scale(${w.ok ? 1 + 0.04 * Math.sin(fr / 6) * s : 1})`, borderRight: `14px solid ${col}`}}>
                <span style={{fontSize: 64}}>{w.i}</span>
                <span style={{fontFamily: AR, fontWeight: 800, fontSize: 54, color: w.ok ? C.green : C.white}}>{w.txt}</span>
              </Card>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const S6: React.FC = () => {
  const fr = useCurrentFrame();
  const t = useT();
  const grow = (at: number) => interpolate(t, [at, at + 0.8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const g1 = grow(0.3), g2 = grow(0.9);
  const save = pop(fr, 3.55, {damping: 8, stiffness: 180});
  const MAXH = 520;
  const Bar = ({h, col, label, val, g}: any) => (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: 300}}>
      <div style={{fontFamily: NUM, fontWeight: 900, fontSize: 64, color: col, opacity: g}}>{val}</div>
      <div style={{width: 210, height: MAXH * h * g, borderRadius: '26px 26px 8px 8px', background: `linear-gradient(180deg, ${col}, ${col}55)`, boxShadow: `0 0 50px ${col}77`}} />
      <div style={{fontFamily: AR, fontWeight: 800, fontSize: 46, color: C.white}}>{label}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      <Footage src="36459927.mp4" dim={0.7} tint={C.green} />
      <Grid />
      <AbsoluteFill style={{alignItems: 'center', top: 230}}>
        <div style={{opacity: pop(fr, 0.05)}}><Chip color={C.cyan}>المقارنة 📊</Chip></div>
        <div style={{marginTop: 40, height: MAXH + 170, display: 'flex', alignItems: 'flex-end', gap: 70, direction: 'rtl'}}>
          <Bar h={1} col={C.red} label="تجميع بنفسك" val="6,000" g={g1} />
          <Bar h={5000 / 6000} col={C.green} label="جاهز" val="~5,000" g={g2} />
        </div>
        <div style={{marginTop: 40, opacity: save, transform: `scale(${interpolate(save, [0, 1], [2, 1])})`, background: C.green, color: C.bg, borderRadius: 30, padding: '14px 44px', boxShadow: `0 0 90px ${C.green}`, fontFamily: AR, fontWeight: 900, fontSize: 64, whiteSpace: 'nowrap', direction: 'rtl'}}>
          وفّر قريب <span style={{fontFamily: NUM}}>1,000</span> ريال 💰
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const S7: React.FC = () => {
  const fr = useCurrentFrame();
  const t = useT();
  const q = pop(fr, 0.05, {damping: 9, stiffness: 170});
  const box = pop(fr, 1.6);
  const msg = 'ميزانيتي 4500 ريال 🎯';
  const typed = Math.floor(interpolate(t, [2.0, 3.4], [0, [...msg].length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const arrow = Math.sin(fr / 4) * 18;
  return (
    <AbsoluteFill>
      <Footage src="40316892.mp4" start={4} dim={0.5} tint={C.cyan} />
      <AbsoluteFill style={{alignItems: 'center', top: 320}}>
        <div style={{transform: `scale(${q})`, fontFamily: AR, fontWeight: 900, fontSize: 124, color: C.white, textAlign: 'center', lineHeight: 1.15, textShadow: `0 0 50px ${C.cyan}88`}}>
          كم <span style={{color: C.green}}>ميزانيتك؟</span>
        </div>
        <div style={{marginTop: 24, fontFamily: AR, fontWeight: 800, fontSize: 54, color: '#d5e2ee', opacity: q}}>وأختار لك الأنسب 👌</div>
        <Card glow={C.cyan} style={{marginTop: 60, width: 880, padding: '26px 30px', opacity: box, transform: `translateY(${(1 - box) * 150}px)`, display: 'flex', alignItems: 'center', gap: 22}}>
          <div style={{width: 90, height: 90, borderRadius: '50%', background: `linear-gradient(135deg, ${C.cyan}, ${C.green})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50}}>👤</div>
          <div style={{flex: 1, background: '#1b2333', borderRadius: 20, padding: '18px 24px', fontFamily: AR, fontWeight: 800, fontSize: 48, color: C.white, minHeight: 60}}>
            {[...msg].slice(0, typed).join('')}<span style={{opacity: Math.floor(fr / 8) % 2 ? 1 : 0, color: C.cyan}}>|</span>
          </div>
          <div style={{fontSize: 56}}>💬</div>
        </Card>
        <div style={{marginTop: 50, transform: `translateY(${arrow}px)`, opacity: box, fontFamily: AR, fontWeight: 900, fontSize: 62, color: C.green, textShadow: `0 0 40px ${C.green}`}}>
          اكتبها بالتعليقات 👇
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------- overlays ---------- */

type W = {t: string; s: number; e: number};
const PAGES: W[][] = (() => {
  const pages: W[][] = [];
  let cur: W[] = [];
  (WORDS as W[]).forEach((w) => {
    cur.push(w);
    const brk = /[،.]$/.test(w.t) || cur.length >= 4;
    if (brk) { pages.push(cur); cur = []; }
  });
  if (cur.length) pages.push(cur);
  return pages;
})();

const Captions: React.FC = () => {
  const t = useT();
  const fr = useCurrentFrame();
  const idx = PAGES.findIndex((p, i) => t >= p[0].s - 0.05 && t < (PAGES[i + 1] ? PAGES[i + 1][0].s - 0.05 : p[p.length - 1].e + 1.2));
  if (idx < 0) return null;
  const page = PAGES[idx];
  const enter = spring({frame: fr - f(page[0].s - 0.05), fps: FPS, config: {damping: 14, stiffness: 220}});
  return (
    <AbsoluteFill style={{top: 1330, alignItems: 'center'}}>
      <div style={{
        direction: 'rtl', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 22px', maxWidth: 900,
        transform: `scale(${0.85 + 0.15 * enter}) translateY(${(1 - enter) * 30}px)`, opacity: enter,
      }}>
        {page.map((w, i) => {
          const active = t >= w.s && t < w.e + 0.05;
          const past = t >= w.e;
          const isNum = /\d/.test(w.t);
          return (
            <span key={i} style={{
              fontFamily: isNum ? NUM : AR, fontWeight: 900, fontSize: 84, lineHeight: 1.35,
              color: active ? C.bg : isNum ? C.green : past ? C.white : 'rgba(255,255,255,0.75)',
              background: active ? C.green : 'transparent', borderRadius: 16, padding: '0 14px',
              transform: `scale(${active ? 1.08 : 1})`,
              textShadow: active ? 'none' : '0 4px 0 #000, 0 0 18px rgba(0,0,0,.9), 3px 0 0 #000, -3px 0 0 #000, 0 -3px 0 #000',
              boxShadow: active ? `0 0 30px ${C.green}aa` : 'none',
              unicodeBidi: 'isolate',
            }}>{w.t.replace(/[.،]$/, '')}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const HUD: React.FC = () => {
  const fr = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 0, left: 0, height: 10, width: `${(fr / durationInFrames) * 100}%`, background: `linear-gradient(90deg, ${C.cyan}, ${C.green})`, boxShadow: `0 0 20px ${C.green}`}} />
      <div style={{position: 'absolute', top: 110, right: 60, direction: 'rtl', display: 'flex', alignItems: 'center', gap: 14,
        background: 'rgba(5,7,12,0.6)', border: `2px solid ${C.green}88`, borderRadius: 999, padding: '10px 26px'}}>
        <div style={{width: 16, height: 16, borderRadius: '50%', background: C.red, opacity: Math.floor(fr / 15) % 2 ? 1 : 0.35}} />
        <span style={{fontFamily: AR, fontWeight: 800, fontSize: 36, color: C.white}}>جاهز ولا تجميع؟</span>
      </div>
    </AbsoluteFill>
  );
};

// fast flash + slide transition at each scene cut
const Cut: React.FC = () => {
  const fr = useCurrentFrame();
  const o = interpolate(fr, [0, 2, 7], [0, 0.85, 0], {extrapolateRight: 'clamp'});
  const x = interpolate(fr, [0, 8], [-1080, 1080], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: '#fff', opacity: o * 0.5}} />
      <div style={{position: 'absolute', top: 0, bottom: 0, width: 260, left: 410, transform: `translateX(${x}px) skewX(-12deg)`, background: `linear-gradient(90deg, transparent, ${C.cyan}cc, ${C.green}cc, transparent)`, opacity: fr < 9 ? 1 : 0}} />
    </AbsoluteFill>
  );
};

const SCENE_COMPS = [S1, S2, S3, S4, S5, S6, S7];
// extra pops synced to stamps (absolute seconds)
const POPS = [3.55, 9.6, 15.6, 17.7, 21.86, 23.0, 24.46, 29.9];

const Main: React.FC = () => {
  const {durationInFrames} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: C.bg}}>
      {SCENES.map((s, i) => {
        const Comp = SCENE_COMPS[i];
        return (
          <Sequence key={i} from={f(s.from)} durationInFrames={f(s.to) - f(s.from)}>
            <Comp />
          </Sequence>
        );
      })}
      {SCENES.slice(1).map((s, i) => (
        <Sequence key={'c' + i} from={f(s.from) - 3} durationInFrames={12}><Cut /></Sequence>
      ))}
      <HUD />
      <Captions />
      {/* fade out */}
      <AbsoluteFill style={{background: '#000', opacity: interpolate(useCurrentFrame(), [durationInFrames - 12, durationInFrames], [0, 1], {extrapolateLeft: 'clamp'})}} />
      <Audio src={staticFile('vo.wav')} />
      {SCENES.slice(1).map((s, i) => (
        <Sequence key={'w' + i} from={Math.max(0, f(s.from) - 9)}><Audio src={staticFile('whoosh.wav')} volume={0.35} /></Sequence>
      ))}
      {POPS.map((p, i) => (
        <Sequence key={'p' + i} from={f(p)}><Audio src={staticFile(i % 3 === 0 ? 'boom.wav' : 'pop.wav')} volume={0.45} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};

const Root: React.FC = () => (
  <Composition id="Main" component={Main} durationInFrames={f(TOTAL)} fps={FPS} width={1080} height={1920} />
);
registerRoot(Root);
