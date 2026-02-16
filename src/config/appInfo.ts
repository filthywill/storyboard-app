export const APP_VERSION =
  import.meta.env.VITE_APP_VERSION ??
  import.meta.env.VERCEL_GIT_COMMIT_SHA ??
  "dev";

export const APP_ENV =
  import.meta.env.VITE_APP_ENV ??
  import.meta.env.VERCEL_ENV ??
  (import.meta.env.PROD ? "production" : "local");
