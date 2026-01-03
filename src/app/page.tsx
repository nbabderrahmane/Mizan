import Link from "next/link";

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <h1 className="text-4xl font-bold mb-4">Mizan</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Shared budgeting for families and friends
            </p>
            <div className="flex gap-4">
                <Link
                    href="/auth/sign-in"
                    className="px-6 py-3 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
                >
                    Sign In
                </Link>
                <Link
                    href="/auth/sign-up"
                    className="px-6 py-3 border border-foreground rounded-lg hover:bg-foreground/5 transition-colors"
                >
                    Sign Up
                </Link>
            </div>
        </div>
    );
}
