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
    Plus,
    Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CreateTransactionDialog } from "@/components/transactions/create-transaction-dialog";
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
    accounts?: any[];
    categories?: any[];
}

export function AppShell({
    children,
    workspaces,
    currentWorkspaceId,
    userEmail,
    isSupportAdmin,
    accounts = [],
    categories = [],
}: AppShellProps) {
    const pathname = usePathname();
    const t = useTranslations("Navigation");
    const common = useTranslations("Common");

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
            <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 ltr:left-0 rtl:right-0 bg-card ltr:border-r rtl:border-l">
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

                    {/* Global Add Transaction Button */}
                    <div className="px-4 py-2">
                        <CreateTransactionDialog
                            workspaceId={currentWorkspaceId}
                            accounts={accounts}
                            categories={categories}
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
                        <div className="flex items-center justify-between mb-2">
                            <NotificationBell />
                            <ThemeToggle />
                        </div>

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
                                        <User className="me-2 h-4 w-4" />
                                        {t("editProfile")}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={`/w/${currentWorkspaceId}/members`}>
                                        <UserPlus className="me-2 h-4 w-4" />
                                        {t("inviteContributor")}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={`/w/${currentWorkspaceId}/settings/password`}>
                                        <Lock className="me-2 h-4 w-4" />
                                        {t("changePassword")}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href={`/w/${currentWorkspaceId}/settings/workspace`}>
                                        <Building className="me-2 h-4 w-4" />
                                        {t("editWorkspace")}
                                    </Link>
                                </DropdownMenuItem>
                                {isSupportAdmin && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild className="text-primary hover:text-primary focus:text-primary">
                                            <Link href="/admin">
                                                <Lock className="me-2 h-4 w-4" />
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
                <div className="grid grid-cols-5 h-16 items-center">
                    {/* Dashboard */}
                    <Link
                        href={`/w/${currentWorkspaceId}/dashboard`}
                        className={cn(
                            "flex flex-col items-center gap-1 text-[10px]",
                            isActive("dashboard") ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        <LayoutDashboard className="h-5 w-5" />
                        <span>{t("dashboard")}</span>
                    </Link>

                    {/* Transactions */}
                    <Link
                        href={`/w/${currentWorkspaceId}/transactions`}
                        className={cn(
                            "flex flex-col items-center gap-1 text-[10px]",
                            isActive("transactions") ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        <Receipt className="h-5 w-5" />
                        <span>{t("transactions")}</span>
                    </Link>

                    {/* Central Add Button */}
                    <div className="flex items-center justify-center relative">
                        <div className="absolute -top-6">
                            <CreateTransactionDialog
                                workspaceId={currentWorkspaceId}
                                accounts={accounts}
                                categories={categories}
                                trigger={
                                    <Button size="icon" className="h-14 w-14 rounded-full shadow-xl border-4 border-background bg-primary text-primary-foreground hover:scale-105 transition-transform">
                                        <Plus className="h-8 w-8" />
                                    </Button>
                                }
                            />
                        </div>
                    </div>

                    {/* Spacer to maintain grid balance */}
                    <div />

                    {/* Actions Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground">
                                <Menu className="h-5 w-5" />
                                <span>{common("actions")}</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 mb-2">
                            <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">{common("actions")}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={`/w/${currentWorkspaceId}/accounts`} className="flex items-center gap-2">
                                    <Wallet className="h-4 w-4" />
                                    {t("accounts")}
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={`/w/${currentWorkspaceId}/budgets`} className="flex items-center gap-2">
                                    <PiggyBank className="h-4 w-4" />
                                    {t("budgets")}
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={`/w/${currentWorkspaceId}/categories`} className="flex items-center gap-2">
                                    <Tags className="h-4 w-4" />
                                    {t("categories")}
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={`/w/${currentWorkspaceId}/reports`} className="flex items-center gap-2">
                                    <LineChart className="h-4 w-4" />
                                    {t("reports")}
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={`/w/${currentWorkspaceId}/members`} className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    {t("members")}
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </nav>

            {/* Mobile Header */}
            <header className="md:hidden h-14 flex items-center justify-between px-4 border-b bg-card fixed top-0 left-0 right-0 z-40">
                <div className="flex items-center gap-2 h-full py-2">
                    <Link href="/" className="font-bold text-lg flex items-center h-full">
                        Mizan
                    </Link>
                    <div className="w-40">
                        <WorkspaceSwitcher
                            workspaces={workspaces}
                            currentWorkspaceId={currentWorkspaceId}
                        />
                    </div>
                </div>
                <div className="flex items-center h-full gap-1">
                    <ThemeToggle />
                    <NotificationBell />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Settings className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>{t("settings")}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={`/w/${currentWorkspaceId}/settings/profile`}>
                                    <User className="me-2 h-4 w-4" />
                                    {t("editProfile")}
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={`/w/${currentWorkspaceId}/settings/password`}>
                                    <Lock className="me-2 h-4 w-4" />
                                    {t("changePassword")}
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={`/w/${currentWorkspaceId}/settings/workspace`}>
                                    <Building className="me-2 h-4 w-4" />
                                    {t("editWorkspace")}
                                </Link>
                            </DropdownMenuItem>
                            {isSupportAdmin && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild className="text-primary hover:text-primary focus:text-primary">
                                        <Link href="/admin">
                                            <Lock className="me-2 h-4 w-4" />
                                            {t("supportAdmin")}
                                        </Link>
                                    </DropdownMenuItem>
                                </>
                            )}
                            <DropdownMenuSeparator />
                            <form action={signOut}>
                                <button type="submit" className="w-full">
                                    <DropdownMenuItem className="text-destructive">
                                        <LogOut className="me-2 h-4 w-4" />
                                        {t("signout")}
                                    </DropdownMenuItem>
                                </button>
                            </form>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 md:ms-64">
                <div className="pt-14 pb-16 md:pt-0 md:pb-0 min-h-screen">
                    {children}
                </div>
            </main>
        </div>
    );
}
