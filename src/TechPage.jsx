import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Copy, Check, Play, RotateCcw, Zap, ZapOff, Hand } from 'lucide-react';
import chatComponent from './snippets/chat.component.ts?raw';
import geminiService from './snippets/gemini.service.ts?raw';
import appConfig from './snippets/app.config.ts?raw';
import mainPy from './snippets/main.py?raw';
import dockerfile from './snippets/Dockerfile?raw';
import useGeminiHook from './snippets/useGemini.js?raw';

const heading = "font-['Playfair_Display',_serif]";

// --- SHARED DIAGRAM PIECES ---

const DIAGRAM_CSS = `
@keyframes flowDash { to { stroke-dashoffset: -24; } }
@keyframes nodeIn { from { opacity: 0; transform: scale(.5); } to { opacity: 1; transform: scale(1); } }
.flow-line { stroke-dasharray: 7 6; animation: flowDash .8s linear infinite; }
.node-in { animation: nodeIn .55s cubic-bezier(.2,.9,.25,1.3) backwards; }
`;

const NODE_STYLE = {
    idle: 'border-white/25 bg-[#5b2456]/85 text-rose-50 shadow-[0_4px_16px_rgba(20,5,25,.25)]',
    lit: 'border-pink-300/80 bg-[#8a3378]/90 text-white shadow-[0_6px_20px_rgba(244,63,94,.18)]',
    active: 'border-rose-500 bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-[0_10px_30px_rgba(244,63,94,.40)] scale-110',
    danger: 'border-red-300 bg-red-500/40 text-white shadow-[0_8px_24px_rgba(239,68,68,.30)]',
    dim: 'border-white/10 bg-[#3f1a40]/70 text-rose-100/40',
};

const useWidth = () => {
    const ref = useRef(null);
    const [w, setW] = useState(0);
    useLayoutEffect(() => {
        if (!ref.current) return;
        const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
        ro.observe(ref.current);
        return () => ro.disconnect();
    }, []);
    return [ref, w];
};

const curve = (p, q) => {
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
    return Math.abs(q.x - p.x) > Math.abs(q.y - p.y)
        ? `M${p.x} ${p.y} C${mx} ${p.y}, ${mx} ${q.y}, ${q.x} ${q.y}`
        : `M${p.x} ${p.y} C${p.x} ${my}, ${q.x} ${my}, ${q.x} ${q.y}`;
};

