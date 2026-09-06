// Tokens straight from DESIGN.md — never invent a colour, radius, or spacing
// value outside this file (CLAUDE.md).
import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#ffffff",
      primary: "#1D5FD1",
      ink: "#1C2230",
      slate: {
        50: "#F8FAFC",
        100: "#F1F5F9",
        200: "#E2E8F0",
        300: "#CBD5E1",
        400: "#94A3B8",
        500: "#64748B",
        600: "#475569",
        700: "#334155",
        800: "#1E293B",
        900: "#0F172A",
      },
      green: "#1D7A3A",
      amber: "#A56A00",
      red: "#B42318",
    },
    fontFamily: {
      sans: ["Inter", "Noto Sans", "sans-serif"],
    },
    fontSize: {
      xs: "11px",
      sm: "13px",
      base: "15px",
      lg: "20px",
      xl: "28px",
    },
    spacing: {
      0: "0px",
      1: "4px",
      2: "8px",
      3: "12px",
      4: "16px",
      6: "24px",
      8: "32px",
      12: "48px",
    },
    borderRadius: {
      none: "0px",
      DEFAULT: "8px",
      full: "9999px",
    },
    extend: {
      transitionDuration: {
        DEFAULT: "150ms",
      },
      transitionTimingFunction: {
        DEFAULT: "ease-out",
      },
      boxShadow: {
        menu: "0 4px 16px rgba(28, 34, 48, 0.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;
