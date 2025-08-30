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
        dark: {
          primary: "#0A0A0A",
          "primary-content": "#E5E5E5",
          secondary: "#280080", // Renaissance Indigo
          "secondary-content": "#0A0A0A",
          accent: "#CCFF00", // Cyber Yellow
          "accent-content": "#0A0A0A",
          neutral: "#1A1A1A",
          "neutral-content": "#E5E5E5",
          "base-100": "#0A0A0A",
          "base-200": "#1A1A1A",
          "base-300": "#2A2A2A",
          "base-content": "#E5E5E5",
          info: "#00FFFF", // Surreal Cyan
          success: "#2ECC71",
          warning: "#FFD700",
          error: "#2C4DFF", // Surreal Blue instead of red
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
              "linear-gradient(90deg,#CCFF00 0%,#280080 100%)",
          },
          ".bg-main": {
            background:
              "radial-gradient(at 50% 0%, rgba(75,0,130,0.15), rgba(44,77,255,0.1) 60%), #0A0A0A",
          },
          ".bg-underline": {
            background: "#2A2A2A",
          },
          ".bg-container": {
            background: "#1A1A1A",
          },
          ".bg-btn-wallet": {
            "background-image":
              "linear-gradient(180deg,#CCFF00 0%, #2C4DFF 100%)",
          },
          ".bg-input": {
            background: "rgba(255, 255, 255, 0.07)",
          },
          ".bg-component": {
            background:
              "linear-gradient(113deg,rgba(10,10,10,0.6) 20.48%,rgba(26,26,26,0.6) 99.67%)",
          },
          ".bg-function": {
            background: "rgba(44,77,255,0.2)",
          },
          ".text-function": {
            color: "#CCFF00",
          },
          ".text-network": {
            color: "#2C4DFF",
          },
          "--rounded-btn": "9999rem",
          ".tooltip": {
            "--tooltip-tail": "6px",
            "--tooltip-color": "#5c4fe5",
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
        "neon-blue": "0 0 10px 0 rgba(44,77,255,0.7)", // replaced neon-red
      },
      keyframes: {
        flip: {
          "0%": { transform: "rotateY(90deg)", opacity: "0" },
          "100%": { transform: "rotateY(0deg)", opacity: "1" },
        },
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        flip: "flip 0.6s ease-out forwards",
      },
      backgroundImage: {
        "gradient-dark": "linear-gradient(90deg,#CCFF00 0%, #2C4DFF 100%)",
        "gradient-vertical": "linear-gradient(180deg,#CCFF00 0%, #280080 100%)",
        "gradient-icon": "linear-gradient(90deg,#CCFF00 0%, #2C4DFF 100%)",
      },
      colors: {
        primary: "#0A0A0A",
        accent: "#CCFF00",
        secondary: "#280080", // Renaissance Indigo
        highlight: "#2C4DFF", // Surreal Electric Blue
        ethereal: "#00FFFF", // Surreal Cyan
        background: "#0A192F", // Midnight Blue
        border: "#2A2A2A",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        "serif-renaissance": ["Cinzel", "serif"],
        "serif-body": ["Lora", "serif"],
      },
    },
  },
  plugins: [daisyui],
};

export default config;