// Spring-physics node graph. Every node can be dragged; it springs home with a little bounce,
// its neighbours lean after it, and edges re-bend every frame. Positions live in refs and are
// written straight to the DOM, so the 60fps loop never re-renders React.
const Graph = ({ nodes, edges, height, minWidth = 640, stateOf, edgeOn, onHover, onSelect }) => {
    const [ref, w] = useWidth();
    const sim = useRef({});
    const homes = useRef({});
    const nodeEls = useRef({});
    const pathEls = useRef({});
    const drag = useRef(null);
    const [dragging, setDragging] = useState(null);

    const nbrs = useMemo(() => {
        const m = {};
        edges.forEach(([a, b]) => { (m[a] ||= []).push(b); (m[b] ||= []).push(a); });
        return m;
    }, [edges]);

    useEffect(() => {
        if (!w) return;
        nodes.forEach((n) => {
            const h = { x: (n.x / 100) * w, y: (n.y / 100) * height };
            homes.current[n.id] = h;
            if (!sim.current[n.id]) sim.current[n.id] = { ...h, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2 };
        });
    }, [w, height, nodes]);

    useEffect(() => {
        let raf;
        const t0 = performance.now();
        const tick = (now) => {
            const t = (now - t0) / 1000;
            const S = sim.current, H = homes.current, d = drag.current;
            for (const n of nodes) {
                const s = S[n.id], h = H[n.id];
                if (!s || !h || (d && d.id === n.id)) continue;
                // home + a slow idle drift + an averaged lean toward displaced neighbours
                let tx = h.x + Math.sin(t * 0.7 + s.phase) * 3;
                let ty = h.y + Math.cos(t * 0.55 + s.phase * 1.3) * 3;
                const ns = nbrs[n.id] || [];
                if (ns.length) {
                    let ox = 0, oy = 0;
                    ns.forEach((m) => { if (S[m] && H[m]) { ox += S[m].x - H[m].x; oy += S[m].y - H[m].y; } });
                    tx += (ox / ns.length) * 0.45;
                    ty += (oy / ns.length) * 0.45;
                }
                s.vx = (s.vx + (tx - s.x) * 0.07) * 0.84;
                s.vy = (s.vy + (ty - s.y) * 0.07) * 0.84;
                s.x += s.vx;
                s.y += s.vy;
            }
            for (const n of nodes) {
                const s = S[n.id], el = nodeEls.current[n.id];
                if (s && el) el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%)`;
            }
            for (const [a, b] of edges) {
                const el = pathEls.current[a + '>' + b];
                if (el && S[a] && S[b]) el.setAttribute('d', curve(S[a], S[b]));
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [nodes, edges, nbrs]);

    const local = (e) => {
        const r = ref.current.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width };
    };
    const down = (e, id) => {
        const s = sim.current[id];
        if (!s) return;
        const p = local(e);
        drag.current = { id, ox: p.x - s.x, oy: p.y - s.y, sx: e.clientX, sy: e.clientY, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(id);
        onHover?.(id);
    };
    const move = (e, id) => {
        const d = drag.current;
        if (!d || d.id !== id) return;
        if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.moved = true;
        const p = local(e), s = sim.current[id];
        s.x = Math.max(0, Math.min(p.w, p.x - d.ox));
        s.y = Math.max(0, Math.min(height, p.y - d.oy));
    };
    const up = (id) => {
        const d = drag.current;
        drag.current = null;
        setDragging(null);
        if (d && !d.moved) onSelect?.(id);
    };

    return (
        <div className="overflow-x-auto -mx-2 px-2 py-3">
            <div ref={ref} className="relative select-none" style={{ height, minWidth }}>
                <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                    {edges.map(([a, b]) => {
                        const on = edgeOn(a, b);
                        return <path key={a + '>' + b} ref={(el) => { pathEls.current[a + '>' + b] = el; }} fill="none" strokeLinecap="round"
                            strokeWidth={on ? 2.2 : 1.3} stroke={on ? 'rgba(255,175,215,.95)' : 'rgba(255,215,235,.22)'}
                            className={`transition-[stroke] duration-300 ${on ? 'flow-line' : ''}`} />;
                    })}
                </svg>
                {nodes.map((n, i) => (
                    <div key={n.id} ref={(el) => { nodeEls.current[n.id] = el; }} className="absolute left-0 top-0 will-change-transform"
                        style={{ zIndex: dragging === n.id ? 20 : 1 }}>
                        <button
                            onPointerDown={(e) => down(e, n.id)} onPointerMove={(e) => move(e, n.id)}
                            onPointerUp={() => up(n.id)} onPointerCancel={() => up(n.id)}
                            onMouseEnter={() => onHover?.(n.id)} onMouseLeave={() => { if (!drag.current) onHover?.(null); }}
                            className={`node-in whitespace-nowrap rounded-2xl border px-3.5 py-2 text-center transition-[background,border-color,color,box-shadow,transform] duration-300 ${dragging === n.id ? 'cursor-grabbing scale-110' : 'cursor-grab'} ${NODE_STYLE[stateOf(n.id)]}`}
                            style={{ animationDelay: `${i * 45}ms`, touchAction: 'none' }}>
                            <span className="block text-sm font-medium leading-tight">{n.label}</span>
                            {n.sub && <span className="block text-[10px] font-mono opacity-70 mt-0.5">{n.sub}</span>}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const InfoBar = ({ title, children }) => (
    <div className="min-h-[56px] rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md px-4 py-3 flex items-center gap-3 shadow-[0_4px_20px_rgba(244,63,94,.06)]">
        <span className="shrink-0 text-[11px] font-mono text-pink-300 uppercase tracking-wider">{title}</span>
        <span className="text-rose-100/85 text-[15px] leading-snug">{children}</span>
    </div>
);

const Panel = ({ children, className = '' }) => (
    <div className={`rounded-3xl border border-white/15 bg-white/[0.07] backdrop-blur-md p-4 sm:p-5 shadow-[0_10px_40px_rgba(244,63,94,.07)] ${className}`}>{children}</div>
);

const Section = ({ n, title, hint, children }) => (
    <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className={`${heading} italic text-3xl md:text-4xl text-white`}><span className="text-pink-300/80 not-italic font-sans text-sm mr-3">{n}</span>{title}</h2>
            {hint && <span className="flex items-center gap-1.5 text-xs text-rose-200/60"><Hand size={13} /> {hint}</span>}
        </div>
        {children}
    </section>
);

// --- 01 · SCREEN FLOW ---

const SCREENS = [
    { id: 's0', x: 9, y: 50, label: 'Intro', sub: 'step 0', parts: ['Title', 'CTA button'], line: 'One clear action per screen.' },
    { id: 's1', x: 36, y: 50, label: 'Story', sub: 'step 1', parts: ['PhotoGallery', 'GeminiMessage'], line: 'Photo deck + an AI note on demand.' },
    { id: 's2', x: 64, y: 50, label: 'Letter', sub: 'step 2', parts: ['Typewriter', 'Staged reveal'], line: 'Timers pace the text so it reads calmly.' },
    { id: 's3', x: 91, y: 50, label: 'Surprise', sub: 'step 3', parts: ['SurpriseRoom', 'Heart burst'], line: 'Each press runs a different AI prompt.' },
];
const SCREEN_EDGES = [['s0', 's1'], ['s1', 's2'], ['s2', 's3']];

const ScreenFlow = () => {
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    useEffect(() => {
        if (paused) return;
        const t = setInterval(() => setActive((a) => (a + 1) % SCREENS.length), 2200);
        return () => clearInterval(t);
    }, [paused]);
    const s = SCREENS[active];
    return (
        <Panel className="space-y-3">
            <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
                <Graph nodes={SCREENS} edges={SCREEN_EDGES} height={110} minWidth={520}
                    stateOf={(id) => { const i = SCREENS.findIndex((x) => x.id === id); return i === active ? 'active' : i < active ? 'lit' : 'idle'; }}
                    edgeOn={(a) => SCREENS.findIndex((x) => x.id === a) < active}
                    onSelect={(id) => { setActive(SCREENS.findIndex((x) => x.id === id)); setPaused(true); }} />
            </div>
            <div className="grid sm:grid-cols-[1fr_auto] gap-3">
                <InfoBar title={s.label}>
                    <span className="flex flex-wrap items-center gap-2">
                        {s.line}
                        {s.parts.map((p) => <span key={p} className="font-mono text-xs px-2 py-0.5 rounded-md bg-pink-400/30 text-pink-50">{p}</span>)}
                    </span>
                </InfoBar>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 flex items-center gap-3">
                    <span className="font-mono text-xs text-rose-100/70">step = {active}</span>
                    <span className="flex gap-1.5">
                        {SCREENS.map((x, i) => <span key={x.id} className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? 'w-6 bg-rose-500' : 'w-1.5 bg-white/25'}`} />)}
                    </span>
                </div>
            </div>
        </Panel>
    );
};

