import React, { useState } from 'react';
import { Phone } from 'lucide-react';

interface PhoneRevealProps {
  phone: string;
  onReveal?: () => void;
  className?: string;
}

function maskPhone(phone: string): string {
  if (phone.length <= 5) return '***';
  return phone.slice(0, 4) + ' *** ** ' + phone.slice(-2);
}

export function PhoneReveal({ phone, onReveal, className = '' }: PhoneRevealProps) {
  const [revealed, setRevealed] = useState(false);

  const handleReveal = () => {
    setRevealed(true);
    onReveal?.();
  };

  return (
    <button
      type="button"
      onClick={revealed ? undefined : handleReveal}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        revealed
          ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
          : 'bg-gold/10 text-gold hover:bg-gold/20 border border-gold/30 cursor-pointer'
      } ${className}`}
    >
      <Phone className="w-4 h-4 flex-shrink-0" />
      {revealed ? (
        <a href={`tel:${phone}`} className="hover:underline" onClick={e => e.stopPropagation()}>
          {phone}
        </a>
      ) : (
        <span>{maskPhone(phone)} — Nömrəni göstər</span>
      )}
    </button>
  );
}
