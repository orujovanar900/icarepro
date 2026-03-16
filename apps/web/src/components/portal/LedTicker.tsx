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

const BG      = '#1A1A2E';
const GOLD    = '#C9A84C';
const WHITE   = '#FFFFFF';
const HEIGHT  = 38;
const SPEED_S = 20; // seconds for full animation cycle

const DEFAULT_TEXT = 'icarepro — Bakının birinci rəqəmsal icarə platforması · Elanınızı yerləşdirin · icarepro.az';
const LOADING_TEXT = 'icarepro · Bakının rəqəmsal icarə platforması · ';

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
    navigate,
}: {
    slots:     TickerSlot[];
    direction: 'left' | 'right';
    paused:    boolean;
    navigate:  ReturnType<typeof useNavigate>;
}) {
    return (
        <div style={{ overflow: 'hidden', height: HEIGHT, display: 'flex', alignItems: 'center' }}>
            <div
                style={{
                    display:            'flex',
                    alignItems:         'center',
                    whiteSpace:         'nowrap',
                    animation:          `${direction === 'left' ? 'tickerLeft' : 'tickerRight'} ${SPEED_S}s linear infinite`,
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
}: {
    text:      string;
    direction: 'left' | 'right';
    paused:    boolean;
}) {
    const repeated = Array.from({ length: 4 }, () => text).join(' · ') + ' · ';
    return (
        <div style={{ overflow: 'hidden', height: HEIGHT, display: 'flex', alignItems: 'center' }}>
            <div
                style={{
                    display:            'flex',
                    alignItems:         'center',
                    whiteSpace:         'nowrap',
                    color:              GOLD,
                    animation:          `${direction === 'left' ? 'tickerLeft' : 'tickerRight'} ${SPEED_S}s linear infinite`,
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
    const [paused, setPaused] = React.useState(false);
    const navigate = useNavigate();

    React.useEffect(() => { ensureKeyframes(); }, []);

    const { data, isLoading } = useQuery({
        queryKey: ['ticker', placement],
        queryFn:  async () => {
            const res = await api.get<{ success: boolean; data: TickerSlot[] }>(
                `/ticker?placement=${placement}`,
            );
            return res.data.data;
        },
        staleTime: 60_000, // 1 min cache — ticker doesn't need to refresh often
        retry:     false,
    });

    const slots = data ?? [];

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
                <PlainTextRow text={LOADING_TEXT} direction="left" paused={paused} />
            ) : slots.length === 0 ? (
                <PlainTextRow text={DEFAULT_TEXT} direction="left" paused={paused} />
            ) : (
                <TickerRow slots={slots} direction="left" paused={paused} navigate={navigate} />
            )}
        </div>
    );
}
