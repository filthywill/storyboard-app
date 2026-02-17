export const APP_VERSION =
  import.meta.env.VITE_APP_VERSION ?? "dev";

export const APP_ENV =
  import.meta.env.VITE_APP_ENV ??
  (import.meta.env.PROD ? "production" : "local");
