import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F4EE",
        card: "#FFFFFF",
        ink: { DEFAULT: "#16130F", soft: "#3B362F", muted: "#77706A", faint: "#A8A199" },
        line: "#E7E1D6",
        accent: { DEFAULT: "#5B3DF5", dark: "#4128D6", soft: "#EEEAFF" },
        gold: { DEFAULT: "#C98A06", soft: "#FFF3D1", ink: "#7A5200" },
        mint: { DEFAULT: "#0F8A5F", soft: "#E3F6EE" },
        ember: { DEFAULT: "#C2410C", soft: "#FDECE3" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(22,19,15,0.04), 0 8px 24px -12px rgba(22,19,15,0.12)",
        lift: "0 2px 4px rgba(22,19,15,0.05), 0 20px 40px -16px rgba(22,19,15,0.22)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: { "fade-up": "fade-up .35s ease-out both" },
    },
  },
  plugins: [],
} satisfies Config;
