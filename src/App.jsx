import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Moon, Sparkles, Feather, Music, ChevronRight, ChevronLeft, Send, Gift, Star } from 'lucide-react';

// --- CONFIGURATION ---
const PHOTOS = [
    "/photo1.jpg",
    "/photo2.jpg",
    "/photo3.jpg"
];

const GEMINI_API_KEY = "AQ.Ab8RN6LqjvfA3yP6MVs6eDyIz9xKfLxT3pOrkLMvQNYlx-MHSA";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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

// Dim, sorrowful night sky with a slow moon glow
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

// Falling rain (the ache) + drifting petals (fragile hope)
const Rain = () => {
    const [drops] = useState(() => Array.from({ length: 70 }).map((_, i) => ({
        id: i, x: Math.random() * 100, delay: Math.random() * 5 + 's',
        duration: (Math.random() * 0.6 + 0.7) + 's', height: Math.random() * 40 + 30, opacity: Math.random() * 0.25 + 0.05
    })));
    return (
        <div className="fixed inset-0 pointer-events-none z-[5] overflow-hidden">
            {drops.map((d) => (
                <div key={d.id} className="absolute top-[-15%] w-px bg-gradient-to-b from-transparent via-rose-100/50 to-transparent"
                    style={{ left: `${d.x}%`, height: `${d.height}px`, opacity: d.opacity, animation: `rainfall ${d.duration} linear ${d.delay} infinite` }} />
            ))}
            <style>{`@keyframes rainfall {0%{transform:translateY(-15vh)}100%{transform:translateY(120vh)}}`}</style>
        </div>
    );
};

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
const PhotoGallery = () => {
    const [i, setI] = useState(0);
    const captions = ["The way you used to smile", "Moments I'd give anything to keep", "My favourite person, always"];
    return (
        <div className="relative w-full max-w-md mx-auto aspect-[3/4] group perspective-1000">
            <div className="relative w-full h-full bg-[#f5efe6] p-4 pb-16 shadow-[0_20px_60px_rgba(0,0,0,0.6)] transform transition-all duration-500 -rotate-1 hover:rotate-0 rounded-sm">
                <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/10 to-purple-900/10 pointer-events-none" />
                <div className="relative w-full h-full overflow-hidden bg-[#e9e0d4]">
                    <img src={PHOTOS[i]} alt={`Memory ${i + 1}`} className="w-full h-full object-cover transition-opacity duration-500 sepia-[0.15]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>
                <div className="absolute bottom-4 left-0 w-full text-center px-4">
                    <p className={`${THEME.fontScript} text-2xl text-stone-700`}>{captions[i]}</p>
                </div>
                <button onClick={() => setI((p) => (p - 1 + PHOTOS.length) % PHOTOS.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-stone-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronLeft size={20} />
                </button>
                <button onClick={() => setI((p) => (p + 1) % PHOTOS.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-stone-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={20} />
                </button>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                    {PHOTOS.map((_, idx) => (
                        <div key={idx} className={`w-2 h-2 rounded-full transition-colors ${idx === i ? 'bg-rose-300' : 'bg-stone-700'}`} />
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- "A whisper from my heart" (live Gemini) ---
const GeminiMessage = () => {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const generate = async () => {
        setLoading(true); setMessage("");
        const text = await callGemini(
            "Write a short, heartfelt and gently sorrowful 2-sentence message for a girl named Akshu, expressing how deeply she is missed and cherished. Tender, poetic, full of quiet longing and hope.",
            "Even in the quietest, saddest hours, my heart keeps finding its way back to you. You are missed more than these words could ever hold."
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
                        {loading ? "Searching my heart..." : "A whisper from my heart"}
                    </span>
                </button>
            ) : (
                <div className="bg-rose-950/25 border border-rose-400/20 p-6 rounded-xl animate-in fade-in zoom-in duration-500 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-rose-300/50 to-transparent" />
                    <p className={`${THEME.fontBody} text-rose-100/90 italic leading-relaxed text-center text-lg`}>"{message}"</p>
                    <div className="mt-4 flex justify-center">
                        <button onClick={generate} className="text-xs text-rose-400/70 hover:text-rose-300 flex items-center gap-1 uppercase tracking-widest">
                            <Heart size={12} /> Another whisper
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

// --- THE SURPRISE: pressable heart that generates a live gift each time ---
const GIFTS = [
    { key: 'thanks', label: 'A thank you', prompt: "Write a short, deeply heartfelt 2-sentence thank-you note to a girl named Akshu — thank her for her patience, her love, and for still being here. Warm, sincere, a little emotional." },
    { key: 'reason', label: 'A reason I love you', prompt: "Write one short, vivid, poetic sentence naming a specific tender reason a boy adores a girl named Akshu — her laugh, her eyes, the way she cares. Make it feel personal and sincere." },
    { key: 'promise', label: 'A promise', prompt: "Write a short, sincere 2-sentence promise from a boy to a girl named Akshu about how he will love and treat her better from now on. Gentle, honest, hopeful." },
    { key: 'smile', label: 'Something to make you smile', prompt: "Write one short, sweet, slightly playful line to make a girl named Akshu smile through her sadness. Loving and warm, not a joke that mocks — just tender and cute." },
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
            thanks: "Thank you for staying, for your patience, and for loving me even when I made it hard. I don't say it enough, but you are everything.",
            reason: "I love the way your whole face lights up when you laugh — it feels like the world softening just for me.",
            promise: "I promise to listen more and speak softer, to protect your smile instead of dimming it. You will never doubt how loved you are again.",
            smile: "You're my favourite hello and my hardest goodbye — and yes, I'm hopelessly, ridiculously yours.",
        };
        const text = await callGemini(pick.prompt, fallbacks[pick.key]);
        setGift({ label: pick.label, text });
        setLoading(false);
    };

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center animate-in fade-in duration-1000">
            <p className="text-sm text-rose-200/50 font-light tracking-[0.35em] uppercase mb-3">A little surprise, just for you</p>
            <h2 className={`${THEME.fontHeading} italic text-4xl md:text-6xl text-rose-50 mb-4`}>Press my heart, Akshu</h2>
            <p className={`${THEME.fontBody} text-rose-100/65 text-lg mb-10 max-w-lg`}>
                Each time you press it, it whispers something new I've been holding onto — a thank you, a reason, a promise.
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

            {/* Generated gift card */}
            <div className="min-h-[130px] w-full flex items-center justify-center">
                {loading && (
                    <p className={`${THEME.fontBody} text-rose-200/70 italic text-lg flex items-center gap-2`}>
                        <Sparkles className="animate-spin" size={18} /> unfolding something for you...
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
                    <p className={`${THEME.fontBody} text-rose-200/40 italic text-lg`}>go on… I promise it's sweet 💗</p>
                )}
            </div>
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
    const [step, setStep] = useState(0); // 0 intro, 1 gallery, 2 letter, 3 surprise
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
        audioRef.current = new Audio('/song.mp3');
        audioRef.current.loop = true;
        audioRef.current.volume = 0.5;
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
            <Rain />
            <Petals />
            <CursorGlow />

            <div className="fixed inset-0 z-30 pointer-events-none shadow-[inset_0_0_200px_80px_rgba(0,0,0,0.7)]" />

            <button onClick={toggleAudio} className="fixed top-6 right-6 z-50 text-rose-100/40 hover:text-rose-100 transition-colors" aria-label="Toggle music">
                {audioPlaying ? <Music className="animate-pulse" /> : <Music className="opacity-50" />}
            </button>

            <main className="relative z-40 container mx-auto px-6 min-h-screen flex flex-col items-center justify-center py-20">

                {/* STEP 0: INTRO */}
                {step === 0 && (
                    <div className="text-center space-y-8 animate-in fade-in zoom-in duration-1000">
                        <div className="relative inline-block">
                            <div className="absolute -inset-2 bg-rose-400/20 rounded-full blur-xl animate-pulse" />
                            <Moon className="w-12 h-12 text-rose-200/80 mx-auto mb-4 animate-[spin_20s_linear_infinite]" />
                        </div>
                        <p className="text-sm text-rose-200/50 font-light tracking-[0.35em] uppercase">I'm sorry — and I couldn't stay silent</p>
                        <h1 className={`${THEME.fontHeading} italic text-5xl md:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-rose-200 via-white to-rose-200 drop-shadow-[0_0_25px_rgba(244,114,182,0.25)]`}>
                            For My Dearest Akshu
                        </h1>
                        <p className={`${THEME.fontBody} text-lg md:text-xl text-rose-100/60 font-light tracking-wide max-w-md mx-auto`}>
                            There are things my heart has been aching to say to you...
                        </p>
                        <button onClick={() => setStep(1)}
                            className="mt-12 group relative px-10 py-5 bg-transparent overflow-hidden rounded-full transition-all hover:scale-105">
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-rose-600 via-purple-700 to-rose-600 opacity-25 group-hover:opacity-40 transition-opacity" />
                            <div className="absolute inset-0 border border-rose-200/25 rounded-full" />
                            <span className={`${THEME.fontBody} relative flex items-center gap-3 text-rose-50 tracking-wider text-lg`}>Please, hear me out <ChevronRight size={20} /></span>
                        </button>
                    </div>
                )}

                {/* STEP 1: GALLERY */}
                {step === 1 && (
                    <div className="w-full max-w-5xl grid md:grid-cols-2 gap-12 items-center animate-in slide-in-from-right duration-700">
                        <div className="order-2 md:order-1 flex flex-col items-center">
                            <PhotoGallery />
                            <GeminiMessage />
                        </div>
                        <div className="order-1 md:order-2 text-center md:text-left space-y-8">
                            <h2 className={`${THEME.fontHeading} italic text-4xl md:text-6xl text-rose-50`}>I miss the world we had</h2>
                            <div className={`${THEME.fontBody} space-y-4 text-rose-100/75 text-lg md:text-xl leading-relaxed font-light`}>
                                <p>Akshu, every time I look at these pictures, my chest tightens. You are not just a part of my life; you were the best part of it, and I let myself forget how rare that is.</p>
                                <p>Your smile could heal anything, and your happiness meant more to me than my own. It breaks me to know I became the reason for a single tear on this beautiful face.</p>
                                <p>If you let me, I want to spend the rest of my days undoing that hurt and filling your life with the joy you gave to mine.</p>
                            </div>
                            <div className="pt-8 flex justify-center md:justify-start">
                                <button onClick={() => setStep(2)}
                                    className={`${THEME.fontBody} flex items-center gap-2 text-rose-200 hover:text-rose-100 transition-colors border-b border-rose-200/30 hover:border-rose-200 pb-1 text-lg`}>
                                    Read what my heart wrote for you <Feather size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: LETTER */}
                {step === 2 && (
                    <div className="w-full max-w-3xl animate-in fade-in duration-1000">
                        <div className="bg-[#150c19]/70 backdrop-blur-xl border border-rose-300/10 p-8 md:p-16 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.7)] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-rose-400/60 to-transparent" />
                            <Feather className="absolute top-6 right-6 text-rose-200/15 w-12 h-12" />
                            <div className="space-y-8 relative z-10">
                                <div className="text-center mb-8">
                                    <h3 className={`${THEME.fontHeading} italic text-4xl text-rose-100`}>My Apology & My Promise</h3>
                                </div>
                                <div className={`${THEME.fontBody} space-y-6 text-rose-50/85 leading-loose font-light text-lg md:text-xl`}>
                                    <p><Typewriter text="My Dearest Akshu, I know I've hurt you, and I can't put into words how deeply sorry I am for the pain I've caused. Seeing you sad breaks my heart, because you deserve nothing but the purest happiness in this world." delay={18} /></p>
                                    <p className="animate-in fade-in fill-mode-backwards" style={{ animationDelay: '4.5s', animationDuration: '2s' }}>
                                        It was my mistake, and I take full responsibility for it. I promise you, from the bottom of my heart, that I will never speak harshly to you again. You are the most beautiful soul I have ever known, inside and out — your kindness, your laughter, and your love are gifts I took for granted, and I'll carry that regret gently until I've earned your trust again.
                                    </p>
                                    <p className="animate-in fade-in fill-mode-backwards" style={{ animationDelay: '9s', animationDuration: '2s' }}>
                                        I love you more than anything in this world, Akshu. Please give me the chance to show you the man I promise to be — patient, present, and endlessly grateful for you. I would be honoured to spend every day making things right.
                                    </p>
                                </div>
                                <div className="pt-10 text-center animate-in fade-in" style={{ animationDelay: '13s', animationDuration: '2s' }}>
                                    <p className={`${THEME.fontScript} text-4xl text-rose-200`}>Forever sorry, forever yours,<br />Suprith</p>
                                    <button onClick={() => setStep(3)}
                                        className={`${THEME.fontBody} mt-12 group inline-flex items-center gap-2 text-rose-100 hover:text-white transition-colors text-lg border-b border-rose-300/30 hover:border-rose-300 pb-1`}>
                                        <Gift size={18} /> I left one last surprise for you
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: SURPRISE */}
                {step === 3 && (
                    <>
                        <SurpriseRoom />
                        <button onClick={() => setStep(0)}
                            className={`${THEME.fontBody} mt-12 text-xs text-rose-400/50 hover:text-rose-300 uppercase tracking-widest transition-colors flex items-center gap-2`}>
                            <Send size={12} /> Read from the beginning
                        </button>
                    </>
                )}

            </main>

            <StepDots step={step} setStep={setStep} />
        </div>
    );
}
