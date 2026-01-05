"use client";

import { useState, useEffect } from "react";
import {
    Bell,
    Check,
    CheckCheck,
    Inbox as InboxIcon,
    Info,
    Mail,
    Settings,
    Loader2
} from "lucide-react";
import {
    listNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    Notification
} from "@/lib/actions/notification";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useTranslations } from "next-intl";

export function NotificationBell() {
    const t = useTranslations("Navigation");
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [open, setOpen] = useState(false);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    async function fetchNotifications() {
        const result = await listNotifications();
        if (result.success && result.data) {
            setNotifications(result.data);
        }
        setIsLoading(false);
    }

    useEffect(() => {
        fetchNotifications();
        // Refresh every minute
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    async function handleMarkRead(id: string) {
        await markNotificationRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }

    async function handleMarkAllRead() {
        await markAllNotificationsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }

    const getIcon = (type: string) => {
        switch (type) {
            case "INVITE": return <Mail className="h-4 w-4 text-blue-500" />;
            case "WORKSPACE_UPDATE": return <Settings className="h-4 w-4 text-amber-500" />;
            default: return <Info className="h-4 w-4 text-primary" />;
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className="relative flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full text-start"
                    onClick={() => setOpen(true)}
                >
                    <div className="relative">
                        <Bell className="h-4 w-4" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1.5 ltr:-right-1.5 rtl:-left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </div>
                    <span>{t("notifications")}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[calc(100vw-2rem)] md:w-80 p-0"
                align="center"
                side="bottom"
                sideOffset={10}
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold text-sm">{t("notifications")}</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-primary"
                            onClick={handleMarkAllRead}
                        >
                            <CheckCheck className="h-3 w-3 me-1" />
                            {t("markAllRead")}
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-80">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-2">
                            <InboxIcon className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">{t("allCaughtUp")}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={cn(
                                        "flex gap-3 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer relative group",
                                        !n.is_read && "bg-primary/5"
                                    )}
                                    onClick={() => {
                                        if (!n.is_read) handleMarkRead(n.id);
                                        if (n.href) {
                                            router.push(n.href);
                                            setOpen(false);
                                        }
                                    }}
                                >
                                    {!n.is_read && (
                                        <div className="absolute ltr:left-1 rtl:right-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />
                                    )}
                                    <div className="mt-1 flex-shrink-0">
                                        {getIcon(n.type)}
                                    </div>
                                    <div className="flex flex-col gap-1 min-w-0">
                                        <p className={cn("text-xs font-semibold leading-tight", !n.is_read ? "text-foreground" : "text-muted-foreground")}>
                                            {n.title}
                                        </p>
                                        {n.body && (
                                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                                                {n.body}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                    {!n.is_read && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ms-auto"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkRead(n.id);
                                            }}
                                        >
                                            <Check className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t text-center">
                    <Link
                        href="/inbox"
                        className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => setOpen(false)}
                    >
                        {t("viewAllNotifications")}
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    );
}
