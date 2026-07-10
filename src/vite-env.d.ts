/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_ENABLE_ANALYTICS?: string;
  readonly VITE_APP_VERSION?: string;
  /** Public Pro checkout offer: "founding" (default) or "standard". */
  readonly VITE_PUBLIC_PRO_OFFER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
