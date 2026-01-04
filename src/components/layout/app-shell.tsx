"use client";

import { Link, useRouter } from "@/i18n/routing";
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
    User,
    UserPlus,
    Lock,
    Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkspaceSwitcher, WorkspaceItem } from "./workspace-switcher";
import { signOut } from "@/lib/actions/auth";
import { NotificationBell } from "./notification-bell";

import { useTranslations } from "next-intl";

interface AppShellProps {
    children: React.ReactNode;
    workspaces: WorkspaceItem[];
    currentWorkspaceId: string;
    userEmail?: string;
    isSupportAdmin?: boolean;
}

export function AppShell({
    children,
    workspaces,
    currentWorkspaceId,
    userEmail,
    isSupportAdmin,
}: AppShellProps) {
    const pathname = usePathname();
    const t = useTranslations("Navigation");

    const navItems = [
        { href: "dashboard", label: t("dashboard"), icon: LayoutDashboard },
        { href: "accounts", label: t("accounts"), icon: Wallet },
        { href: "categories", label: t("categories"), icon: Tags },
        { href: "transactions", label: t("transactions"), icon: Receipt },
        { href: "budgets", label: t("budgets"), icon: PiggyBank },
        { href: "reports", label: t("reports"), icon: LineChart },
        { href: "members", label: t("members"), icon: Users },
    ];

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
                        <NotificationBell />

                        {/* Settings dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                                    <Settings className="h-4 w-4" />
                                    {t("settings")}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="top" align="start" className="w-56">
                                <DropdownMenuLabel>{t("settings")}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href={`/w/${currentWorkspaceId}/settings/profile`}>
                                        <User className="mr-2 h-4 w-4" />
                                        {t("editProfile")}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={`/w/${currentWorkspaceId}/members`}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        {t("inviteContributor")}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={`/w/${currentWorkspaceId}/settings/password`}>
                                        <Lock className="mr-2 h-4 w-4" />
                                        {t("changePassword")}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href={`/w/${currentWorkspaceId}/settings/workspace`}>
                                        <Building className="mr-2 h-4 w-4" />
                                        {t("editWorkspace")}
                                    </Link>
                                </DropdownMenuItem>
                                {isSupportAdmin && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild className="text-primary hover:text-primary focus:text-primary">
                                            <Link href="/admin">
                                                <Lock className="mr-2 h-4 w-4" />
                                                {t("supportAdmin")}
                                            </Link>
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <form action={signOut}>
                            <button
                                type="submit"
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                {t("signout")}
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
                    <Link href={`/w/${currentWorkspaceId}/settings/workspace`}>
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
