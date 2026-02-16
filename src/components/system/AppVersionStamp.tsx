import { APP_ENV, APP_VERSION } from "@/config/appInfo";

export function AppVersionStamp() {
  const versionLabel =
    APP_VERSION === "dev" ? "vdev" : `v${APP_VERSION.slice(0, 7)}`;

  return (
    <div
      style={{
        position: "fixed",
        right: 8,
        bottom: 8,
        zIndex: 2147483647,
        pointerEvents: "none",
        fontSize: 10,
        lineHeight: 1.2,
        opacity: 0.55,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        color: "rgba(255,255,255,0.7)",
        background: "transparent",
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
      aria-hidden="true"
    >
      {versionLabel} • {APP_ENV}
    </div>
  );
}

