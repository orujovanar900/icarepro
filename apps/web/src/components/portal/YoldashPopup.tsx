import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const C = {
    navy: '#1A1A2E',
    gold: '#C9A84C',
    white: '#FFFFFF',
    muted: '#6B7280',
};

const GOLD_GRAD = 'linear-gradient(135deg,#C9A84C,#e8c56b,#C9A84C)';
const STORAGE_KEY = 'yoldash_popup_shown';
const AUTO_DISMISS_MS = 10000;
const TIME_TRIGGER_MS = 30000;
const SCROLL_LISTING_THRESHOLD = 3;

/**
 * Dismissible popup shown at bottom-right of listing search page.
 * Triggers:
 *   - After user has scrolled past {SCROLL_LISTING_THRESHOLD} listings
 *   - OR after {TIME_TRIGGER_MS}ms on the page
 * Suppressed for the session via sessionStorage.
 */
export function YoldashPopup() {
    const navigate = useNavigate();
    const [visible, setVisible] = React.useState(false);
    const dismissedRef = React.useRef(false);
    const autoDismissTimer = React.useRef<number | null>(null);

    const dismiss = React.useCallback(() => {
        if (dismissedRef.current) return;
        dismissedRef.current = true;
        setVisible(false);
        try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
        if (autoDismissTimer.current) {
            window.clearTimeout(autoDismissTimer.current);
            autoDismissTimer.current = null;
        }
    }, []);

    const show = React.useCallback(() => {
        if (dismissedRef.current || visible) return;
        try { if (sessionStorage.getItem(STORAGE_KEY)) return; } catch { /* ignore */ }
        setVisible(true);
        autoDismissTimer.current = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    }, [dismiss, visible]);

    React.useEffect(() => {
        // Suppress if already shown this session
        try {
            if (sessionStorage.getItem(STORAGE_KEY)) {
                dismissedRef.current = true;
                return;
            }
        } catch { /* ignore */ }

        // Time trigger
        const timeTimer = window.setTimeout(show, TIME_TRIGGER_MS);

        // Scroll trigger — detect when N listing cards have been scrolled past
        const onScroll = () => {
            if (dismissedRef.current || visible) return;
            const cards = document.querySelectorAll('[data-listing-card]');
            if (cards.length === 0) return;
            let passed = 0;
            for (const card of Array.from(cards)) {
                const rect = (card as HTMLElement).getBoundingClientRect();
                if (rect.bottom < 0) passed++;
            }
            if (passed >= SCROLL_LISTING_THRESHOLD) show();
        };
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            window.clearTimeout(timeTimer);
            window.removeEventListener('scroll', onScroll);
            if (autoDismissTimer.current) window.clearTimeout(autoDismissTimer.current);
        };
    }, [show, visible]);

    if (!visible) return null;

    return (
        <div
            role="dialog"
            aria-label="Yoldaş tapmaq təklifi"
            style={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                zIndex: 1000,
                width: 320,
                maxWidth: 'calc(100vw - 32px)',
                background: C.white,
                borderRadius: 16,
                boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
                border: '1px solid rgba(201,168,76,0.3)',
                overflow: 'hidden',
                animation: 'yoldashPopupIn 0.35s ease-out',
            }}
        >
            <style>{`
                @keyframes yoldashPopupIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            {/* Gold header strip */}
            <div style={{ height: 4, background: GOLD_GRAD }} />

            <div style={{ padding: '16px 18px 18px', position: 'relative' }}>
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Bağla"
                    style={{
                        position: 'absolute', top: 10, right: 10,
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.05)',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: C.muted,
                    }}
                >
                    <X style={{ width: 14, height: 14 }} />
                </button>

                <div style={{ fontSize: 26, marginBottom: 6 }}>🤝</div>
                <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: C.navy, paddingRight: 20 }}>
                    Kirayə çox bahadır?
                </h3>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: C.muted, lineHeight: 1.45 }}>
                    Xərcləri bölüşmək üçün etibarlı yoldaş tapın və birlikdə yaşamaq daha sərfəli olsun.
                </p>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        type="button"
                        onClick={() => { dismiss(); navigate('/yoldas'); }}
                        style={{
                            flex: 1, padding: '9px 14px', borderRadius: 10,
                            background: GOLD_GRAD, color: '#0A0B0F',
                            border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: 13,
                        }}
                    >Yoldaş tap</button>
                    <button
                        type="button"
                        onClick={dismiss}
                        style={{
                            padding: '9px 14px', borderRadius: 10,
                            background: 'transparent', color: C.navy,
                            border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer',
                            fontWeight: 600, fontSize: 13,
                        }}
                    >Bağla</button>
                </div>
            </div>
        </div>
    );
}
