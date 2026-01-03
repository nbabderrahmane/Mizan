"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Wallet,
    Tags,
    Receipt,
    PiggyBank,
    LineChart,
    Users,
    Bell,
    Settings,
    LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WorkspaceSwitcher, WorkspaceItem } from "./workspace-switcher";
import { signOut } from "@/app/auth/actions";

interface AppShellProps {
    children: React.ReactNode;
    workspaces: WorkspaceItem[];
    currentWorkspaceId: string;
    userEmail?: string;
}

const navItems = [
    { href: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "accounts", label: "Accounts", icon: Wallet },
    { href: "categories", label: "Categories", icon: Tags },
    { href: "transactions", label: "Transactions", icon: Receipt },
    { href: "provisions", label: "Provisions", icon: PiggyBank },
    { href: "budgets", label: "Budgets", icon: LineChart },
    { href: "members", label: "Members", icon: Users },
];

export function AppShell({
    children,
    workspaces,
    currentWorkspaceId,
    userEmail,
}: AppShellProps) {
    const pathname = usePathname();

    const isActive = (href: string) => {
        return pathname.includes(`/w/${currentWorkspaceId}/${href}`);
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-card border-r">
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="h-16 flex items-center px-4 border-b">
                        <Link href="/" className="font-bold text-xl">
                            Mizan
                        </Link>
                    </div>

                    {/* Workspace Switcher */}
                    <div className="p-4 border-b">
                        <WorkspaceSwitcher
                            workspaces={workspaces}
                            currentWorkspaceId={currentWorkspaceId}
                        />
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={`/w/${currentWorkspaceId}/${item.href}`}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                                    isActive(item.href)
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Bottom Links */}
                    <div className="p-4 border-t space-y-1">
                        <Link
                            href="/inbox"
                            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <Bell className="h-4 w-4" />
                            Notifications
                        </Link>
                        <Link
                            href="/settings/profile"
                            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <Settings className="h-4 w-4" />
                            Settings
                        </Link>
                        <form action={signOut}>
                            <button
                                type="submit"
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign out
                            </button>
                        </form>
                        {userEmail && (
                            <p className="px-3 py-2 text-xs text-muted-foreground truncate">
                                {userEmail}
                            </p>
                        )}
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t">
                <div className="flex justify-around items-center h-16">
                    {navItems.slice(0, 5).map((item) => (
                        <Link
                            key={item.href}
                            href={`/w/${currentWorkspaceId}/${item.href}`}
                            className={cn(
                                "flex flex-col items-center gap-1 px-3 py-2 text-xs",
                                isActive(item.href)
                                    ? "text-primary"
                                    : "text-muted-foreground"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>

            {/* Mobile Header */}
            <header className="md:hidden h-14 flex items-center justify-between px-4 border-b bg-card fixed top-0 left-0 right-0 z-40">
                <Link href="/" className="font-bold text-lg">
                    Mizan
                </Link>
                <div className="flex items-center gap-2">
                    <Link href="/inbox">
                        <Button variant="ghost" size="icon">
                            <Bell className="h-5 w-5" />
                        </Button>
                    </Link>
                    <Link href="/settings/profile">
                        <Button variant="ghost" size="icon">
                            <Settings className="h-5 w-5" />
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 md:ml-64">
                <div className="pt-14 pb-16 md:pt-0 md:pb-0 min-h-screen">
                    {children}
                </div>
            </main>
        </div>
    );
}
