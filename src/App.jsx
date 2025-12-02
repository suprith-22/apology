import React, { useState, useEffect, useRef } from 'react';
import { Heart, Stars, X, Sparkles, Feather, Music, ChevronRight, ChevronLeft, Send } from 'lucide-react';

// --- CONFIGURATION ---
const PHOTOS = [
    "/photo1.jpg",
    "/photo2.jpg",
    "/photo3.jpg"
];

const GEMINI_API_KEY = "AIzaSyCEwnBgpOaX835EKyhDImEKP84J10h1Cvc";

const THEME = {
    bg: "bg-[#0f172a]", // Slate 900
    textMain: "text-slate-200",
    textHighlight: "text-amber-200",
    accent: "text-indigo-400",
    fontHeading: "font-['Pacifico',_cursive]",
    fontBody: "font-['Lato',_sans-serif]",
};

// --- COMPONENTS ---

// 1. Starry Background
const StarField = () => {
    const [stars, setStars] = useState([]);

    useEffect(() => {
        const generateStars = () => {
            const newStars = Array.from({ length: 150 }).map((_, i) => ({
                id: i,
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: Math.random() * 2 + 1,
                opacity: Math.random(),
                animationDuration: Math.random() * 3 + 2 + 's',
                delay: Math.random() * 5 + 's'
            }));
            setStars(newStars);
        };
        generateStars();
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {stars.map((star) => (
                <div
                    key={star.id}
                    className="absolute rounded-full bg-white"
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                        opacity: star.opacity,
                        animation: `twinkle ${star.animationDuration} infinite ${star.delay}`
                    }}
                />
            ))}
            <style>{`
                @keyframes twinkle {
                    0%, 100% { opacity: 0.2; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
            `}</style>
        </div>
    );
};

