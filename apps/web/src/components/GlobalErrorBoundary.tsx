import React from 'react';
import { Button } from './ui/Button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Global Error Caught:', error, errorInfo);

        const isChunkError = error?.message?.toLowerCase().includes('failed to fetch dynamically imported module') ||
            error?.message?.toLowerCase().includes('dynamically imported module') ||
            error?.message?.toLowerCase().includes('importing a module script failed');

        if (isChunkError) {
            const hasReloaded = sessionStorage.getItem('chunk-error-reload');
            if (!hasReloaded) {
                sessionStorage.setItem('chunk-error-reload', 'true');
                window.location.reload();
            }
        }
    }

    handleReload = () => {
        window.location.reload();
    };

    override render() {
        if (this.state.hasError) {
            // Check if it's likely a chunk load error
            const isChunkError = this.state.error?.message?.toLowerCase().includes('failed to fetch dynamically imported module') ||
                this.state.error?.message?.toLowerCase().includes('dynamically imported module') ||
                this.state.error?.message?.toLowerCase().includes('importing a module script failed');

            return (
                <div className="min-h-screen bg-bg text-text flex flex-col items-center justify-center p-4">
                    <div className="max-w-md w-full bg-surface border border-border/50 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red to-orange-500"></div>
                        <AlertTriangle className="w-16 h-16 text-red mx-auto mb-6 opacity-80" />

                        <h1 className="text-2xl font-bold font-heading mb-2">
                            {isChunkError ? 'Bağlantı xətası' : 'Gözlənilməz xəta baş verdi'}
                        </h1>
                        <p className="text-muted mb-8 text-sm leading-relaxed">
                            {isChunkError
                                ? 'Sistem yenilənib və ya internet bağlantısında kəsinti olub. Davam etmək üçün səhifəni yeniləyin.'
                                : 'Üzr istəyirik, proqramda texniki xəta yarandı. Zəhmət olmasa səhifəni yeniləyin.'}
                        </p>

                        <div className="flex flex-col gap-3">
                            <Button
                                variant="primary"
                                size="lg"
                                className="w-full"
                                onClick={this.handleReload}
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Səhifəni yenilə
                            </Button>
                        </div>

                        {!isChunkError && this.state.error && (
                            <div className="mt-8 text-left bg-black/20 p-4 rounded-lg overflow-auto max-h-32 text-[10px] text-gray-400 font-mono">
                                {String(this.state.error)}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
