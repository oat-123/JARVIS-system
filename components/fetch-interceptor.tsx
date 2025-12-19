"use client";

import { useEffect } from "react";

export function FetchInterceptor() {
    useEffect(() => {
        const { fetch: originalFetch } = window;

        window.fetch = async (...args) => {
            const response = await originalFetch(...args);

            // Handle 401 Unauthorized globally
            if (response.status === 401) {
                // Skip for auth-related paths to avoid recursion
                const url = args[0] ? args[0].toString() : "";
                if (url.includes("/api/auth/login") || url.includes("/api/auth/user")) {
                    return response;
                }

                console.warn("[SECURITY] Session expired (401) detected by interceptor.");

                const refreshKey = "jarvis_auth_refresh_tried";
                const lastRefresh = sessionStorage.getItem(refreshKey);
                const now = Date.now();

                // If we haven't tried refreshing in the last 15 seconds
                if (!lastRefresh || (now - parseInt(lastRefresh)) > 15000) {
                    sessionStorage.setItem(refreshKey, now.toString());
                    console.log("Forcing page refresh to restore session...");
                    window.location.reload();
                    // Return a dummy promise that won't resolve as page is reloading
                    return new Promise<Response>(() => { });
                } else {
                    // Already refreshed recently, redirect to login
                    sessionStorage.removeItem(refreshKey);
                    console.error("Session restoration failed. Redirecting to login...");
                    window.location.href = "/";
                    return new Promise<Response>(() => { });
                }
            }

            return response;
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    return null;
}
