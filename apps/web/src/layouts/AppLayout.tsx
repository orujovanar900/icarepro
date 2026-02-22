import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/ui/Sidebar';
import { TopBar } from '@/components/ui/TopBar';
import { BottomNav } from '@/components/ui/BottomNav';
import { ToastContainer } from '@/components/ui/Toast';

export function AppLayout() {
    return (
        <div className="flex h-screen overflow-hidden bg-bg text-text">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <TopBar />
                <main className="flex-1 overflow-y-auto bg-bg p-4 md:p-6 pb-[70px] md:pb-6 relative main-content">
                    <Outlet />
                </main>
            </div>
            <BottomNav />
            <ToastContainer />
        </div>
    );
}
