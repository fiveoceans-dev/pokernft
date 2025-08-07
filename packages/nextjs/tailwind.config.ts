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
          secondary: "#4B0082",
          "secondary-content": "#FFFFFF",
          accent: "#CCFF00",
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
              "linear-gradient(270deg,#CCFF00 -17.42%, #4B0082 109.05%)",
          },
          ".bg-modal": {
            background:
              "linear-gradient(270deg,#F3F4F6 -17.42%, #E0E7FF 109.05%)",
          },
          ".modal-border": {
            border: "1px solid #4B0082",
          },
          ".bg-gradient-nav": {
            background: "linear-gradient(90deg,#CCFF00 0%, #4B0082 100%)",
          },
          ".bg-main": {
            background:
              "radial-gradient(at 50% 0%, rgba(204,255,0,0.4), rgba(75,0,130,0.2) 60%), #FFFFFF",
          },
          ".bg-underline": {
            background:
              "linear-gradient(270deg,#CCFF00 -17.42%, #4B0082 109.05%)",
          },
          ".bg-container": {
            background: "transparent",
          },
          ".bg-btn-wallet": {
            "background-image":
              "linear-gradient(90deg,#CCFF00 0%, #4B0082 100%)",
          },
          ".bg-input": {
            background: "rgba(0, 0, 0, 0.05)",
          },
          ".bg-component": {
            background: "rgba(255, 255, 255, 0.65)",
          },
          ".bg-function": {
            background:
              "linear-gradient(270deg,#CCFF00 -17.42%, #4B0082 109.05%)",
          },
          ".text-function": {
            color: "#4B0082",
          },
          ".text-network": {
            color: "#800020",
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
          primary: "#0A0A0A",
          "primary-content": "#E5E5E5",
          secondary: "#800020",
          "secondary-content": "#0A0A0A",
          accent: "#CCFF00",
          "accent-content": "#0A0A0A",
          neutral: "#1A1A1A",
          "neutral-content": "#E5E5E5",
          "base-100": "#0A0A0A",
          "base-200": "#1A1A1A",
          "base-300": "#2A2A2A",
          "base-content": "#E5E5E5",
          info: "#CCFF00",
          success: "#2ECC71",
          warning: "#FFD700",
          error: "#800020",
          ".bg-gradient-modal": {
            background: "#1A1A1A",
          },
          ".bg-modal": {
            background: "linear-gradient(90deg,#0A0A0A 0%, #1A1A1A 100%)",
          },
          ".modal-border": {
            border: "1px solid #CCFF00",
          },
          ".bg-gradient-nav": {
            "background-image":
              "linear-gradient(90deg,#CCFF00 0%,#4B0082 100%)",
          },
          ".bg-main": {
            background:
              "radial-gradient(at 50% 0%, rgba(75,0,130,0.15), rgba(128,0,32,0.1) 60%), #0A0A0A",
          },
          ".bg-underline": {
            background: "#2A2A2A",
          },
          ".bg-container": {
            background: "#1A1A1A",
          },
          ".bg-btn-wallet": {
            "background-image":
              "linear-gradient(180deg,#CCFF00 0%, #800020 100%)",
          },
          ".bg-input": {
            background: "rgba(255, 255, 255, 0.07)",
          },
          ".bg-component": {
            background:
              "linear-gradient(113deg,rgba(10,10,10,0.6) 20.48%,rgba(26,26,26,0.6) 99.67%)",
          },
          ".bg-function": {
            background: "rgba(204,255,0,0.2)",
          },
          ".text-function": {
            color: "#CCFF00",
          },
          ".text-network": {
            color: "#800020",
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
              "linear-gradient(113.34deg, rgba(10,10,10,0.6) 20.48%, rgba(26,26,26,0.6) 99.67%)",
          },
        },
      },
    ],
  },
  theme: {
    extend: {
      boxShadow: {
        center: "0 0 12px -2px rgb(0 0 0 / 0.05)",
        neon: "0 0 15px 0 rgba(204,255,0,0.7)",
        "neon-hover": "0 0 20px 0 rgba(204,255,0,0.7)",
        "neon-red": "0 0 10px 0 rgba(128,0,32,0.7)",
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      backgroundImage: {
        "gradient-light":
          "linear-gradient(270deg,#CCFF00 -17.42%, #4B0082 109.05%)",
        "gradient-dark": "linear-gradient(90deg,#CCFF00 0%, #800020 100%)",
        "gradient-vertical": "linear-gradient(180deg,#CCFF00 0%, #4B0082 100%)",
        "gradient-icon": "linear-gradient(90deg,#CCFF00 0%, #800020 100%)",
      },
      colors: {
        primary: "#0A0A0A",
        accent: "#CCFF00",
        secondary: "#4B0082",
        highlight: "#800020",
        background: "#1A1A1A",
        border: "#2A2A2A",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [daisyui],
};

export default config;