// 2. Floating Lanterns
const Lanterns = () => {
    const [lanterns, setLanterns] = useState([]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (lanterns.length < 20) {
                const newLantern = {
                    id: Date.now(),
                    x: Math.random() * 100,
                    speed: Math.random() * 20 + 30 + 's',
                    scale: Math.random() * 0.5 + 0.5
                };
                setLanterns(prev => [...prev, newLantern]);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [lanterns]);

    return (
        <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
            {lanterns.map((lantern) => (
                <div
                    key={lantern.id}
                    className="absolute bottom-[-100px] opacity-80"
                    style={{
                        left: `${lantern.x}%`,
                        transform: `scale(${lantern.scale})`,
                        animation: `floatUp ${lantern.speed} linear forwards`
                    }}
                >
                    <div className="w-8 h-12 bg-gradient-to-t from-orange-500 via-amber-400 to-yellow-200 rounded-t-xl rounded-b-md blur-[1px] shadow-[0_0_20px_rgba(251,191,36,0.6)]"></div>
                </div>
            ))}
            <style>{`
                @keyframes floatUp {
                    0% { transform: translateY(0) scale(1); opacity: 0; }
                    10% { opacity: 0.8; }
                    100% { transform: translateY(-120vh) scale(0.5); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

// 3. Photo Gallery Carousel
const PhotoGallery = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextPhoto = () => {
        setCurrentIndex((prev) => (prev + 1) % PHOTOS.length);
    };

    const prevPhoto = () => {
        setCurrentIndex((prev) => (prev - 1 + PHOTOS.length) % PHOTOS.length);
    };

    return (
        <div className="relative w-full max-w-md mx-auto aspect-[3/4] group perspective-1000">
            {/* Photo Frame */}
            <div className="relative w-full h-full bg-white p-4 pb-16 shadow-2xl transform transition-all duration-500 rotate-1 hover:rotate-0 rounded-sm">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 pointer-events-none"></div>

                <div className="relative w-full h-full overflow-hidden bg-slate-100">
                    <img
                        src={PHOTOS[currentIndex]}
                        alt={`Memory ${currentIndex + 1}`}
                        className="w-full h-full object-cover transition-opacity duration-500"
                    />
                </div>

                <div className="absolute bottom-4 left-0 w-full text-center">
                    <p className={`${THEME.fontHeading} text-2xl text-slate-800`}>
                        {currentIndex === 0 && "My Beautiful Akshu ✨"}
                        {currentIndex === 1 && "The Reason I Smile 💖"}
                        {currentIndex === 2 && "My Forever Love 🌹"}
                    </p>
                </div>

                {/* Navigation Buttons */}
                <button
                    onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <ChevronLeft size={20} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <ChevronRight size={20} />
                </button>

                {/* Indicators */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                    {PHOTOS.map((_, idx) => (
                        <div
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-colors ${idx === currentIndex ? 'bg-amber-200' : 'bg-slate-600'}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

// 4. Gemini Magic Message
const GeminiMessage = () => {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const generateMessage = async () => {
        setLoading(true);
        setMessage("");
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: "Write a short, poetic 2-sentence compliment for a girl named Akshu, focusing on her elegance, poise, calmness, and beauty. Make it magical and heartwarming." }] }]
                    })
                }
            );
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) setMessage(text);
        } catch (e) {
            console.error(e);
            setMessage("Your elegance outshines the stars, and your poise brings peace to my world. ✨");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-8 w-full max-w-md mx-auto">
            {!message ? (
                <button
                    onClick={generateMessage}
                    disabled={loading}
                    className="w-full group relative px-6 py-3 bg-indigo-900/50 hover:bg-indigo-800/50 border border-indigo-500/30 rounded-xl transition-all overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <span className="flex items-center justify-center gap-2 text-indigo-200 group-hover:text-white transition-colors">
                        {loading ? <Sparkles className="animate-spin" size={18} /> : <Sparkles size={18} />}
                        {loading ? "Consulting the Stars..." : "Reveal Your Aura ✨"}
                    </span>
                </button>
            ) : (
                <div className="bg-indigo-950/50 border border-indigo-500/30 p-6 rounded-xl animate-in fade-in zoom-in duration-500 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-200/50 to-transparent"></div>
                    <p className="text-indigo-100 italic font-light leading-relaxed text-center">
                        "{message}"
                    </p>
                    <div className="mt-4 flex justify-center">
                        <button
                            onClick={generateMessage}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                            <Sparkles size={12} /> Another Message
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// 5. Typewriter Effect
const Typewriter = ({ text, delay = 40, onComplete }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (index < text.length) {
            const timer = setTimeout(() => {
                setDisplayedText((prev) => prev + text.charAt(index));
                setIndex((prev) => prev + 1);
            }, delay);
            return () => clearTimeout(timer);
        } else if (onComplete) {
            onComplete();
        }
    }, [index, text, delay, onComplete]);

    return <span>{displayedText}</span>;
};

// --- MAIN APP ---

export default function App() {
    const [step, setStep] = useState(0); // 0: Intro, 1: Gallery, 2: Letter
    const [audioPlaying, setAudioPlaying] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        // Load fonts
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Pacifico&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => document.head.removeChild(link);
    }, []);

    useEffect(() => {
        audioRef.current = new Audio('/singari.mp3');
        audioRef.current.loop = true;
        audioRef.current.volume = 0.5;

        const playAudio = () => {
            if (audioRef.current && audioRef.current.paused) {
                audioRef.current.play()
                    .then(() => setAudioPlaying(true))
                    .catch(e => console.log("Autoplay prevented", e));
            }
        };

        window.addEventListener('click', playAudio, { once: true });
        return () => {
            if (audioRef.current) audioRef.current.pause();
        };
    }, []);

    const toggleAudio = () => {
        if (audioRef.current) {
            if (audioPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setAudioPlaying(!audioPlaying);
        }
    };

    return (
        <div className={`min-h-screen w-full overflow-hidden relative ${THEME.bg} ${THEME.textMain} ${THEME.fontBody} selection:bg-indigo-500/30`}>

            <StarField />
            <Lanterns />

            {/* Audio Control */}
            <button
                onClick={toggleAudio}
                className="fixed top-6 right-6 z-50 text-white/50 hover:text-white transition-colors"
            >
                {audioPlaying ? <Music className="animate-pulse" /> : <Music className="opacity-50" />}
            </button>

            {/* Main Content Container */}
            <main className="relative z-20 container mx-auto px-6 h-screen flex flex-col items-center justify-center">

                {/* STEP 0: INTRO */}
                {step === 0 && (
                    <div className="text-center space-y-8 animate-in fade-in zoom-in duration-1000">
                        <div className="relative inline-block">
                            <div className="absolute -inset-1 bg-indigo-500 rounded-full blur opacity-20 animate-pulse"></div>
                            <Stars className="w-12 h-12 text-amber-200 mx-auto mb-4 animate-spin-slow" />
                        </div>

                        <h1 className={`${THEME.fontHeading} text-5xl md:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-white to-indigo-200 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]`}>
                            For My Dearest Akshu
                        </h1>

                        <p className="text-lg md:text-xl text-indigo-200/80 font-light tracking-widest uppercase">
                            A surprise just for you...
                        </p>

                        <button
                            onClick={() => setStep(1)}
                            className="mt-12 group relative px-10 py-5 bg-transparent overflow-hidden rounded-full transition-all hover:scale-105"
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                            <div className="absolute inset-0 border border-white/20 rounded-full"></div>
                            <span className="relative flex items-center gap-3 text-white tracking-wider text-lg">
                                Enter Your World <ChevronRight size={20} />
                            </span>
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
                            <h2 className={`${THEME.fontHeading} text-4xl md:text-6xl text-white`}>
                                You Are My Universe
                            </h2>
                            <div className="space-y-4 text-indigo-100 text-lg md:text-xl leading-relaxed font-light">
                                <p>
                                    Akshu, every time I look at these pictures, I am reminded of how incredibly blessed I am. You are not just a part of my life; you are the best part of it.
                                </p>
                                <p>
                                    Your smile has the power to heal everything, and your happiness means more to me than my own. I never want to be the reason for a frown on this beautiful face ever again.
                                </p>
                                <p>
                                    I want to fill your life with as much joy, laughter, and love as you have brought into mine.
                                </p>
                            </div>

                            <div className="pt-8 flex justify-center md:justify-start">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex items-center gap-2 text-amber-200 hover:text-amber-100 transition-colors border-b border-amber-200/30 hover:border-amber-200 pb-1 text-lg"
                                >
                                    Read my heart's message <Feather size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: LETTER */}
                {step === 2 && (
                    <div className="w-full max-w-3xl animate-in fade-in duration-1000">
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 md:p-16 rounded-2xl shadow-2xl relative overflow-hidden">
                            {/* Decorative Elements */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
                            <Sparkles className="absolute top-6 right-6 text-amber-200/20 w-12 h-12" />

                            <div className="space-y-8 relative z-10">
                                <div className="text-center mb-8">
                                    <h3 className={`${THEME.fontHeading} text-4xl text-indigo-100`}>My Promise to You</h3>
                                </div>

                                <div className="space-y-6 text-slate-200 leading-loose font-light text-lg md:text-xl">
                                    <p>
                                        <Typewriter
                                            text="My Dearest Akshu, I know I've made mistakes, and I can't put into words how sorry I am for any pain I've caused you. Seeing you hurt breaks my heart because you deserve nothing but the purest happiness in the world."
                                            delay={15}
                                        />
                                    </p>
                                    <p className="delay-1000 animate-in fade-in fill-mode-backwards" style={{ animationDelay: '4s' }}>
                                        You are the most beautiful person I have ever known, inside and out. Your kindness, your laughter, and your love are gifts I cherish every single day. I promise you, from this moment forward, I will do everything in my power to make you smile, to support you, and to love you the way you deserve to be loved.
                                    </p>
                                    <p className="delay-1000 animate-in fade-in fill-mode-backwards" style={{ animationDelay: '8s' }}>
                                        I love you more than anything in this universe, Akshu. You are my everything, my forever, and my greatest blessing. Please give me the chance to show you how much you truly mean to me. I would be honored to spend every day making you happy.
                                    </p>
                                </div>

                                <div className="pt-12 text-center animate-in fade-in" style={{ animationDelay: '12s' }}>
                                    <p className={`${THEME.fontHeading} text-3xl text-amber-200`}>
                                        Forever & Always Yours,<br />Suprith
                                    </p>

                                    <button
                                        onClick={() => setStep(0)}
                                        className="mt-16 text-xs text-indigo-400/50 hover:text-indigo-300 uppercase tracking-widest transition-colors flex items-center gap-2 mx-auto"
                                    >
                                        <Send size={12} /> Replay from Start
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