// --- 02 · COMPONENT TREE ---

const TREE = [
    { id: 'app', x: 50, y: 10, label: 'App', sub: 'step · view · audio', info: 'Holds the state. One `step` value decides which screen shows.' },
    { id: 'amb', x: 16, y: 44, label: 'Ambient', parent: 'app', info: 'Decorative layers with pointer-events: none, so they never block clicks.' },
    { id: 'scr', x: 50, y: 44, label: 'Screens', parent: 'app', info: 'Rendered conditionally from `step`. md: breakpoints make them responsive.' },
    { id: 'ctl', x: 84, y: 44, label: 'Controls', parent: 'app', info: 'Fixed-position buttons that sit above everything (z-50).' },
    { id: 'stars', x: 6, y: 76, label: 'StarField', parent: 'amb', info: '100 random stars with a CSS twinkle animation.' },
    { id: 'petals', x: 16, y: 92, label: 'Petals', parent: 'amb', info: 'Spawned on an interval, capped at 14, interval cleared on unmount.' },
    { id: 'glow', x: 26, y: 76, label: 'CursorGlow', parent: 'amb', info: 'Moves through a ref, so mouse movement never re-renders React.' },
    { id: 'gallery', x: 38, y: 76, label: 'PhotoGallery', parent: 'scr', info: 'A fanned deck: each card glides between slots with CSS transitions.' },
    { id: 'note', x: 47, y: 92, label: 'GeminiMessage', parent: 'scr', info: 'Loading state → AI note, or the fallback if the call fails.' },
    { id: 'type', x: 56, y: 76, label: 'Typewriter', parent: 'scr', info: 'A useEffect timer adds one letter at a time and cleans itself up.' },
    { id: 'surprise', x: 65, y: 92, label: 'SurpriseRoom', parent: 'scr', info: 'Each flying heart gets CSS variables for its own random path.' },
    { id: 'dots', x: 76, y: 76, label: 'StepDots', parent: 'ctl', info: 'Reads and writes the same `step`, so it is always in sync.' },
    { id: 'music', x: 85, y: 92, label: 'Music', parent: 'ctl', info: 'Starts on the first click, because browsers block autoplay.' },
    { id: 'tech', x: 94, y: 76, label: 'Tech button', parent: 'ctl', info: 'Switches `view` to this page.' },
];
const TREE_EDGES = TREE.filter((n) => n.parent).map((n) => [n.parent, n.id]);
const TREE_BY_ID = Object.fromEntries(TREE.map((n) => [n.id, n]));

const ComponentTree = () => {
    const [focus, setFocus] = useState(null);
    const chain = new Set();
    if (focus) {
        for (let n = TREE_BY_ID[focus]; n; n = TREE_BY_ID[n.parent]) chain.add(n.id);
        TREE.forEach((n) => { if (n.parent === focus) chain.add(n.id); });
    }
    const node = TREE_BY_ID[focus || 'app'];
    return (
        <Panel className="space-y-3">
            <Graph nodes={TREE} edges={TREE_EDGES} height={300} minWidth={760}
                stateOf={(id) => (!focus ? 'idle' : id === focus ? 'active' : chain.has(id) ? 'lit' : 'dim')}
                edgeOn={(a, b) => !focus || (chain.has(a) && chain.has(b))}
                onHover={setFocus} onSelect={setFocus} />
            <InfoBar title={node.label}>{node.info}</InfoBar>
        </Panel>
    );
};

