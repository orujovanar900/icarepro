import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className={cn(
                    'relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200',
                    className
                )}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-heading font-semibold text-text">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-muted transition-colors hover:bg-surface hover:text-text"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
}
