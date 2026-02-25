import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    variant?: 'danger' | 'warning';
}

export function ConfirmDialog({
    isOpen,
    title = 'Əminsinizmi?',
    message,
    confirmLabel = 'Bəli, davam et',
    cancelLabel = 'Ləğv et',
    onConfirm,
    onCancel,
    isLoading = false,
    variant = 'danger',
}: ConfirmDialogProps) {
    return (
        <Modal isOpen={isOpen} onClose={onCancel} title="">
            <div className="flex flex-col items-center text-center gap-4 pt-2 pb-2">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red/10' : 'bg-orange/10'}`}>
                    <AlertTriangle className={`w-7 h-7 ${variant === 'danger' ? 'text-red' : 'text-orange'}`} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-text">{title}</h3>
                    <p className="text-sm text-muted mt-1">{message}</p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                    <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isLoading}>
                        {cancelLabel}
                    </Button>
                    <Button variant="danger" className="flex-1" onClick={onConfirm} disabled={isLoading}>
                        {isLoading ? 'Gözləyin...' : confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
