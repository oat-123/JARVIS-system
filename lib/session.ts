// lib/session.ts
import { IronSession } from "iron-session";

export interface SessionData {
  username?: string;
  role?: string;
  db?: string;
}

const sessionPassword = process.env.SESSION_PASSWORD;

if (!sessionPassword) {
  console.warn(
    "[WARN] SESSION_PASSWORD environment variable is not set. " +
    "Using a default value for development purposes only. " +
    "Please set a long, complex, and secret password in your .env.local file for production."
  );
}

export const sessionOptions = {
  password: sessionPassword || "complex_password_at_least_32_characters_long_for_dev",
  cookieName: "jarvis-app-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};