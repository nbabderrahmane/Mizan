import { checkAdminAccess } from "@/app/[locale]/admin/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, SidebarClose } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const isAdmin = await checkAdminAccess();

    if (!isAdmin) {
        redirect("/");
    }

    return (
        <div className="flex min-h-screen flex-col bg-muted/20">
            <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-6 shadow-sm">
                <Link href="/admin" className="font-semibold text-lg flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">SUPPORT</span>
                    Mizan Admin
                </Link>
                <nav className="flex items-center gap-4 ml-6 text-sm font-medium">
                    <Link href="/admin" className="transition-colors hover:text-primary">Dashboard</Link>
                    <Link href="/admin/workspaces" className="transition-colors hover:text-primary">Workspaces</Link>
                    <Link href="/admin/users" className="transition-colors hover:text-primary">Users</Link>
                </nav>
                <div className="ml-auto">
                    <Button asChild size="sm" variant="ghost">
                        <Link href="/role-selection">
                            Exit to App
                            <SidebarClose className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </header>
            <main className="flex-1 p-6">
                {children}
            </main>
        </div >
    );
}
