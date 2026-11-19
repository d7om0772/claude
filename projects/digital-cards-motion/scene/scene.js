/* =============================================================================
 scene.js — موشن جرافيك "قبل تشتري بطاقة رقمية" (1080×1920).
 دالة حتمية window.renderFrame(t): كل شي يتحسب من t فقط (بدون CSS animations) عشان الرندر فريم فريم.
 البيانات: window.__SCENE_DATA__ = { duration, voice_offset, lines: [{start,end,words:[{w,start,end}]}] }
============================================================================= */
(function () {
  const D = window.__SCENE_DATA__ || { duration: 34.5, voice_offset: 0, lines: [] };
  const OFF = D.voice_offset || 0;
  const WORDS = [];
  D.lines.forEach((ln, li) => ln.words.forEach((w) => WORDS.push({ ...w, li, start: w.start + OFF, end: w.end + OFF })));

  const norm = (s) => s.replace(/[ً-ْـ،؟?!.,:…]/g, "").replace(/[أإآ]/g, "ا");
  /** بداية (أو نهاية) الكلمة رقم nth اللي تطابق النص */
  function W(txt, nth = 1, edge = "start") {
    let k = 0;
    for (const w of WORDS) if (norm(w.w) === norm(txt) && ++k === nth) return w[edge];
    console.warn("word not found: " + txt);
    return 0;
  }

  // ---------- أدوات ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const E = {
    out: (p) => 1 - Math.pow(1 - p, 3),
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    in: (p) => p * p * p,
    back: (p) => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    elastic: (p) => (p === 0 || p === 1 ? p : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  };
  const P = (t, a, d) => clamp((t - a) / d);
  const $ = (id) => document.getElementById(id);

  /** يطبّق حالة على عنصر: x,y (إزاحة px)، s (حجم)، r (دوران)، rx/ry (3D)، o (شفافية)، b (blur) */
  function set(el, st) {
    if (typeof el === "string") el = $(el);
    const o = st.o === undefined ? 1 : st.o;
    if (o <= 0.001) { el.style.visibility = "hidden"; el.style.opacity = "0"; return; }
    el.style.visibility = "visible";
    el.style.opacity = String(o);
    const tf = [];
    if (st.persp) tf.push(`perspective(${st.persp}px)`);
    tf.push(`translate(${(st.x || 0).toFixed(2)}px, ${(st.y || 0).toFixed(2)}px)`);
    if (st.rx) tf.push(`rotateX(${st.rx.toFixed(2)}deg)`);
    if (st.ry) tf.push(`rotateY(${st.ry.toFixed(2)}deg)`);
    if (st.r) tf.push(`rotate(${st.r.toFixed(2)}deg)`);
    tf.push(`scale(${(st.s === undefined ? 1 : st.s).toFixed(4)})`);
    el.style.transform = tf.join(" ");
    el.style.filter = st.b > 0.05 ? `blur(${st.b.toFixed(1)}px)` : "none";
  }

  /** ظهور واختفاء قياسي: يرجّع {o, s, y, b, p, q} — p تقدم الدخول، q تقدم الخروج */
  function life(t, tin, tout, o = {}) {
    const din = o.din || 0.5, dout = o.dout || 0.35;
    const p = P(t, tin, din), q = tout === undefined ? 0 : P(t, tout, dout);
    const pe = (o.ease || E.back)(p), qe = E.in(q);
    return {
      p, q, pe,
      o: clamp(p * 2.2) * (1 - qe),
      s: lerp(o.s0 === undefined ? 0.85 : o.s0, 1, pe) * lerp(1, o.s1 === undefined ? 0.9 : o.s1, qe),
      y: lerp(o.y0 === undefined ? 60 : o.y0, 0, pe) + lerp(0, o.y1 === undefined ? -40 : o.y1, qe),
      b: (1 - clamp(p * 1.6)) * (o.b0 === undefined ? 10 : o.b0) + qe * 8,
    };
  }
  const float = (t, amp = 12, sp = 1, ph = 0) => Math.sin(t * sp * 1.6 + ph) * amp;

  // ---------- جزيئات الخلفية (حتمية) ----------
  const fx = $("fx"), ctx = fx.getContext("2d");
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const parts = Array.from({ length: 46 }, () => ({
    x: rnd() * 1080, y: rnd() * 1920, r: 1.5 + rnd() * 3.5, sp: 18 + rnd() * 40, ph: rnd() * 6.28,
    c: rnd() < 0.5 ? "167,139,250" : rnd() < 0.7 ? "34,211,238" : "251,191,36", sq: rnd() < 0.35,
  }));
  function drawFx(t) {
    ctx.clearRect(0, 0, 1080, 1920);
    for (const q of parts) {
      const y = ((q.y - t * q.sp) % 1920 + 1920) % 1920;
      const x = q.x + Math.sin(t * 0.6 + q.ph) * 14;
      const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.2 + q.ph));
      ctx.fillStyle = `rgba(${q.c},${a.toFixed(3)})`;
      if (q.sq) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.5 + q.ph);
        ctx.fillRect(-q.r * 1.4, -q.r, q.r * 2.8, q.r * 2); ctx.restore();
      } else { ctx.beginPath(); ctx.arc(x, y, q.r, 0, 6.283); ctx.fill(); }
    }
  }

  // ---------- الترجمة ----------
  const subsIn = $("subsIn");
  let lastLine = -2, lastHTML = "";
  function drawSubs(t, hideFrom) {
    let li = -1;
    for (let i = 0; i < D.lines.length; i++) {
      const ln = D.lines[i], next = D.lines[i + 1];
      const a = ln.start + OFF, b = next ? next.start + OFF : ln.end + OFF + 0.6;
      if (t >= a - 0.05 && t < b) { li = i; break; }
    }
    const box = $("subs");
    if (li < 0 || t >= hideFrom) { set(box, { o: 0 }); lastLine = -1; return; }
    const ln = D.lines[li];
    const html = ln.words.map((w) => {
      const a = w.start + OFF, b = w.end + OFF;
      const cls = t >= a && t < b + 0.04 ? "w now" : t >= b ? "w said" : "w";
      return `<span class="${cls}">${w.w}</span>`;
    }).join(" ");
    if (html !== lastHTML) { subsIn.innerHTML = html; lastHTML = html; }
    const p = E.out(P(t, ln.start + OFF - 0.05, 0.18));
    set(box, { o: clamp(p * 1.5), s: lerp(0.94, 1, p), y: lerp(14, 0, p) });
    lastLine = li;
  }

  // ---------- التوقيتات (من الكلام) ----------
  const T = {};
  function computeTimes() {
    T.s1 = W("أولاً"); T.region = W("المنطقة"); T.most = W("أغلب"); T.acct = W("حسابك"); T.take = W("خذ"); T.saudiCard = W("سعودية");
    T.s2 = W("ثانياً"); T.code = W("الكود", 1); T.cash = W("الكاش"); T.noPhoto = W("تصوّره"); T.noSend = W("ترسله");
    T.anyone = W("أي", 2); T.sees = W("يشوفه"); T.uses = W("يستخدمه"); T.before = W("قبلك");
    T.s3 = W("ثالثاً"); T.charge = W("اشحن"); T.self = W("بنفسك"); T.app = W("التطبيق"); T.official = W("الرسمي"); T.notFrom = W("مو");
    T.link = W("رابط"); T.msg = W("برسالة");
    T.out = W("اختر"); T.relax = W("مرتاح"); T.relaxEnd = W("مرتاح", 1, "end");
    T.end = D.duration;
    // تعديل لو ما لقى كلمة "تصوّره" بالتشكيل
    if (!T.noPhoto) T.noPhoto = W("تصوره");
  }

  const CODE = "7QK4-M2XP-9R8T";

  // ---------- الرسم ----------
  function renderFrame(t) {
    drawFx(t);

    // الخلفية: Ken Burns + دفعة خفيفة مع كل انتقال
    const push = [T.s1, T.s2, T.s3, T.out].reduce((acc, a) => acc + Math.exp(-Math.pow((t - a - 0.2) / 0.35, 2)) * 0.02, 0);
    set("bg", { s: 1.08 - 0.06 * (t / T.end) + push, y: -18 * Math.sin(t * 0.12), x: 10 * Math.sin(t * 0.09) });
    set("spot", { s: 1 + 0.05 * Math.sin(t * 0.8), o: 0.85 + 0.15 * Math.sin(t * 1.3) });

    // انتقال ضوئي
    let sw = -1;
    for (const a of [T.s1, T.s2, T.s3, T.out]) if (t >= a - 0.3 && t < a + 0.45) sw = (t - (a - 0.3)) / 0.75;
    set("sweep", sw < 0 ? { o: 0 } : { x: lerp(0, 2000, E.inOut(sw)), o: 1, r: 14 });

    // الهيدر + الخطوات
    set("header", { o: 1 });
    const stepOn = t >= T.out ? 4 : t >= T.s3 ? 3 : t >= T.s2 ? 2 : t >= T.s1 ? 1 : 0;
    for (let i = 1; i <= 3; i++) {
      const el = $("st" + i);
      el.className = "step" + (stepOn === i ? " on" : stepOn > i ? " done" : "");
      const at = [T.s1, T.s2, T.s3][i - 1];
      const bump = t >= at ? Math.exp(-Math.pow((t - at - 0.15) / 0.18, 2)) * 0.22 : 0;
      el.style.transform = `scale(${(1 + bump).toFixed(3)})`;
      el.textContent = stepOn > i ? "✓" : String(i);
    }

    // ===== ٠) الهوك (ظاهر من أول فريم) =====
    {
      const ex = P(t, T.s1 - 0.25, 0.4), exe = E.in(ex);
      const intro = E.out(P(t, 0, 0.6));
      set("hGlow", { o: (0.7 + 0.3 * Math.sin(t * 2)) * (1 - exe), s: 1 + 0.06 * Math.sin(t * 1.5) });
      set("hCard", { persp: 1400, ry: 16 * Math.sin(t * 1.1) - 6, rx: 8 * Math.sin(t * 0.8 + 1), y: float(t, 16, 0.9) + lerp(0, -80, exe),
        s: lerp(0.94, 1, intro) * lerp(1, 0.7, exe), o: 1 - exe, r: -4 + 3 * Math.sin(t * 0.7) });
      const tileT = [W("هالثلاث") - 0.05, W("هالثلاث") + 0.3, W("أشياء")];
      ["ht1", "ht2", "ht3"].forEach((id, i) => {
        const L = life(t, tileT[i], T.s1 - 0.3, { din: 0.45, s0: 0.2, y0: 30, b0: 0, s1: 0.3, y1: -60 });
        set(id, { ...L, y: L.y + float(t, 10, 1.2, i * 2), r: lerp(-25, [-8, 6, -4][i], L.pe) });
      });
      const L1 = { o: 1 - exe, s: lerp(0.96, 1, intro) * lerp(1, 0.9, exe), y: lerp(0, -40, exe), b: exe * 8 };
      set("hTitle", L1);
      const L2 = life(t, W("اعرف") - 0.1, T.s1 - 0.25, { din: 0.5, s0: 0.7, y0: 30 });
      set("hSub", L2);
    }

    // ===== عنوان الخطوة =====
    {
      let n = 0, h = "", sub = "", a = 0, b = 0;
      if (t >= T.s1 - 0.05 && t < T.s2) { n = 1; h = "المنطقة"; sub = "دولة البطاقة لازم تطابق دولة حسابك"; a = T.s1; b = T.s2 - 0.3; }
      else if (t >= T.s2 - 0.05 && t < T.s3) { n = 2; h = "الكود = كاش"; sub = "اللي يشوفه يقدر يستخدمه"; a = T.s2; b = T.s3 - 0.3; }
      else if (t >= T.s3 - 0.05 && t < T.out) { n = 3; h = "اشحن من الرسمي"; sub = "وأدخل الكود بنفسك"; a = T.s3; b = T.out - 0.3; }
      if (!n) set("sTitle", { o: 0 });
      else {
        $("sNum").textContent = String(n);
        if ($("sH").textContent !== h) { $("sH").textContent = h; $("sSub").textContent = sub; }
        const L = life(t, a, b, { din: 0.5, s0: 0.9, y0: -30, y1: -30 });
        set("sTitle", { o: L.o, y: L.y, b: L.b });
        set("sNum", { s: E.elastic(P(t, a + 0.05, 0.7)), r: lerp(-40, 0, E.out(P(t, a, 0.5))) });
      }
    }

    // ===== ١) المنطقة =====
    {
      const end = T.s2 - 0.3;
      const shrink = E.inOut(P(t, T.acct - 0.2, 0.6));
      const G = life(t, T.s1 + 0.1, end, { din: 0.7, s0: 0.5, y0: 120 });
      set("gGlow", { o: G.o * (0.75 + 0.25 * Math.sin(t * 2.4)), s: G.s * lerp(1, 0.62, shrink), y: lerp(0, -40, shrink) });
      set("globe", { ...G, persp: 1200, ry: 10 * Math.sin(t * 0.9), r: 4 * Math.sin(t * 0.6), s: G.s * lerp(1, 0.55, shrink) * (1 + 0.02 * Math.sin(t * 3)),
        y: G.y + float(t, 12, 0.8) + lerp(0, -160, shrink) });
      // البطاقتين
      const cardIn = T.most;
      const LS = life(t, cardIn + 0.15, end, { din: 0.55, s0: 0.6, y0: 140 });
      const LU = life(t, cardIn, end, { din: 0.55, s0: 0.6, y0: 140 });
      const okP = P(t, T.saudiCard, 0.5), noP = P(t, T.saudiCard + 0.25, 0.5);
      const shake = noP > 0 && noP < 1 ? Math.sin(noP * 40) * 14 * (1 - noP) : 0;
      set("cardSA", { ...LS, persp: 1000, ry: lerp(-30, -6, LS.pe) + 4 * Math.sin(t * 1.4), y: LS.y + float(t, 8, 1.1, 1) + lerp(0, -18, E.out(okP)),
        s: LS.s * (1 + 0.08 * E.back(okP)) });
      set("cardUS", { ...LU, persp: 1000, ry: lerp(30, 6, LU.pe) + 4 * Math.sin(t * 1.3 + 1), x: shake, y: LU.y + float(t, 8, 1.1, 2) + lerp(0, 24, E.out(noP)),
        o: LU.o * lerp(1, 0.55, E.out(noP)), s: LU.s * lerp(1, 0.92, E.out(noP)) });
      $("cardSA").style.boxShadow = okP > 0 ? `0 30px 60px rgba(0,0,0,.45), 0 0 ${(60 * E.out(okP)).toFixed(0)}px rgba(52,211,153,${(0.7 * E.out(okP)).toFixed(2)})` : "";
      const okL = life(t, T.saudiCard, end, { din: 0.5, s0: 0, y0: 0, b0: 0 });
      set("okSA", { ...okL, s: E.elastic(okP) * (1 - E.in(okL.q)) });
      const noL = life(t, T.saudiCard + 0.25, end, { din: 0.5, s0: 0, y0: 0, b0: 0 });
      set("noUS", { ...noL, s: E.elastic(noP) * (1 - E.in(noL.q)) });
      // الحساب
      const LA = life(t, T.acct + 0.05, end, { din: 0.5, s0: 0.6, y0: 40 });
      set("account", { ...LA, s: LA.s * (1 + 0.05 * Math.exp(-Math.pow((t - W("سعودي") - 0.15) / 0.15, 2))) });
    }

    // ===== ٢) الكود = كاش =====
    {
      const end = T.s3 - 0.3;
      // الدرع يفتتح الخطوة ثم يصغر للزاوية
      const V = life(t, T.s2 + 0.1, end, { din: 0.6, s0: 0.4, y0: 100 });
      const toCorner = E.inOut(P(t, T.code - 0.35, 0.6));
      set("vault", { ...V, x: lerp(0, -330, toCorner), y: V.y + lerp(0, -385, toCorner) + float(t, 10, 0.9), s: V.s * lerp(1, 0.32, toCorner), r: 4 * Math.sin(t * 0.8) });
      // البطاقة
      const C = life(t, T.code - 0.25, end, { din: 0.6, s0: 0.7, y0: 260 });
      const usedP = P(t, T.before, 0.35);
      const shakeC = usedP > 0 && usedP < 1 ? Math.sin(usedP * 34) * 10 * (1 - usedP) : 0;
      set("codeCard", { ...C, persp: 1400, rx: lerp(35, 0, C.pe) + 3 * Math.sin(t * 1.2), ry: 5 * Math.sin(t * 0.9), x: shakeC, y: C.y + float(t, 8, 0.8) });
      set("codeShine", { x: lerp(-200, 900, P(t, T.code + 0.3, 1.1)), r: 18 });
      // كشط الكود
      const sc = E.inOut(P(t, T.code + 0.15, 0.6));
      $("scratch").style.clipPath = `inset(0 ${(sc * 100).toFixed(2)}% 0 0)`;
      $("scratch").style.visibility = sc >= 1 ? "hidden" : "visible";
      const mk = E.out(P(t, T.anyone, 0.45));
      set("codeMask", { o: mk });
      set("codeTxt", { o: 1, b: mk * 6 });
      // الرصيد
      const bal = Math.round(lerp(100, 0, E.inOut(P(t, T.uses, 0.6))));
      if ($("bal").textContent !== String(bal)) $("bal").textContent = String(bal);
      $("bal").style.color = bal === 0 ? "#fb7185" : "#fff";
      const ST = life(t, T.before, end, { din: 0.35, s0: 2.2, y0: 0, b0: 0, ease: E.out });
      set("usedStamp", { ...ST, r: -10 });
      // زي الكاش
      const K = life(t, T.cash - 0.1, T.noPhoto - 0.15, { din: 0.5, s0: 0.5, y0: 40, dout: 0.25 });
      set("cashTag", { ...K, r: lerp(-6, 0, K.pe) });
      // لا تصوّره / لا ترسله
      const N1 = life(t, T.noPhoto, T.anyone - 0.1, { din: 0.5, s0: 0.3, y0: 50 });
      const N2 = life(t, T.noSend, T.anyone - 0.1, { din: 0.5, s0: 0.3, y0: 50 });
      set("noCam", { ...N1, r: lerp(-15, 0, N1.pe), y: N1.y + float(t, 6, 1.3) });
      set("noSend", { ...N2, r: lerp(15, 0, N2.pe), y: N2.y + float(t, 6, 1.3, 2) });
    }

    // ===== ٣) اشحن من الرسمي =====
    {
      const end = T.out - 0.3;
      const away = E.inOut(P(t, T.notFrom - 0.1, 0.5));
      const PH = life(t, T.s3 + 0.1, end, { din: 0.65, s0: 0.6, y0: 200 });
      set("phone", { ...PH, persp: 1300, ry: lerp(-25, -8, PH.pe) + 5 * Math.sin(t * 0.9), y: PH.y + float(t, 10, 0.8),
        x: lerp(0, -230, away), s: PH.s * lerp(1, 0.62, away), o: PH.o * lerp(1, 0, away) });
      // الكتابة
      const IN = life(t, T.charge - 0.1, T.notFrom - 0.1, { din: 0.45, s0: 0.7, y0: 40, dout: 0.3 });
      set("inputBox", IN);
      const typeP = P(t, T.charge + 0.15, Math.max(0.6, T.app - T.charge - 0.2));
      const n = Math.round(typeP * CODE.length);
      const txt = CODE.slice(0, n);
      if ($("inputTxt").textContent !== txt) $("inputTxt").textContent = txt;
      $("caret").style.opacity = Math.floor(t * 2.5) % 2 === 0 || typeP < 1 ? "1" : "0";
      const OK = life(t, T.app, T.notFrom - 0.1, { din: 0.5, s0: 0.5, y0: 40, dout: 0.3 });
      set("okOfficial", OK);
      $("inputBox").style.borderColor = t >= T.official ? "#34d399" : "#22d3ee";
      // الرابط المشبوه
      const F = life(t, T.notFrom, end, { din: 0.55, s0: 0.5, y0: 0, b0: 6 });
      const shakeF = P(t, T.msg, 0.5);
      set("phish", { ...F, x: lerp(420, 70, F.pe) + (shakeF > 0 && shakeF < 1 ? Math.sin(shakeF * 36) * 12 * (1 - shakeF) : 0),
        y: F.y + float(t, 10, 1) - 30, r: lerp(20, 4, F.pe) });
      const STP = life(t, T.msg, end, { din: 0.35, s0: 2.4, y0: 0, b0: 0, ease: E.out });
      set("phishStamp", { ...STP, x: 70, y: -30, r: -12 });
      const NL = life(t, T.link, end, { din: 0.5, s0: 0.6, y0: 40 });
      set("noLink", { ...NL, x: 70 });
    }

    // ===== ٤) الختام =====
    {
      const O = life(t, T.out + 0.05, undefined, { din: 0.8, s0: 0.4, y0: 260 });
      set("oGlow", { o: O.o * (0.8 + 0.2 * Math.sin(t * 2.2)), s: O.s * (1 + 0.05 * Math.sin(t * 1.4)) });
      set("gift", { ...O, y: O.y + float(t, 14, 0.9), r: 3 * Math.sin(t * 0.8) });
      const OT = life(t, T.out + 0.2, undefined, { din: 0.55, s0: 0.85, y0: 40 });
      set("oTitle", OT);
      const ck = [T.out + 0.9, T.out + 1.5, T.out + 2.1];
      ["ck1", "ck2", "ck3"].forEach((id, i) => {
        const L = life(t, ck[i], undefined, { din: 0.5, s0: 0.9, y0: 0, b0: 4 });
        set(id, { ...L, x: lerp(-120, 0, L.pe) });
        const box = $(id).firstElementChild;
        box.style.transform = `scale(${E.elastic(P(t, ck[i] + 0.15, 0.6)).toFixed(3)})`;
      });
    }

    drawSubs(t, T.out - 0.05);
  }

  // ---------- فحص المناطق الآمنة (للمراجعة) ----------
  window.__qa = function () {
    const issues = [];
    document.querySelectorAll(".titleBox, #sTitle, #subs, .check, .okTag, .noTag, .account, .cashTag, #inputBox, .gcard, #header").forEach((el) => {
      if (el.style.visibility === "hidden" || +el.style.opacity < 0.05) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2) return;
      const id = el.id || el.className;
      if (r.top < 170) issues.push(`${id}: top ${r.top.toFixed(0)} < 180`);
      if (r.bottom > 1505) issues.push(`${id}: bottom ${r.bottom.toFixed(0)} > 1500`);
      if (r.right > 965 && r.bottom > 800 && r.top < 1600) issues.push(`${id}: right ${r.right.toFixed(0)} > 960 in 800–1600`);
    });
    return issues;
  };

  // ---------- الجاهزية ----------
  function ready() {
    computeTimes();
    $("bg").style.backgroundImage = "url(../assets/img/bg.png)";
    const imgs = [...document.images];
    const bgImg = new Image(); bgImg.src = "../assets/img/bg.png";
    Promise.all([document.fonts.ready, ...imgs.concat([bgImg]).map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = r; })))])
      .then(() => document.fonts.load("900 50px Alexandria", "بطاقة"))
      .then(() => { renderFrame(0); window.__ready = true; });
  }
  window.renderFrame = renderFrame;
  window.__meta = { duration: D.duration };
  ready();
})();
