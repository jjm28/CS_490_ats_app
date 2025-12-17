import * as Sentry from "@sentry/node";
import "./config/env.js";

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    enabled: !!process.env.SENTRY_DSN,
    tracesSampleRate: 0,
})