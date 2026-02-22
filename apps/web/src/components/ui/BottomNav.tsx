import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Home, FolderOpen, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { name: 'İdarə Paneli', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Müqavilələr', path: '/contracts', icon: FileText },
    { name: 'Obyektlər', path: '/properties', icon: Home },
    { name: 'Sənədlər', path: '/documents', icon: FolderOpen },
    { name: 'Sənəd Ustası', path: '/sanad-ustasi', icon: Sparkles, isSpecial: true },
];

export function BottomNav() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 h-[60px] bg-[#0C1220] border-t border-[#192840] flex justify-around items-center z-[100] md:hidden">
            {navItems.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                        cn(
                            'flex flex-col items-center justify-center w-full h-full transition-colors pt-1',
                            item.isSpecial
                                ? 'bg-[#C9A84C]/10 rounded-xl my-1 mx-1 text-[#C9A84C]'
                                : isActive
                                    ? 'text-[#C9A84C]'
                                    : 'text-[#4A6080] hover:text-[#E8F0FE]'
                        )
                    }
                >
                    {({ isActive }) => (
                        <>
                            <item.icon
                                className={cn(
                                    'h-5 w-5 mb-1',
                                    item.isSpecial
                                        ? 'text-[#C9A84C]'
                                        : isActive ? 'text-[#C9A84C]' : 'text-[#4A6080]'
                                )}
                            />
                            <span className={cn("text-[10px] whitespace-nowrap", item.isSpecial && "font-bold tracking-wide")}>
                                {item.name}
                            </span>
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
}
