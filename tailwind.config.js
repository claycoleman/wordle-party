module.exports = {
  mode: "jit",
  purge: {
    enabled: process.env.NODE_ENV === "production",
    safelist: [
      {
        // we use dynamic classes for these
        pattern: /delay-.+/,
      },
    ],
    content: ["./index.html", "./src/**/*.tsx", "./src/**/*.ts"],
  },
  theme: {
    extend: {
      minWidth: {
        40: "10rem",
        60: "15rem",
        80: "20rem",
        100: "25rem",
      },
      maxWidth: {
        120: "30rem",
        160: "40rem",
        200: "50rem",
      },
      keyframes: {
        pop: {
          from: { transform: "scale(0.8)" },
          "40%": { transform: "scale(1.15)" },
        },
      },
      animation: {
        pop: "pop 100ms",
      },
      transitionDelay: {
        300: "300ms",
        600: "600ms",
        900: "900ms",
        1200: "1200ms",
        1500: "1500ms",
        1800: "1800ms",
        2100: "2100ms",
      },
    },
  },
  variants: {},
  plugins: [require("daisyui"), require("tailwindcss-animate")],
  daisyui: {
    // themes: [
    //   'business',
    //   'night',
    //   'emerald',
    // ],
    // themes: true,
    themes: [
      {
        custom:
          // {
          //   primary: "#36f9c9",

          //   secondary: "#2f9caf",

          //   accent: "#83ead5",

          //   neutral: "#121521",

          //   "base-100": "#2D3039",

          //   info: "#AFC5E9",

          //   success: "#1FC762",

          //   warning: "#926107",

          //   error: "#F6606C",
          // },
          {
            primary: "#0369a1",

            secondary: "#5eead4",

            accent: "#134e4a",

            neutral: "#121521",

            "base-100": "#2D3039",

            info: "#AFC5E9",

            success: "#1FC762",

            warning: "#eab308",

            error: "#dc2626",
          },
      },
      "emerald",
      // "light",
      // "dark",
      // "cupcake",
      // "bumblebee",
      // "corporate",
      // "synthwave",
      // "retro",
      // "cyberpunk",
      // "valentine",
      // "halloween",
      // "garden",
      // "forest",
      // "aqua",
      // "lofi",
      // "pastel",
      // "fantasy",
      // "wireframe",
      // "black",
      // "luxury",
      // "dracula",
      // "cmyk",
      // "autumn",
      // "business",
      // "acid",
      // "lemonade",
      // "night",
      // "coffee",
      // "winter",
    ],
  },
};
