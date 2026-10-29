import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Sparkles, Feather, Music, ChevronRight, ChevronLeft, Send, Gift, Code } from 'lucide-react';
import TechPage from './TechPage.jsx';

// --- CONFIGURATION ---
const PHOTOS = [
    "/photo1.jpg",
    "/photo2.jpg",
    "/new-zealand.jpg"
];

// Set VITE_GEMINI_API_KEY in .env.local (git-ignored) — never commit the key
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Keeps every AI-written line sweet, sincere and pressure-free
const TONE = " Context: they are colleagues at Aiden, and she has clearly said she is not looking to date anyone and wants to focus on her first project. He fully accepts and agrees with that. Keep it gentle, warm and respectful — not romantic, no pressure, no guilt-tripping, no hoping for a relationship, no asking her to reply.";

const THEME = {
    bg: "bg-[#0a0710]",
    textMain: "text-rose-50/70",
    fontHeading: "font-['Playfair_Display',_serif]",
    fontBody: "font-['EB_Garamond',_serif]",
    fontScript: "font-['Dancing_Script',_cursive]",
};

// Shared Gemini helper — returns clean single-message text (no numbered "options" noise)
const callGemini = async (prompt, fallback) => {
    try {
        const res = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt + " Return only the final message text — no preamble, no options, no numbering, no quotation marks." }] }],
                generationConfig: { temperature: 1.1 }
            })
        });
        const data = await res.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
            // strip stray wrapping quotes if the model adds them
            text = text.replace(/^["'“”]+|["'“”]+$/g, '').trim();
            return text;
        }
        return fallback;
    } catch (e) {
        console.error(e);
        return fallback;
    }
};

// --- AMBIENT LAYERS ---

