// themeTokens.ts
// JS-side theme colors for rendering that CSS custom properties cannot reach
// (maxgraph canvas styles, inline styles, third-party components).

export type ThemeName = "classic" | "modern";

export type ThemeTokens = {
    graph: {
        vertexFill: string;
        vertexStroke: string;
        fontColor: string;
        canvasBackground: string;
        negativeFill: string;
    };
    tree: {
        rowBorder: string;
        selectedBg: string;
        dangerColor: string;
        mutedText: string;
    };
    colorButtons: {
        presets: string[];
    };
};

export const themeTokens: Record<ThemeName, ThemeTokens> = {
    modern: {
        graph: {
            vertexFill: "#ffffff",
            vertexStroke: "#000000",
            fontColor: "black",
            canvasBackground: "#ffffff",
            negativeFill: "grey"
        },
        tree: {
            rowBorder: "#deddd6",
            selectedBg: "#e0e0e0",
            dangerColor: "#FF474C",
            mutedText: "#666"
        },
        colorButtons: {
            presets: ["#DB3545", "#FFC107", "#198754"]
        }
    },
    classic: {
        graph: {
            vertexFill: "#ffffff",
            vertexStroke: "#000000",
            fontColor: "black",
            canvasBackground: "#ffffff",
            negativeFill: "grey"
        },
        tree: {
            rowBorder: "#dee2e6",
            selectedBg: "rgba(13, 110, 253, 0.12)",
            dangerColor: "#dc3545",
            mutedText: "#6c757d"
        },
        colorButtons: {
            presets: ["#DB3545", "#FFC107", "#198754"]
        }
    }
};

// Reads the theme currently applied to <html data-theme>. For non-hook
// contexts (module-level constants, graph stylesheet setup) where
// useTheme() is unavailable.
export const getCurrentTheme = (): ThemeName =>
    typeof document !== "undefined" &&
    document.documentElement.dataset.theme === "modern"
        ? "modern"
        : "classic";

export const getThemeTokens = (): ThemeTokens => themeTokens[getCurrentTheme()];
