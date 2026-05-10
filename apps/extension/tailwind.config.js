/** @type {import('tailwindcss').Config} */
export default {
  content: ["./popup.html", "./options.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: "#F5F0E8",
          surface: "#FBF8EF",
          elevated: "#E8E2D6",
          border: "#A9A297",
        },
        parchment: {
          50: "#17130D",
          100: "#29241C",
          200: "#5C554B",
          300: "#8B8375",
        },
        brass: {
          400: "#D89400",
          500: "#F0AA16",
          600: "#B97800",
        },
        sage: {
          500: "#1B9A55",
          600: "#147741",
        },
        brick: {
          500: "#C0382B",
          600: "#8F241D",
        },
      },
      fontFamily: {
        display: ['"IBM Plex Sans Condensed"', '"Barlow Condensed"', "sans-serif"],
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', "monospace"],
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