// Soft night sky with a gentle glow
const StarField = () => {
    const [stars, setStars] = useState([]);
    useEffect(() => {
        setStars(Array.from({ length: 100 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 1.6 + 0.5,
            opacity: Math.random() * 0.5,
            animationDuration: Math.random() * 4 + 3 + 's',
            delay: Math.random() * 6 + 's'
        })));
    }, []);
    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[70vw] h-[70vw] rounded-full bg-rose-300/5 blur-[120px]" />
            {stars.map((s) => (
                <div key={s.id} className="absolute rounded-full bg-rose-100"
                    style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.size}px`, height: `${s.size}px`, opacity: s.opacity, animation: `twinkle ${s.animationDuration} infinite ${s.delay}` }} />
            ))}
            <style>{`@keyframes twinkle {0%,100%{opacity:.1;transform:scale(1)}50%{opacity:.6;transform:scale(1.1)}}`}</style>
        </div>
    );
};

// Drifting petals
const Petals = () => {
    const [petals, setPetals] = useState([]);
    useEffect(() => {
        const t = setInterval(() => {
            setPetals((prev) => prev.length >= 14 ? prev : [...prev, {
                id: Date.now() + Math.random(), x: Math.random() * 100,
                speed: (Math.random() * 12 + 14) + 's', scale: Math.random() * 0.5 + 0.4, sway: (Math.random() * 6 + 4) + 's'
            }]);
        }, 2500);
        return () => clearInterval(t);
    }, []);
    return (
        <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
            {petals.map((p) => (
                <div key={p.id} className="absolute top-[-60px]" style={{ left: `${p.x}%`, transform: `scale(${p.scale})`, animation: `petalFall ${p.speed} linear forwards` }}>
                    <div className="w-4 h-5 bg-gradient-to-br from-rose-300/70 via-rose-400/60 to-rose-500/50 shadow-[0_0_10px_rgba(244,114,182,0.3)]"
                        style={{ borderRadius: '100% 0 100% 0', animation: `petalSway ${p.sway} ease-in-out infinite` }} />
                </div>
            ))}
            <style>{`
                @keyframes petalFall {0%{transform:translateY(0) scale(1);opacity:0}10%{opacity:.9}100%{transform:translateY(115vh) scale(.6);opacity:0}}
                @keyframes petalSway {0%,100%{transform:translateX(-12px) rotate(-25deg)}50%{transform:translateX(12px) rotate(25deg)}}
            `}</style>
        </div>
    );
};

// A cursor-following warm glow, for a living, cinematic feel
const CursorGlow = () => {
    const ref = useRef(null);
    useEffect(() => {
        const move = (e) => {
            if (ref.current) {
                ref.current.style.left = e.clientX + 'px';
                ref.current.style.top = e.clientY + 'px';
            }
        };
        window.addEventListener('mousemove', move);
        return () => window.removeEventListener('mousemove', move);
    }, []);
    return <div ref={ref} className="fixed z-[15] pointer-events-none w-[400px] h-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-400/[0.06] blur-[80px]" style={{ left: '50%', top: '50%' }} />;
};

// --- PHOTO GALLERY ---
// A fanned deck of polaroids: every photo is visible, the front one glides to centre
const CARD_SLOTS = [
    { transform: 'translateX(-50%) rotate(-1deg) scale(1)', zIndex: 30 },
    { transform: 'translateX(-10%) rotate(8deg) scale(.84)', zIndex: 20 },
    { transform: 'translateX(-90%) rotate(-9deg) scale(.84)', zIndex: 10 },
];

const PhotoGallery = () => {
    const [front, setFront] = useState(0);
    const [paused, setPaused] = useState(false);
    const captions = ["Sorry for all the chaos, Tanvi 🙈", "Same admiration — minus the obsession", "Peace and calm, just like you deserve 🏔️"];
    useEffect(() => {
        if (paused) return;
        const t = setInterval(() => setFront((f) => (f + 1) % PHOTOS.length), 4500);
        return () => clearInterval(t);
    }, [paused]);
    const step = (d) => setFront((f) => (f + d + PHOTOS.length) % PHOTOS.length);
    return (
        <div className="w-full max-w-md mx-auto" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div className="relative w-full" style={{ aspectRatio: '1 / 0.92' }}>
                {PHOTOS.map((src, idx) => {
                    const slot = CARD_SLOTS[(idx - front + PHOTOS.length) % PHOTOS.length];
                    const isFront = idx === front;
                    return (
                        <button key={src} onClick={() => setFront(idx)} aria-label={`Show photo ${idx + 1}`}
                            className="absolute left-1/2 top-0 w-[58%] bg-[#f5efe6] p-3 pb-12 rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.55)] origin-bottom transition-all duration-700 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-1"
                            style={{ transform: slot.transform, zIndex: slot.zIndex, filter: isFront ? 'none' : 'brightness(.82)' }}>
                            <div className="w-full aspect-[3/4] overflow-hidden bg-[#e9e0d4]">
                                <img src={src} alt={`Memory ${idx + 1}`} className="w-full h-full object-cover sepia-[0.12]" draggable={false} />
                            </div>
                            <p className={`${THEME.fontScript} absolute bottom-2.5 left-0 w-full text-center px-2 text-stone-700 leading-tight transition-all duration-500 ${isFront ? 'text-lg' : 'text-sm opacity-70'}`}>{captions[idx]}</p>
                        </button>
                    );
                })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4">
                <button onClick={() => step(-1)} aria-label="Previous photo" className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-rose-100 transition-colors"><ChevronLeft size={18} /></button>
                <div className="flex gap-2">
                    {PHOTOS.map((_, idx) => (
                        <button key={idx} onClick={() => setFront(idx)} aria-label={`Go to photo ${idx + 1}`}
                            className={`h-2 rounded-full transition-all duration-500 ${idx === front ? 'w-6 bg-rose-300' : 'w-2 bg-rose-200/30'}`} />
                    ))}
                </div>
                <button onClick={() => step(1)} aria-label="Next photo" className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-rose-100 transition-colors"><ChevronRight size={18} /></button>
            </div>
        </div>
    );
};

// --- "A tiny sorry note" (live Gemini) ---
const GeminiMessage = () => {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const generate = async () => {
        setLoading(true); setMessage("");
        const text = await callGemini(
            "Write a short, cute and sincere 2-sentence apology from Suprith to Tanvi. He got over-excited, called her too many times and made her uncomfortable — he is truly sorry and completely respects her decision." + TONE,
            "I'm sorry I let my excitement get louder than your comfort, Tanvi. You deserve calm and space to focus, and I fully respect that."
        );
        setMessage(text); setLoading(false);
    };
    return (
        <div className="mt-8 w-full max-w-md mx-auto">
            {!message ? (
                <button onClick={generate} disabled={loading}
                    className="w-full group relative px-6 py-3 bg-rose-950/30 hover:bg-rose-900/30 border border-rose-400/20 rounded-xl transition-all overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-400/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <span className={`${THEME.fontBody} flex items-center justify-center gap-2 text-rose-100/80 group-hover:text-rose-50 transition-colors text-lg tracking-wide`}>
                        {loading ? <Sparkles className="animate-spin" size={18} /> : <Heart size={18} />}
                        {loading ? "Writing it carefully..." : "A tiny sorry note"}
                    </span>
                </button>
            ) : (
                <div className="bg-rose-950/25 border border-rose-400/20 p-6 rounded-xl animate-in fade-in zoom-in duration-500 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-rose-300/50 to-transparent" />
                    <p className={`${THEME.fontBody} text-rose-100/90 italic leading-relaxed text-center text-lg`}>"{message}"</p>
                    <div className="mt-4 flex justify-center">
                        <button onClick={generate} className="text-xs text-rose-400/70 hover:text-rose-300 flex items-center gap-1 uppercase tracking-widest">
                            <Heart size={12} /> One more note
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- TYPEWRITER ---
const Typewriter = ({ text, delay = 40, onComplete }) => {
    const [displayed, setDisplayed] = useState('');
    const [index, setIndex] = useState(0);
    useEffect(() => {
        if (index < text.length) {
            const t = setTimeout(() => { setDisplayed((p) => p + text.charAt(index)); setIndex((p) => p + 1); }, delay);
            return () => clearTimeout(t);
        } else if (onComplete) onComplete();
    }, [index, text, delay, onComplete]);
    return <span>{displayed}</span>;
};

// --- THE SURPRISE: pressable heart that generates a live note each time ---
const GIFTS = [
    { key: 'sorry', label: 'A tiny sorry', prompt: "Write one short, cute, sincere sentence from Suprith apologising to Tanvi for calling her too many times and getting over-excited." + TONE },
    { key: 'promise', label: 'A promise', prompt: "Write a short, sincere 2-sentence promise from Suprith to Tanvi: he respects her decision, will give her space to focus on her first project, and will never make her feel pressured again." + TONE },
    { key: 'thanks', label: 'A thank you', prompt: "Write a short, warm 2-sentence thank-you from Suprith to Tanvi for being honest with him, and for still valuing the bond they built as colleagues at Aiden." + TONE },
    { key: 'smile', label: 'Something to make you smile', prompt: "Write one short, sweet, slightly self-teasing line from Suprith to make Tanvi smile — for example joking that his phone is now on a strict no-spam-calling diet." + TONE },
];

const SurpriseRoom = () => {
    const [gift, setGift] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hearts, setHearts] = useState([]);
    const [count, setCount] = useState(0);

    const burst = useCallback(() => {
        const batch = Array.from({ length: 16 }).map((_, i) => ({
            id: Date.now() + i,
            x: (Math.random() - 0.5) * 320,
            y: -(Math.random() * 260 + 120),
            rot: (Math.random() - 0.5) * 120,
            scale: Math.random() * 0.7 + 0.5,
            dur: Math.random() * 0.8 + 1.1,
        }));
        setHearts((prev) => [...prev, ...batch]);
        setTimeout(() => setHearts((prev) => prev.slice(batch.length)), 2200);
    }, []);

    const press = async () => {
        if (loading) return;
        burst();
        setLoading(true);
        const pick = GIFTS[count % GIFTS.length];
        setCount((c) => c + 1);
        const fallbacks = {
            sorry: "Sorry for turning your phone into a missed-call museum, Tanvi — that was way too much, and it's completely on me. 🙈",
            promise: "I promise to respect your decision and give you all the space you need to shine in your first project. No pressure, ever again.",
            thanks: "Thank you for being honest with me, even when it wasn't easy — and for still valuing the bond we have. That means a lot.",
            smile: "Update: my phone has been put on a strict no-spam-calling diet. It's sulking, but it's learning. 📵",
        };
        const text = await callGemini(pick.prompt, fallbacks[pick.key]);
        setGift({ label: pick.label, text });
        setLoading(false);
    };

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center animate-in fade-in duration-1000">
            <p className="text-sm text-rose-200/50 font-light tracking-[0.35em] uppercase mb-3">A little something, just for you</p>
            <h2 className={`${THEME.fontHeading} italic text-4xl md:text-6xl text-rose-50 mb-4`}>Press the sorry heart, Tanvi</h2>
            <p className={`${THEME.fontBody} text-rose-100/65 text-lg mb-10 max-w-lg`}>
                Each press gives you something small — a sorry, a promise, a thank you, or just something to make you smile.
            </p>

            {/* Heart button + burst */}
            <div className="relative mb-10">
                {hearts.map((h) => (
                    <Heart key={h.id} size={22} fill="currentColor"
                        className="absolute left-1/2 top-1/2 text-rose-400 pointer-events-none"
                        style={{ '--tx': `${h.x}px`, '--ty': `${h.y}px`, '--rot': `${h.rot}deg`, '--sc': h.scale, animation: `heartFly ${h.dur}s ease-out forwards` }} />
                ))}
                <button onClick={press} disabled={loading}
                    className="relative group w-32 h-32 rounded-full flex items-center justify-center transition-transform active:scale-90 hover:scale-105">
                    <span className="absolute inset-0 rounded-full bg-rose-500/30 blur-xl animate-pulse" />
                    <span className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-500 via-rose-600 to-purple-700 shadow-[0_0_40px_rgba(244,63,94,0.5)]" />
                    <span className="absolute -inset-2 rounded-full border border-rose-300/30 animate-[ping_2.5s_ease-out_infinite]" />
                    <Heart size={54} fill="currentColor" className={`relative text-rose-50 ${loading ? 'animate-ping' : 'group-hover:scale-110 transition-transform'}`} />
                </button>
            </div>

            {/* Generated note card */}
            <div className="min-h-[130px] w-full flex items-center justify-center">
                {loading && (
                    <p className={`${THEME.fontBody} text-rose-200/70 italic text-lg flex items-center gap-2`}>
                        <Sparkles className="animate-spin" size={18} /> writing something for you...
                    </p>
                )}
                {!loading && gift && (
                    <div key={gift.text} className="bg-[#150c19]/70 backdrop-blur-xl border border-rose-300/15 px-8 py-7 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in duration-500 relative overflow-hidden max-w-xl">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-rose-400/60 to-transparent" />
                        <p className="text-[11px] text-rose-300/60 uppercase tracking-[0.3em] mb-3">{gift.label}</p>
                        <p className={`${THEME.fontBody} text-rose-50/90 italic leading-relaxed text-xl`}>{gift.text}</p>
                    </div>
                )}
                {!loading && !gift && (
                    <p className={`${THEME.fontBody} text-rose-200/40 italic text-lg`}>go on… this one won't call you, I promise 🙈</p>
                )}
            </div>
            <p className={`${THEME.fontBody} mt-10 text-rose-100/50 italic text-base max-w-md`}>
                No reply needed. I just wanted you to know I'm truly sorry. 🌸
            </p>
            <style>{`@keyframes heartFly {0%{transform:translate(-50%,-50%) scale(.2);opacity:0}15%{opacity:1}100%{transform:translate(calc(-50% + var(--tx)),calc(-50% + var(--ty))) rotate(var(--rot)) scale(var(--sc));opacity:0}}`}</style>
        </div>
    );
};

// Progress dots
const StepDots = ({ step, setStep }) => (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
        {[0, 1, 2, 3].map((s) => (
            <button key={s} onClick={() => setStep(s)} aria-label={`Go to scene ${s + 1}`}
                className={`h-2 rounded-full transition-all duration-500 ${step === s ? 'w-8 bg-rose-300' : 'w-2 bg-rose-200/25 hover:bg-rose-200/50'}`} />
        ))}
    </div>
);

// --- MAIN APP ---
export default function App() {
    const [step, setStep] = useState(0); // 0 intro, 1 what happened, 2 letter, 3 surprise
    const [view, setView] = useState(() => (window.location.hash === '#tech' ? 'tech' : 'story')); // 'story' | 'tech'
    const [audioPlaying, setAudioPlaying] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Dancing+Script:wght@400;600;700&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => document.head.removeChild(link);
    }, []);

    useEffect(() => {
        audioRef.current = new Audio('/music-box.wav');
        audioRef.current.loop = true;
        audioRef.current.volume = 0.16;
        const play = () => {
            if (audioRef.current && audioRef.current.paused) {
                audioRef.current.play().then(() => setAudioPlaying(true)).catch(e => console.log("Autoplay prevented", e));
            }
        };
        window.addEventListener('click', play, { once: true });
        return () => { if (audioRef.current) audioRef.current.pause(); };
    }, []);

    const toggleAudio = () => {
        if (!audioRef.current) return;
        if (audioPlaying) audioRef.current.pause(); else audioRef.current.play();
        setAudioPlaying(!audioPlaying);
    };

    return (
        <div className={`min-h-screen w-full overflow-hidden relative ${THEME.bg} ${THEME.textMain} ${THEME.fontBody} selection:bg-rose-500/30`}>
            <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#140a16] via-[#0a0710] to-[#050308]" />
            <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(244,114,182,0.08),transparent_60%)]" />

            <StarField />
            <Petals />
            <CursorGlow />

            <div className="fixed inset-0 z-30 pointer-events-none shadow-[inset_0_0_200px_80px_rgba(0,0,0,0.7)]" />

            {/* Dusk-rose canvas with drifting colour blobs for the technical page */}
            <div className={`fixed inset-0 z-[35] pointer-events-none overflow-hidden bg-gradient-to-br from-[#4a1942] via-[#6a2860] to-[#35225f] transition-opacity duration-700 ${view === 'tech' ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute -top-40 -left-32 w-[640px] h-[640px] rounded-full bg-pink-500/30 blur-[130px] animate-[blobA_18s_ease-in-out_infinite]" />
                <div className="absolute top-1/3 -right-40 w-[560px] h-[560px] rounded-full bg-fuchsia-500/25 blur-[130px] animate-[blobB_22s_ease-in-out_infinite]" />
                <div className="absolute -bottom-48 left-1/4 w-[620px] h-[620px] rounded-full bg-violet-500/25 blur-[140px] animate-[blobA_26s_ease-in-out_infinite_reverse]" />
                <style>{`
                    @keyframes blobA {0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(120px,80px) scale(1.15)}}
                    @keyframes blobB {0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-140px,-60px) scale(1.1)}}
                `}</style>
            </div>

            <button onClick={toggleAudio} className={`fixed top-6 right-6 z-50 transition-colors ${view === 'tech' ? 'text-rose-100/60 hover:text-white' : 'text-rose-100/40 hover:text-rose-100'}`} aria-label="Toggle music">
                {audioPlaying ? <Music className="animate-pulse" /> : <Music className="opacity-50" />}
            </button>

            {view === 'story' && (
                <button onClick={() => { setView('tech'); window.scrollTo(0, 0); }}
                    className="group fixed top-4 left-4 sm:top-5 sm:left-5 z-50 flex items-center gap-3 px-5 py-3 sm:px-7 sm:py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 text-white font-sans text-base sm:text-lg font-semibold tracking-wide shadow-[0_10px_35px_rgba(244,63,94,0.45)] hover:shadow-[0_14px_45px_rgba(244,63,94,0.65)] hover:scale-105 active:scale-95 transition-all duration-300">
                    <Code size={22} className="group-hover:rotate-12 transition-transform" /> Technical Explanation
                </button>
            )}

            <main className="relative z-40 container mx-auto px-6 min-h-screen flex flex-col items-center justify-center py-20">

                {view === 'tech' && <TechPage onBack={() => { setView('story'); window.scrollTo(0, 0); }} />}

                {/* STEP 0: INTRO */}
                {view === 'story' && step === 0 && (
                    <div className="text-center space-y-8 animate-in fade-in zoom-in duration-1000">
                        <div className="relative inline-block">
                            <div className="absolute -inset-2 bg-rose-400/20 rounded-full blur-xl animate-pulse" />
                            <Heart className="w-12 h-12 text-rose-200/80 mx-auto mb-4 animate-pulse" fill="currentColor" />
                        </div>
                        <p className="text-sm text-rose-200/50 font-light tracking-[0.35em] uppercase">A tiny sorry from a slightly too excited boy</p>
                        <h1 className={`${THEME.fontHeading} italic text-5xl md:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-rose-200 via-white to-rose-200 drop-shadow-[0_0_25px_rgba(244,114,182,0.25)]`}>
                            Sorry, Tanvi 🥺
                        </h1>
                        <p className={`${THEME.fontBody} text-lg md:text-xl text-rose-100/60 font-light tracking-wide max-w-md mx-auto`}>
                            I know I overdid it. This time, no calls — just a few quiet pages you can read whenever you like.
                        </p>
                        <button onClick={() => setStep(1)}
                            className="mt-12 group relative px-10 py-5 bg-transparent overflow-hidden rounded-full transition-all hover:scale-105">
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-rose-600 via-purple-700 to-rose-600 opacity-25 group-hover:opacity-40 transition-opacity" />
                            <div className="absolute inset-0 border border-rose-200/25 rounded-full" />
                            <span className={`${THEME.fontBody} relative flex items-center gap-3 text-rose-50 tracking-wider text-lg`}>Okay, tell me <ChevronRight size={20} /></span>
                        </button>
                    </div>
                )}

                {/* STEP 1: WHAT HAPPENED */}
                {view === 'story' && step === 1 && (
                    <div className="w-full max-w-5xl grid md:grid-cols-2 gap-12 items-center animate-in slide-in-from-right duration-700">
                        <div className="order-2 md:order-1 flex flex-col items-center">
                            <PhotoGallery />
                            <GeminiMessage />
                        </div>
                        <div className="order-1 md:order-2 text-center md:text-left space-y-8">
                            <h2 className={`${THEME.fontHeading} italic text-4xl md:text-6xl text-rose-50`}>Okay, I got carried away</h2>
                            <div className={`${THEME.fontBody} space-y-4 text-rose-100/75 text-lg md:text-xl leading-relaxed font-light`}>
                                <p>Tanvi, in all my excitement — wanting to talk to you, wanting to see you — I went way overboard. Instead of staying calm, I called… and called… and called again. 🙈</p>
                                <p>It came across as obsessive and disturbing. That wasn't fair to you, and I'm really, really sorry you had to feel that way because of me.</p>
                                <p>You told me right at the start — understand, and then talk. This time I'm doing exactly that: I've understood, and this is me talking, once, calmly.</p>
                            </div>
                            <div className="pt-8 flex justify-center md:justify-start">
                                <button onClick={() => setStep(2)}
                                    className={`${THEME.fontBody} flex items-center gap-2 text-rose-200 hover:text-rose-100 transition-colors border-b border-rose-200/30 hover:border-rose-200 pb-1 text-lg`}>
                                    Read my proper sorry <Feather size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: LETTER */}
                {view === 'story' && step === 2 && (
                    <div className="w-full max-w-3xl animate-in fade-in duration-1000">
                        <div className="bg-[#150c19]/70 backdrop-blur-xl border border-rose-300/10 p-8 md:p-16 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.7)] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-rose-400/60 to-transparent" />
                            <Feather className="absolute top-6 right-6 text-rose-200/15 w-12 h-12" />
                            <div className="space-y-8 relative z-10">
                                <div className="text-center mb-8">
                                    <h3 className={`${THEME.fontHeading} italic text-4xl text-rose-100`}>My Sorry & My Promises</h3>
                                </div>
                                <div className={`${THEME.fontBody} space-y-6 text-rose-50/85 leading-loose font-light text-lg md:text-xl`}>
                                    <p><Typewriter text="Dear Tanvi gaaru, I'm really sorry. My excitement ran way ahead of me, and it made you uncomfortable. That was the last thing I ever wanted." delay={18} /></p>
                                    <p className="animate-in fade-in fill-mode-backwards" style={{ animationDelay: '4.5s', animationDuration: '2s' }}>
                                        I've read everything you said, and I acknowledge all of it. You're not looking for a relationship right now — I know that, and I completely agree with you. Your first project deserves your full focus, and you shouldn't have to spend your energy on small things like this because of me.
                                    </p>
                                    <p className="animate-in fade-in fill-mode-backwards" style={{ animationDelay: '7s', animationDuration: '2s' }}>
                                        I think love is accepting what the person wants — respecting it, and admiring them anyway. So that's exactly what I'll do. And thank you for saying you admire me too; you were one of the first people I got to know at Aiden, and I don't want to lose that bond either.
                                    </p>
                                    <p className="animate-in fade-in fill-mode-backwards" style={{ animationDelay: '8.5s', animationDuration: '2s' }}>
                                        And honestly, I'll always love(like) you and care about you — that's just how I feel, and it comes with zero expectations. The way I'll show it is simple: by helping you achieve whatever you want, for as long as I'm in this organization. Starting with the little technical explanation at the top of this page. 🙂
                                    </p>
                                    <ul className="animate-in fade-in fill-mode-backwards space-y-2 pl-1" style={{ animationDelay: '10s', animationDuration: '2s' }}>
                                        <li>🤞 No more back-to-back calls. Pinky promise.</li>
                                        <li>🫶 I respect your decision, fully.</li>
                                        <li>💻 Your first project comes first — go rock it.</li>
                                        <li>🤝 Stuck on anything at work? I'm always happy to help.</li>
                                        <li>🌸 No pressure, no awkwardness. Just respect.</li>
                                    </ul>
                                </div>
                                <div className="pt-10 text-center animate-in fade-in" style={{ animationDelay: '13s', animationDuration: '2s' }}>
                                    <p className={`${THEME.fontScript} text-4xl text-rose-200`}>With respect, and really sorry,<br />Suprith 🥺</p>
                                    <button onClick={() => setStep(3)}
                                        className={`${THEME.fontBody} mt-12 group inline-flex items-center gap-2 text-rose-100 hover:text-white transition-colors text-lg border-b border-rose-300/30 hover:border-rose-300 pb-1`}>
                                        <Gift size={18} /> One small thing before you go
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: SURPRISE */}
                {view === 'story' && step === 3 && (
                    <>
                        <SurpriseRoom />
                        <button onClick={() => setStep(0)}
                            className={`${THEME.fontBody} mt-12 text-xs text-rose-400/50 hover:text-rose-300 uppercase tracking-widest transition-colors flex items-center gap-2`}>
                            <Send size={12} /> Read from the beginning
                        </button>
                    </>
                )}

            </main>

            {view === 'story' && <StepDots step={step} setStep={setStep} />}
        </div>
    );
}
