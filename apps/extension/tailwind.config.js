/** @type {import('tailwindcss').Config} */
export default {
  content: ["./popup.html", "./options.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: "#0F0E0C",
          surface: "#1A1917",
          elevated: "#242320",
          border: "#2E2C28",
        },
        parchment: {
          50: "#F5F0E8",
          100: "#E8E2D6",
          200: "#A39E94",
          300: "#6B665E",
        },
        brass: {
          400: "#C9A96E",
          500: "#D4A853",
          600: "#B8933F",
        },
        sage: {
          500: "#5A8F6E",
          600: "#4A7A5C",
        },
        brick: {
          500: "#B54A4A",
          600: "#963D3D",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      animation: {
        "seal-stamp": "sealStamp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "fade-up": "fadeUp 0.4s ease-out forwards",
        shimmer: "shimmer 2s linear infinite",
        "pulse-brass": "pulseBrass 2s ease-in-out infinite",
      },
      keyframes: {
        sealStamp: {
          "0%": { transform: "scale(2.5) rotate(-15deg)", opacity: "0" },
          "50%": { transform: "scale(0.9) rotate(3deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseBrass: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [],
};
