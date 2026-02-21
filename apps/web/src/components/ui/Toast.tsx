import * as React from 'react';
import { useToastStore } from '@/store/toast';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function ToastContainer() {
    const { toasts, removeToast } = useToastStore();

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={cn(
                        'flex w-80 items-center justify-between rounded-lg p-4 shadow-lg animate-in slide-in-from-right-full duration-300',
                        {
                            'bg-green/10 border border-green text-green': toast.type === 'success',
                            'bg-red/10 border border-red text-red': toast.type === 'error',
                            'bg-blue/10 border border-blue text-blue': toast.type === 'info',
                        }
                    )}
                >
                    <div className="flex items-center gap-3">
                        {toast.type === 'success' && <CheckCircle className="h-5 w-5" />}
                        {toast.type === 'error' && <AlertCircle className="h-5 w-5" />}
                        {toast.type === 'info' && <Info className="h-5 w-5" />}
                        <p className="text-sm font-medium">{toast.message}</p>
                    </div>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="rounded-full p-1 opacity-70 transition-opacity hover:opacity-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
