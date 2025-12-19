import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "./session";

/**
 * Validates the current session and optional roles.
 * Returns the session data if valid, otherwise returns a NextResponse with an error.
 */
export async function getSessionAndValidate(
    requiredRoles: string[] = []
): Promise<{ session: any; errorResponse?: NextResponse }> {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.username) {
        return {
            session,
            errorResponse: NextResponse.json(
                { success: false, error: "Authentication required" },
                { status: 401 }
            ),
        };
    }

    if (requiredRoles.length > 0) {
        const userRole = session.role?.toLowerCase() || "";
        const hasRole = requiredRoles.some(role =>
            userRole === role.toLowerCase() ||
            session.role === "ผู้ดูแลระบบ" // System Admin override
        );

        if (!hasRole) {
            return {
                session,
                errorResponse: NextResponse.json(
                    { success: false, error: "Insufficient permissions" },
                    { status: 403 }
                ),
            };
        }
    }

    return { session };
}
