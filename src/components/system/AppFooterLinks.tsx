import { Link } from "react-router-dom";

export function AppFooterLinks() {
  return (
    <nav
      aria-label="Legal links"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 8,
        transform: "translateX(-50%)",
        zIndex: 2147483647,
        fontSize: 10,
        lineHeight: 1.2,
        opacity: 0.65,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        color: "rgba(255,255,255,0.7)",
        background: "transparent",
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      <Link
        to="/terms"
        className="hover:underline"
        style={{ color: "inherit", textDecorationColor: "currentColor" }}
      >
        Terms
      </Link>
      <span aria-hidden="true" style={{ margin: "0 6px" }}>
        •
      </span>
      <Link
        to="/privacy"
        className="hover:underline"
        style={{ color: "inherit", textDecorationColor: "currentColor" }}
      >
        Privacy Policy
      </Link>
    </nav>
  );
}
