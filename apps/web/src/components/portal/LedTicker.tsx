import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TickerSlot {
    id:        string;
    type:      'LISTING' | 'AD';
    content:   string;
    linkUrl:   string | null;
    listingId: string | null;
    placement: string;
}

interface LedTickerProps {
    placement: 'PORTAL_MAIN' | 'LISTING_DETAIL';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BG               = '#1A1A2E';
const GOLD             = '#C9A84C';
const WHITE            = '#FFFFFF';
const HEIGHT           = 38;
const PIXELS_PER_SECOND = 80; // consistent visual speed regardless of content length

const DEFAULT_TEXT = 'icarəpro — Bakının birinci rəqəmsal icarə platforması · Elanınızı yerləşdirin · icarəpro.az';
const LOADING_TEXT = 'icarəpro · Bakının rəqəmsal icarə platforması · ';

// ─── CSS injection (once) ────────────────────────────────────────────────────

const STYLE_ID = 'led-ticker-keyframes';

function ensureKeyframes() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        @keyframes tickerLeft {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        @keyframes tickerRight {
            0%   { transform: translateX(-50%); }
            100% { transform: translateX(0); }
        }
    `;
    document.head.appendChild(style);
}

// ─── Separator ───────────────────────────────────────────────────────────────

function Sep() {
    return (
        <span style={{ color: GOLD, margin: '0 14px', flexShrink: 0, userSelect: 'none' }}>·</span>
    );
}

// ─── SlotItem ─────────────────────────────────────────────────────────────────

interface SlotItemProps {
    slot:     TickerSlot;
    navigate: ReturnType<typeof useNavigate>;
}

function SlotItem({ slot, navigate }: SlotItemProps) {
    const isAd      = slot.type === 'AD';
    const emoji     = isAd ? '📢' : '🏠';
    const color     = isAd ? GOLD : WHITE;
    const text      = `${emoji} ${slot.content}`;
    const clickable = !!(slot.listingId || slot.linkUrl);

    const handleClick = () => {
        if (slot.listingId) {
            navigate(`/elan/${slot.listingId}`);
        } else if (slot.linkUrl) {
            window.open(slot.linkUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <span
            onClick={clickable ? handleClick : undefined}
            style={{
                color,
                cursor:     clickable ? 'pointer' : 'default',
                whiteSpace: 'nowrap',
                flexShrink: 0,
            }}
        >
            {text}
        </span>
    );
}

// ─── SlotsContent ─────────────────────────────────────────────────────────────
// Renders one set of slots with separators (used twice for seamless loop)

function SlotsContent({ slots, prefix, navigate }: { slots: TickerSlot[]; prefix: string; navigate: ReturnType<typeof useNavigate> }) {
    return (
        <>
            {slots.map((slot, i) => (
                <React.Fragment key={`${prefix}-${slot.id}-${i}`}>
                    <SlotItem slot={slot} navigate={navigate} />
                    <Sep />
                </React.Fragment>
            ))}
        </>
    );
}

// ─── TickerRow ────────────────────────────────────────────────────────────────

function TickerRow({
    slots,
    direction,
    paused,
    duration,
    navigate,
    trackRef,
}: {
    slots:     TickerSlot[];
    direction: 'left' | 'right';
    paused:    boolean;
    duration:  number;
    navigate:  ReturnType<typeof useNavigate>;
    trackRef:  React.RefObject<HTMLDivElement>;
}) {
    return (
        <div style={{ overflow: 'hidden', height: HEIGHT, display: 'flex', alignItems: 'center' }}>
            <div
                ref={trackRef}
                style={{
                    display:            'flex',
                    alignItems:         'center',
                    whiteSpace:         'nowrap',
                    animation:          duration > 0
                        ? `${direction === 'left' ? 'tickerLeft' : 'tickerRight'} ${duration}s linear infinite`
                        : 'none',
                    animationPlayState: paused ? 'paused' : 'running',
                    willChange:         'transform',
                }}
            >
                {/* Two identical copies for seamless loop */}
                <SlotsContent slots={slots} prefix="a" navigate={navigate} />
                <SlotsContent slots={slots} prefix="b" navigate={navigate} />
            </div>
        </div>
    );
}

// ─── PlainTextRow ─────────────────────────────────────────────────────────────

function PlainTextRow({
    text,
    direction,
    paused,
    duration,
    trackRef,
}: {
    text:      string;
    direction: 'left' | 'right';
    paused:    boolean;
    duration:  number;
    trackRef:  React.RefObject<HTMLDivElement>;
}) {
    const repeated = Array.from({ length: 4 }, () => text).join(' · ') + ' · ';
    return (
        <div style={{ overflow: 'hidden', height: HEIGHT, display: 'flex', alignItems: 'center' }}>
            <div
                ref={trackRef}
                style={{
                    display:            'flex',
                    alignItems:         'center',
                    whiteSpace:         'nowrap',
                    color:              GOLD,
                    animation:          duration > 0
                        ? `${direction === 'left' ? 'tickerLeft' : 'tickerRight'} ${duration}s linear infinite`
                        : 'none',
                    animationPlayState: paused ? 'paused' : 'running',
                    willChange:         'transform',
                }}
            >
                <span>{repeated}</span>
                <span>{repeated}</span>
            </div>
        </div>
    );
}

// ─── LedTicker ───────────────────────────────────────────────────────────────

export function LedTicker({ placement }: LedTickerProps) {
    const [paused, setPaused]     = React.useState(false);
    const [duration, setDuration] = React.useState(0); // 0 = not yet measured; animation starts only after measurement
    const trackRef                = React.useRef<HTMLDivElement>(null);
    const navigate                = useNavigate();

    React.useEffect(() => { ensureKeyframes(); }, []);

    const { data, isLoading } = useQuery({
        queryKey: ['ticker', placement],
        queryFn:  async () => {
            const res = await api.get<{ success: boolean; data: TickerSlot[] }>(
                `/ticker?placement=${placement}`,
            );
            return res.data.data;
        },
        staleTime: 60_000,
        retry:     false,
    });

    const slots = data ?? [];

    // Stable key: re-measure only when slot IDs or loading state changes (not on every array reference)
    const contentKey = slots.map(s => s.id).join(',');

    // Measure actual rendered width → pixels-per-second consistent speed
    React.useEffect(() => {
        if (trackRef.current) {
            // scrollWidth = both copies; divide by 2 for one copy's width
            const width = trackRef.current.scrollWidth / 2;
            if (width > 0) {
                setDuration(width / PIXELS_PER_SECOND);
            }
        }
    }, [contentKey, isLoading]);

    return (
        <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            style={{
                background:     BG,
                height:         HEIGHT,
                width:          '100%',
                overflow:       'hidden',
                display:        'flex',
                flexDirection:  'column',
                justifyContent: 'center',
                fontFamily:     'monospace',
                fontWeight:     700,
                fontSize:       20,
                userSelect:     'none',
            }}
        >
            {isLoading ? (
                <PlainTextRow text={LOADING_TEXT} direction="left" paused={paused} duration={duration} trackRef={trackRef} />
            ) : slots.length === 0 ? (
                <PlainTextRow text={DEFAULT_TEXT} direction="left" paused={paused} duration={duration} trackRef={trackRef} />
            ) : (
                <TickerRow slots={slots} direction="left" paused={paused} duration={duration} navigate={navigate} trackRef={trackRef} />
            )}
        </div>
    );
}
