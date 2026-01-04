"use client";

import { useState, useEffect } from "react";
import { Notification, listNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Inbox as InboxIcon, CheckCheck, Check, Mail, Settings, Info, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function InboxPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    async function fetchNotifications() {
        const result = await listNotifications(50);
        if (result.success && result.data) {
            setNotifications(result.data);
        }
        setIsLoading(false);
    }

    useEffect(() => {
        fetchNotifications();
    }, []);

    const unreadCount = notifications.filter(n => !n.is_read).length;

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
            case "INVITE": return <Mail className="h-5 w-5 text-blue-500" />;
            case "WORKSPACE_UPDATE": return <Settings className="h-5 w-5 text-amber-500" />;
            default: return <Info className="h-5 w-5 text-primary" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Inbox</h1>
                        <p className="text-sm text-muted-foreground">
                            You have {unreadCount} unread notifications
                        </p>
                    </div>
                </div>
                {unreadCount > 0 && (
                    <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                        <CheckCheck className="h-4 w-4 mr-2" />
                        Mark all as read
                    </Button>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                <InboxIcon className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <div className="space-y-1">
                                <p className="font-semibold text-lg">Your inbox is empty</p>
                                <p className="text-muted-foreground text-sm">When you receive notifications, they'll appear here.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={cn(
                                        "flex gap-4 p-6 transition-colors relative group",
                                        !n.is_read ? "bg-primary/5" : "hover:bg-muted/30"
                                    )}
                                >
                                    <div className="mt-1 flex-shrink-0">
                                        <div className="w-10 h-10 rounded-full bg-background border flex items-center justify-center shadow-sm">
                                            {getIcon(n.type)}
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className={cn("font-semibold text-sm", !n.is_read ? "text-foreground" : "text-muted-foreground")}>
                                                {n.title}
                                            </h3>
                                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                        {n.body && (
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {n.body}
                                            </p>
                                        )}
                                        <div className="pt-2 flex items-center gap-3">
                                            {n.href && (
                                                <Button asChild variant="link" className="h-auto p-0 text-xs h-6">
                                                    <Link href={n.href}>View Details</Link>
                                                </Button>
                                            )}
                                            {!n.is_read && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary"
                                                    onClick={() => handleMarkRead(n.id)}
                                                >
                                                    <Check className="h-3 w-3 mr-1" />
                                                    Mark as read
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
