/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: "var(--color-bg)",
                surface: "var(--color-surface)",
                card: "var(--color-card)",
                border: "var(--color-border)",
                gold: "var(--color-gold)",
                gold2: "var(--color-gold2)",
                blue: "var(--color-blue)",
                green: "var(--color-green)",
                red: "var(--color-red)",
                orange: "var(--color-orange)",
                text: "var(--color-text)",
                muted: "var(--color-muted)",
            },
            fontFamily: {
                sans: ["Outfit", "sans-serif"],
                display: ["Playfair Display", "serif"],
                heading: ["Playfair Display", "serif"],
            },
        },
    },
    plugins: [],
}