// --- 03 · LAYERS (drag to rotate) ---

const LAYERS = [
    { z: 0, label: 'Background', color: 'rgba(76,29,85,.85)' },
    { z: 10, label: 'Petals', color: 'rgba(244,114,182,.55)' },
    { z: 15, label: 'Cursor glow', color: 'rgba(251,113,133,.45)' },
    { z: 30, label: 'Vignette', color: 'rgba(30,20,40,.45)' },
    { z: 40, label: 'Content', color: 'rgba(253,164,175,.65)' },
    { z: 50, label: 'Controls', color: 'rgba(255,241,242,.85)' },
];

const LayerStack = () => {
    const [open, setOpen] = useState(false);
    const [hl, setHl] = useState(null);
    const stackRef = useRef(null);
    const rot = useRef({ x: 58, z: -38, vz: 0, drag: null });

    useEffect(() => {
        let raf;
        const tick = () => {
            const r = rot.current;
            if (!r.drag) {
                r.z += r.vz;
                r.vz *= 0.95; // inertia after a flick
            }
            if (stackRef.current) stackRef.current.style.transform = `rotateX(${r.x}deg) rotateZ(${r.z}deg)`;
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);

    const down = (e) => {
        rot.current.drag = { x: e.clientX, y: e.clientY, moved: false };
        rot.current.vz = 0;
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const move = (e) => {
        const r = rot.current, d = r.drag;
        if (!d) return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
        r.z += dx * 0.5;
        r.x = Math.max(15, Math.min(80, r.x - dy * 0.3));
        r.vz = dx * 0.5;
        d.x = e.clientX;
        d.y = e.clientY;
    };
    const up = () => {
        const d = rot.current.drag;
        rot.current.drag = null;
        if (d && !d.moved) setOpen((o) => !o);
    };

    return (
        <Panel className="grid md:grid-cols-[1fr_230px] gap-4 items-center">
            <div className="h-[280px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none" style={{ perspective: '900px', touchAction: 'none' }}
                onMouseEnter={() => setOpen(true)} onMouseLeave={() => { setOpen(false); setHl(null); }}
                onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
                <div ref={stackRef} className="relative w-[190px] h-[125px]" style={{ transformStyle: 'preserve-3d' }}>
                    {LAYERS.map((l, i) => (
                        <div key={l.z} className="absolute inset-0 rounded-2xl border transition-[transform,box-shadow,border-color] duration-700 ease-[cubic-bezier(.2,.9,.25,1.2)]"
                            style={{
                                transform: `translateZ(${open ? i * 36 : i * 5}px)`, background: l.color,
                                borderColor: hl === i ? '#f43f5e' : 'rgba(244,63,94,.25)',
                                boxShadow: hl === i ? '0 0 34px rgba(244,63,94,.55)' : '0 4px 14px rgba(76,29,85,.12)',
                            }} />
                    ))}
                </div>
            </div>
            <ul className="space-y-1.5">
                {[...LAYERS].reverse().map((l) => {
                    const i = LAYERS.indexOf(l);
                    return (
                        <li key={l.z} onMouseEnter={() => { setHl(i); setOpen(true); }} onMouseLeave={() => setHl(null)}
                            className={`flex items-center justify-between rounded-xl px-3 py-1.5 text-sm transition-colors ${hl === i ? 'bg-white/15 text-white' : 'text-rose-100/70'}`}>
                            <span>{l.label}</span><span className="font-mono text-xs opacity-70">z-{l.z}</span>
                        </li>
                    );
                })}
                <li className="pt-2 text-xs text-rose-200/60">Drag to spin · hover to explode</li>
            </ul>
        </Panel>
    );
};

// --- 04 · LLM PIPELINE ---

const PIPE = [
    { id: 'click', x: 7, y: 32, label: 'Click', info: 'User presses an AI button. It disables itself so nobody double-submits.', log: 'button disabled · loading = true' },
    { id: 'prompt', x: 24, y: 32, label: 'Prompt', info: 'Template + TONE guardrail + "return only the text" rule, joined into one string.', log: 'prompt = template + TONE + format' },
    { id: 'gemini', x: 42, y: 32, label: 'Gemini', sub: '2.5 Flash', info: 'POST generateContent with temperature 1.1 for variety.', log: 'POST generateContent · temp 1.1' },
    { id: 'parse', x: 60, y: 32, label: 'Parse', info: 'Read candidates[0].content.parts[0].text from the JSON.', log: 'text = candidates[0]…parts[0].text' },
    { id: 'clean', x: 77, y: 32, label: 'Sanitize', info: 'Trim and strip wrapping quotes so the UI gets clean text.', log: 'trim() · strip quotes' },
    { id: 'render', x: 93, y: 32, label: 'Render', info: 'The card animates in and the loading state ends.', log: 'setGift(text) · loading = false' },
    { id: 'fallback', x: 68, y: 82, label: 'Fallback', sub: 'hand-written', info: 'Any error → a hand-written message. The user never sees a blank screen.', log: 'catch → return fallback' },
];
const PIPE_EDGES = [['click', 'prompt'], ['prompt', 'gemini'], ['gemini', 'parse'], ['parse', 'clean'], ['clean', 'render'], ['gemini', 'fallback'], ['fallback', 'render']];
const PIPE_BY_ID = Object.fromEntries(PIPE.map((n) => [n.id, n]));
const PROMPT_PARTS = [['Template', 'what to write'], ['TONE', 'guardrail rules'], ['Format', 'only the final text']];

const LlmPipeline = () => {
    const [fail, setFail] = useState(false);
    const [seq, setSeq] = useState([]);
    const [idx, setIdx] = useState(-1);
    const [hover, setHover] = useState(null);

    useEffect(() => {
        if (idx < 0 || idx >= seq.length - 1) return;
        const t = setTimeout(() => setIdx((i) => i + 1), 700);
        return () => clearTimeout(t);
    }, [idx, seq]);

    const run = () => {
        setSeq(fail ? ['click', 'prompt', 'gemini', 'fallback', 'render'] : ['click', 'prompt', 'gemini', 'parse', 'clean', 'render']);
        setIdx(0);
    };
    const visited = new Set(seq.slice(0, idx + 1));
    const current = seq[idx];
    const running = idx >= 0 && idx < seq.length - 1;
    const done = idx >= 0 && idx === seq.length - 1;
    const litEdge = new Set(seq.slice(0, idx).map((a, i) => a + '>' + seq[i + 1]));
    const geminiFailed = fail && visited.has('fallback');

    const stateOf = (id) => {
        if (id === 'gemini' && geminiFailed) return 'danger';
        if (id === current || id === hover) return 'active';
        if (visited.has(id)) return 'lit';
        return idx >= 0 ? 'dim' : 'idle';
    };
    const shown = PIPE_BY_ID[hover || current || 'click'];
    const promptLit = visited.has('prompt') || hover === 'prompt';

    return (
        <Panel className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <button onClick={run} disabled={running}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm shadow-[0_6px_20px_rgba(244,63,94,.35)] hover:shadow-[0_8px_28px_rgba(244,63,94,.45)] transition-all disabled:opacity-40">
                    {done ? <RotateCcw size={15} /> : <Play size={15} />} {done ? 'Run again' : 'Send request'}
                </button>
                <button onClick={() => { setFail((f) => !f); setIdx(-1); setSeq([]); }} disabled={running}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-colors disabled:opacity-40 ${fail ? 'border-red-300 text-red-100 bg-red-500/25' : 'border-white/15 text-rose-100/70 bg-white/10 hover:border-pink-300/60'}`}>
                    {fail ? <ZapOff size={15} /> : <Zap size={15} />} {fail ? 'Failure mode: on' : 'Simulate a failure'}
                </button>
            </div>

            <Graph nodes={PIPE} edges={PIPE_EDGES} height={190} minWidth={680} stateOf={stateOf}
                edgeOn={(a, b) => litEdge.has(a + '>' + b)} onHover={setHover} />

            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-rose-200/60 mr-1 font-mono">prompt =</span>
                {PROMPT_PARTS.map(([t, s], i) => (
                    <React.Fragment key={t}>
                        {i > 0 && <span className="text-rose-300">+</span>}
                        <span className={`rounded-xl border px-3 py-1.5 text-xs transition-all duration-500 ${promptLit ? 'border-pink-300/80 bg-pink-400/30 text-white -translate-y-0.5 shadow-[0_4px_14px_rgba(244,63,94,.15)]' : 'border-white/15 bg-white/10 text-rose-200/60'}`}>
                            <span className="font-medium">{t}</span> <span className="opacity-70">· {s}</span>
                        </span>
                    </React.Fragment>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-3">
                <InfoBar title={shown.label}>{shown.info}</InfoBar>
                <div className="min-h-[56px] rounded-2xl bg-[#2b1530] px-4 py-3 font-mono text-xs space-y-1">
                    {idx < 0 && <p className="text-rose-100/70">// press "Send request"</p>}
                    {seq.slice(0, idx + 1).map((id) => (
                        <p key={id} className={`node-in ${id === 'gemini' && geminiFailed ? 'text-red-300' : 'text-[#f6e3f0]'}`}>
                            <span className="text-rose-400">→</span> {id === 'gemini' && geminiFailed ? 'POST generateContent · ✕ network / 401' : PIPE_BY_ID[id].log}
                        </p>
                    ))}
                    {done && (
                        <p className="node-in pt-1 text-pink-200 font-sans text-sm italic">
                            “{fail ? 'Sorry, I could not reach the assistant. Please try again.' : 'Oops, my apologies for getting a bit too excited and calling so often, totally my bad.'}”
                        </p>
                    )}
                </div>
            </div>
        </Panel>
    );
};

// --- 05 · DEMO vs ENTERPRISE ARCHITECTURE ---

const ARCH = {
    demo: {
        nodes: [
            { id: 'browser', x: 22, y: 50, label: 'Browser', sub: 'React app', info: 'All the UI and the Gemini call run on the visitor’s device.' },
            { id: 'gem', x: 78, y: 50, label: 'Gemini API', sub: 'generateContent', info: 'Called directly, with the API key inside the page.' },
        ],
        edges: [['browser', 'gem']],
    },
    ent: {
        nodes: [
            { id: 'user', x: 6, y: 50, label: 'User', sub: 'Google SSO', info: 'Signs in through IAP or Firebase Auth. Role-based views follow.' },
            { id: 'ui', x: 26, y: 50, label: 'Angular 20', sub: 'signals · router', info: 'TypeScript strict, lazy routes, signals for state. No secrets here.' },
            { id: 'api', x: 52, y: 50, label: 'FastAPI', sub: 'Cloud Run', info: 'Owns the prompts and guardrails. Validates input, calls the model.' },
            { id: 'vertex', x: 84, y: 12, label: 'Vertex AI', sub: 'Gemini', info: 'Auth through the Cloud Run service account, with no key in code.' },
            { id: 'secret', x: 84, y: 37, label: 'Secret Manager', info: 'Any other secrets (DB passwords, third-party keys).' },
            { id: 'log', x: 84, y: 63, label: 'Cloud Logging', info: 'Errors and request traces, with alerts.' },
            { id: 'bq', x: 84, y: 88, label: 'BigQuery', sub: 'usage metrics', info: 'Latency, tokens and feedback feed the dashboards.' },
            { id: 'ci', x: 52, y: 88, label: 'Cloud Build', sub: 'tests · deploy', info: 'Unit + Playwright tests run on every push, then deploy.' },
        ],
        edges: [['user', 'ui'], ['ui', 'api'], ['api', 'vertex'], ['api', 'secret'], ['api', 'log'], ['api', 'bq'], ['ci', 'api']],
    },
};
const ENT_PILLS = ['TypeScript strict', 'Lazy routes', 'Streaming replies', 'Playwright tests', 'WCAG 2.1 AA', 'Rate limiting'];

const Architecture = () => {
    const [mode, setMode] = useState('demo');
    const [hover, setHover] = useState(null);
    const { nodes, edges } = ARCH[mode];
    const touches = (id) => !hover || id === hover || edges.some(([a, b]) => (a === hover && b === id) || (b === hover && a === id));
    const info = nodes.find((n) => n.id === hover);
    return (
        <Panel className="space-y-3">
            <div className="inline-flex rounded-full border border-white/15 p-1 bg-white/10">
                {[['demo', 'This demo'], ['ent', 'Enterprise on GCP']].map(([m, l]) => (
                    <button key={m} onClick={() => { setMode(m); setHover(null); }}
                        className={`px-4 py-1.5 rounded-full text-sm transition-all duration-300 ${mode === m ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-[0_4px_14px_rgba(244,63,94,.35)]' : 'text-rose-100/70 hover:text-white'}`}>{l}</button>
                ))}
            </div>
            <Graph key={mode} nodes={nodes} edges={edges} height={mode === 'demo' ? 150 : 300} minWidth={680}
                stateOf={(id) => (hover === id ? 'active' : touches(id) ? (mode === 'demo' && id === 'gem' ? 'danger' : 'lit') : 'dim')}
                edgeOn={(a, b) => !hover || a === hover || b === hover} onHover={setHover} onSelect={setHover} />
            {info ? <InfoBar title={info.label}>{info.info}</InfoBar> : mode === 'demo'
                ? <InfoBar title="Risk">The API key travels to every visitor's browser. Fine for a demo, not for a real product.</InfoBar>
                : (
                    <div className="flex flex-wrap gap-2">
                        {ENT_PILLS.map((p, i) => <span key={p} className="node-in text-xs px-3 py-1 rounded-full border border-white/25 bg-white/10 text-rose-50" style={{ animationDelay: `${300 + i * 60}ms` }}>{p}</span>)}
                    </div>
                )}
        </Panel>
    );
};

// --- 06 · PROJECT MAPPING ---

const CONCEPTS = [
    { id: 'flow', label: 'Step flow', info: 'One state picks the screen → wizards, role-based views, assessments.' },
    { id: 'tpl', label: 'Prompt templates', info: 'One prompt per action → quick replies, intent routing, drafting.' },
    { id: 'guard', label: 'Guardrail prompt', info: 'Shared rules on every call → chatbot filters, tone, scope limits.' },
    { id: 'fb', label: 'Fallbacks', info: 'Never a blank screen → reliable support tools.' },
    { id: 'load', label: 'Loading states', info: 'Spinners + disabled buttons → no double submits.' },
    { id: 'chat', label: 'Chat UI', info: 'Messages + quick replies + input → every chatbot project.' },
];
const PROJECTS = [
    { id: 'perf', label: 'Performance platform', fit: 'Strong', uses: ['flow', 'fb', 'load'], stack: 'Angular 19 · FastAPI · Cloud SQL, BigQuery, Vertex AI', why: 'Role-based views = step-driven screens. Insight cards = AI cards with loading + fallback.' },
    { id: 'assess', label: 'Adaptive assessment', fit: 'Medium', uses: ['flow', 'load'], stack: 'Angular 19 · FastAPI, Docker · Cloud Run, Gemini', why: 'Question-by-question flow = this step flow with progress dots.' },
    { id: 'vsse', label: 'Virtual Sr. Support Engineer', fit: 'Strongest', uses: ['tpl', 'guard', 'fb', 'chat'], stack: 'Angular 20 + Streamlit · FastAPI · Vertex AI, BigQuery', why: 'This app is a mini version of its chatbot core. The Angular chat code below is its starting point.' },
    { id: 'silence', label: 'Silence Gap continuity', fit: 'Medium', uses: ['tpl', 'guard'], stack: 'Apps Script · BigQuery, Gemini', why: 'The same fetch → parse → clean pipeline, in Apps Script with UrlFetchApp.' },
    { id: 'crado', label: 'CRADO drafting', fit: 'Medium', uses: ['tpl', 'guard'], stack: 'Gemini Enterprise · FastAPI, ADK, A2A · AlloyDB', why: 'Drafting emails under strict rules = constrained prompts.' },
    { id: 'agent', label: 'Agent productivity', fit: 'Strong', uses: ['tpl', 'chat', 'load'], stack: 'Angular 20 · FastAPI · Cloud Run, Vertex AI', why: 'Context-aware quick responses = rotating prompt templates + quick-reply chips.' },
    { id: 'billing', label: 'Billing resolution', fit: 'Strong', uses: ['guard', 'chat', 'fb'], stack: 'Angular 20 · FastAPI · Cloud Run, Vertex AI', why: 'Chatbot filters that restrict paths = the guardrail sent with every call.' },
    { id: 'queue', label: 'Queue segmentation', fit: 'Medium', uses: ['tpl'], stack: 'Stack not readable in the photo', why: 'Picking a prompt per action is the simple form of intent routing.' },
];
const MAP_NODES = [
    ...CONCEPTS.map((c, i) => ({ ...c, x: 15, y: 9 + i * 16.4 })),
    ...PROJECTS.map((p, i) => ({ ...p, x: 76, y: 6 + i * 12.6 })),
];
const MAP_EDGES = PROJECTS.flatMap((p) => p.uses.map((c) => [c, p.id]));
const FIT_STYLE = { Strongest: 'bg-gradient-to-r from-rose-500 to-pink-500 text-white', Strong: 'bg-pink-400/30 text-pink-50', Medium: 'bg-white/10 text-rose-100' };

const ProjectMap = () => {
    const [sel, setSel] = useState('vsse');
    const [hover, setHover] = useState(null);
    const focus = hover || sel;
    const linked = new Set([focus, ...MAP_EDGES.filter(([a, b]) => a === focus || b === focus).flat()]);
    const project = PROJECTS.find((p) => p.id === focus);
    const concept = CONCEPTS.find((c) => c.id === focus);
    return (
        <Panel className="space-y-3">
            <div className="flex justify-between text-xs text-rose-200/60 px-1"><span>This app</span><span className="mr-[10%]">Your GCP projects</span></div>
            <Graph nodes={MAP_NODES} edges={MAP_EDGES} height={430} minWidth={620}
                stateOf={(id) => (id === focus ? 'active' : linked.has(id) ? 'lit' : 'dim')}
                edgeOn={(a, b) => a === focus || b === focus} onHover={setHover} onSelect={setSel} />
            {project && (
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-white font-medium">{project.label}</span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full ${FIT_STYLE[project.fit]}`}>{project.fit} match</span>
                    </div>
                    <p className="text-[11px] font-mono text-rose-200/60">{project.stack}</p>
                    <p className="text-rose-100/85 text-[15px]">{project.why}</p>
                </div>
            )}
            {concept && <InfoBar title={concept.label}>{concept.info}</InfoBar>}
            <p className="text-xs text-rose-200/60">Stacks were read from a photo of the project sheet, so double-check them.</p>
        </Panel>
    );
};

// --- 07 · CODE ---

const SNIPPETS = [
    { file: 'chat.component.ts', lang: 'Angular 20', where: 'src/app/chat/chat.component.ts', code: chatComponent },
    { file: 'gemini.service.ts', lang: 'Angular 20', where: 'src/app/chat/gemini.service.ts', code: geminiService },
    { file: 'app.config.ts', lang: 'Angular 20', where: 'src/app/app.config.ts', code: appConfig },
    { file: 'main.py', lang: 'FastAPI', where: 'backend/main.py', code: mainPy },
    { file: 'Dockerfile', lang: 'Cloud Run', where: 'backend/Dockerfile', code: dockerfile },
    { file: 'useGemini.js', lang: 'React', where: 'src/hooks/useGemini.js', code: useGeminiHook },
];
const SETUP = [
    { id: 'a', x: 11, y: 50, label: 'ng new support-chat', sub: 'create the app' },
    { id: 'b', x: 37, y: 50, label: 'Paste the files', sub: 'tabs below' },
    { id: 'c', x: 63, y: 50, label: 'uvicorn + ng serve', sub: 'run both' },
    { id: 'd', x: 89, y: 50, label: 'gcloud run deploy', sub: 'ship it' },
];
const SETUP_EDGES = [['a', 'b'], ['b', 'c'], ['c', 'd']];

const CodeBlock = () => {
    const [active, setActive] = useState(0);
    const [copied, setCopied] = useState(false);
    const snip = SNIPPETS[active];
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(snip.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch (e) {
            console.error('Copy failed', e);
        }
    };
    return (
        <div className="rounded-2xl overflow-hidden bg-[#2b1530] shadow-[0_20px_50px_rgba(59,24,56,.28)]">
            <div className="flex gap-1 overflow-x-auto border-b border-white/10 p-2" role="tablist">
                {SNIPPETS.map((s, i) => (
                    <button key={s.file} role="tab" aria-selected={i === active} onClick={() => { setActive(i); setCopied(false); }}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-mono transition-colors ${i === active ? 'bg-white/10 text-white' : 'text-rose-200/60 hover:text-white'}`}>
                        {s.file}
                    </button>
                ))}
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/10 text-xs">
                <span className="text-rose-200/60 font-mono truncate">{snip.lang} → <span className="text-pink-300">{snip.where}</span></span>
                <button onClick={copy} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white transition-transform active:scale-95">
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy code'}
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed text-[#f6e3f0] font-mono max-h-[460px]"><code>{snip.code}</code></pre>
        </div>
    );
};

// --- PAGE ---

const STACK = ['React 19', 'Vite 7', 'Tailwind 3', 'Gemini 2.5 Flash', 'lucide-react'];

export default function TechPage({ onBack }) {
    return (
        <div className="w-full max-w-5xl text-left space-y-14 font-sans animate-in fade-in duration-700">
            <style>{DIAGRAM_CSS}</style>
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-pink-300 hover:text-white transition-colors">
                <ArrowLeft size={16} /> Back to the letter
            </button>

            <header className="space-y-3">
                <h1 className={`${heading} italic text-4xl md:text-6xl text-white`}>How this app works</h1>
                <p className="text-rose-100/70">Everything here is alive. Drag any node, hover, tap or press play.</p>
                <div className="flex flex-wrap gap-2">
                    {STACK.map((t) => <span key={t} className="px-3 py-1 rounded-full text-xs border border-white/25 bg-white/10 text-rose-50">{t}</span>)}
                </div>
            </header>

            <Section n="01" title="UI flow" hint="drag · click a screen"><ScreenFlow /></Section>
            <Section n="02" title="Component tree" hint="drag · hover a node"><ComponentTree /></Section>
            <Section n="03" title="Layers" hint="drag to spin · hover to explode"><LayerStack /></Section>
            <Section n="04" title="The Gemini call" hint="send a request · try a failure"><LlmPipeline /></Section>
            <Section n="05" title="Demo → enterprise" hint="toggle · drag a service"><Architecture /></Section>
            <Section n="06" title="Fit with your projects" hint="drag · click a project"><ProjectMap /></Section>

            <Section n="07" title="Starter code">
                <Panel>
                    <Graph nodes={SETUP} edges={SETUP_EDGES} height={90} minWidth={600} stateOf={() => 'lit'} edgeOn={() => true} />
                </Panel>
                <CodeBlock />
            </Section>

            <button onClick={onBack} className="flex items-center gap-2 text-sm text-pink-300 hover:text-white transition-colors pb-8">
                <ArrowLeft size={16} /> Back to the letter
            </button>
        </div>
    );
}
