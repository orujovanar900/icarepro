import React, { useState } from 'react';
import { Phone } from 'lucide-react';

interface PhoneRevealProps {
  phone: string;
  className?: string;
}

function maskPhone(phone: string): string {
  if (phone.length <= 5) return '***';
  return phone.slice(0, 4) + ' *** ** ' + phone.slice(-2);
}

export function PhoneReveal({ phone, className = '' }: PhoneRevealProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        revealed
          ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
          : 'bg-gold/10 text-gold hover:bg-gold/20 border border-gold/30 cursor-pointer'
      } ${className}`}
    >
      <Phone className="w-4 h-4" />
      {revealed ? (
        <a href={`tel:${phone}`} className="hover:underline">
          {phone}
        </a>
      ) : (
        <span>{maskPhone(phone)} — Göstər</span>
      )}
    </button>
  );
}
