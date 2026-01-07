"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("[Global Error]", error);
    }, [error]);

    return (
        <html>
            <body>
                <div
                    style={{
                        minHeight: "100vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "1rem",
                        fontFamily: "system-ui, sans-serif",
                        backgroundColor: "#fafafa",
                    }}
                >
                    <div
                        style={{
                            maxWidth: "400px",
                            width: "100%",
                            textAlign: "center",
                        }}
                    >
                        <div
                            style={{
                                width: "64px",
                                height: "64px",
                                borderRadius: "50%",
                                backgroundColor: "#fee2e2",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 1.5rem",
                            }}
                        >
                            <AlertTriangle
                                style={{ width: "32px", height: "32px", color: "#dc2626" }}
                            />
                        </div>

                        <h1
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: "bold",
                                marginBottom: "0.5rem",
                                color: "#111",
                            }}
                        >
                            Application Error
                        </h1>

                        <p
                            style={{
                                color: "#666",
                                marginBottom: "1.5rem",
                            }}
                        >
                            A critical error occurred. Please refresh the page.
                        </p>

                        {error.digest && (
                            <p
                                style={{
                                    fontSize: "0.75rem",
                                    color: "#888",
                                    fontFamily: "monospace",
                                    backgroundColor: "#f3f4f6",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "0.375rem",
                                    marginBottom: "1.5rem",
                                }}
                            >
                                Error ID: {error.digest}
                            </p>
                        )}

                        <button
                            onClick={reset}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.5rem",
                                backgroundColor: "#111",
                                color: "#fff",
                                padding: "0.75rem 1.5rem",
                                borderRadius: "0.5rem",
                                border: "none",
                                fontSize: "0.875rem",
                                fontWeight: "500",
                                cursor: "pointer",
                            }}
                        >
                            <RefreshCw style={{ width: "16px", height: "16px" }} />
                            Refresh Page
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
