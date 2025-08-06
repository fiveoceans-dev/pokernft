import type { Config } from "tailwindcss";
import daisyui from "daisyui";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkTheme: "dark",
  daisyui: {
    themes: [
      {
        light: {
          primary: "#3B82F6",
          "primary-content": "#FFFFFF",
          secondary: "#7C3AED",
          "secondary-content": "#FFFFFF",
          accent: "#38BDF8",
          "accent-content": "#1F2937",
          neutral: "#1F2937",
          "neutral-content": "#FFFFFF",
          "base-100": "#FFFFFF",
          "base-200": "#F3F4F6",
          "base-300": "#E5E7EB",
          "base-content": "#1F2937",
          info: "#3B82F6",
          success: "#10B981",
          warning: "#FBBF24",
          error: "#EF4444",
          ".bg-gradient-modal": {
            "background-image":
              "linear-gradient(270deg,#93C5FD -17.42%, #D8B4FE 109.05%)",
          },
          ".bg-modal": {
            background:
              "linear-gradient(270deg,#F3F4F6 -17.42%, #E0E7FF 109.05%)",
          },
          ".modal-border": {
            border: "1px solid #7C3AED",
          },
          ".bg-gradient-nav": {
            background:
              "linear-gradient(90deg,#3B82F6 0%, #7C3AED 100%)",
          },
          ".bg-main": {
            background:
              "radial-gradient(at 50% 0%, rgba(147,197,253,0.4), rgba(216,180,254,0.2) 60%), #FFFFFF",
          },
          ".bg-underline": {
            background:
              "linear-gradient(270deg,#93C5FD -17.42%, #D8B4FE 109.05%)",
          },
          ".bg-container": {
            background: "transparent",
          },
          ".bg-btn-wallet": {
            "background-image":
              "linear-gradient(90deg,#3B82F6 0%, #7C3AED 100%)",
          },
          ".bg-input": {
            background: "rgba(0, 0, 0, 0.05)",
          },
          ".bg-component": {
            background: "rgba(255, 255, 255, 0.65)",
          },
          ".bg-function": {
            background:
              "linear-gradient(270deg,#93C5FD -17.42%, #D8B4FE 109.05%)",
          },
          ".text-function": {
            color: "#7C3AED",
          },
          ".text-network": {
            color: "#3B82F6",
          },
          "--rounded-btn": "9999rem",
          ".tooltip": {
            "--tooltip-tail": "6px",
          },
          ".link": {
            textUnderlineOffset: "2px",
          },
          ".link:hover": {
            opacity: "80%",
          },
          ".contract-content": {
            background: "white",
          },
        },
      },
      {
        dark: {
          primary: "#0D1117",
          "primary-content": "#E2E8F0",
          secondary: "#7C3AED",
          "secondary-content": "#C4B5FD",
          accent: "#38BDF8",
          "accent-content": "#0F172A",
          neutral: "#F9FAFB",
          "neutral-content": "#0F172A",
          "base-100": "#0D1117",
          "base-200": "#1B1E32",
          "base-300": "#111827",
          "base-content": "#F9FAFB",
          info: "#38BDF8",
          success: "#10B981",
          warning: "#FBBF24",
          error: "#F87171",
          ".bg-gradient-modal": {
            background: "#1E3A8A",
          },
          ".bg-modal": {
            background:
              "linear-gradient(90deg,#1E1B4B 0%, #1B2838 100%)",
          },
          ".modal-border": {
            border: "1px solid #4B5563",
          },
          ".bg-gradient-nav": {
            "background-image":
              "linear-gradient(90deg,#38BDF8 0%, #7C3AED 100%)",
          },
          ".bg-main": {
            background:
              "radial-gradient(at 50% 0%, rgba(56,189,248,0.25), rgba(124,58,237,0.15) 60%), #0D1117",
          },
          ".bg-underline": {
            background: "#374151",
          },
          ".bg-container": {
            background: "#1B1E32",
          },
          ".bg-btn-wallet": {
            "background-image":
              "linear-gradient(180deg,#3B82F6 0%, #7C3AED 100%)",
          },
          ".bg-input": {
            background: "rgba(255, 255, 255, 0.07)",
          },
          ".bg-component": {
            background:
              "linear-gradient(113deg,rgba(30,27,75,0.6) 20.48%,rgba(27,40,56,0.6) 99.67%)",
          },
          ".bg-function": {
            background: "rgba(124,58,237,0.37)",
          },
          ".text-function": {
            color: "#38BDF8",
          },
          ".text-network": {
            color: "#D8B4FE",
          },
          "--rounded-btn": "9999rem",
          ".tooltip": {
            "--tooltip-tail": "6px",
            "--tooltip-color": "oklch(var(--p))",
          },
          ".link": {
            textUnderlineOffset: "2px",
          },
          ".link:hover": {
            opacity: "80%",
          },
          ".contract-content": {
            background:
              "linear-gradient(113.34deg, rgba(30,27,75,0.6) 20.48%, rgba(27,40,56,0.6) 99.67%)",
          },
        },
      },
    ],
  },
  theme: {
    extend: {
      boxShadow: {
        center: "0 0 12px -2px rgb(0 0 0 / 0.05)",
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      backgroundImage: {
        "gradient-light":
          "linear-gradient(270deg,#93C5FD -17.42%, #D8B4FE 109.05%)",
        "gradient-dark":
          "linear-gradient(90deg,#38BDF8 0%, #7C3AED 100%)",
        "gradient-vertical":
          "linear-gradient(180deg,#3B82F6 0%, #7C3AED 100%)",
        "gradient-icon":
          "linear-gradient(90deg,#38BDF8 0%, #7C3AED 100%)",
      },
      colors: {
        primary: "#0D1117",
        accent: "#38BDF8",
        background: "#F9FAFB",
        border: "#E5E7EB",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [daisyui],
};

export default config;
