// useGemini.js — the same pattern this app uses, as a reusable React hook
import { useCallback, useState } from 'react';

export function useGemini(endpoint = '/api/generate') {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const ask = useCallback(async (prompt, fallback = '') => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const reply = data.text?.trim() || fallback;
            setText(reply);
            return reply;
        } catch (e) {
            setError(e);
            setText(fallback); // graceful degradation: the UI never shows a blank or a crash
            return fallback;
        } finally {
            setLoading(false);
        }
    }, [endpoint]);

    return { text, loading, error, ask };
}

// Usage:
// const { text, loading, ask } = useGemini();
// <button disabled={loading} onClick={() => ask('Summarise this case', 'Try again')}>Ask</button>
// <p>{loading ? 'Thinking…' : text}</p>
