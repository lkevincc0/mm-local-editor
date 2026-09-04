import React, {
    createContext,
    useContext,
    useEffect
} from "react";

import useLocalStorage from "../utils/useLocalStorage";

export type ThemeName = "classic" | "modern";
export type ModeName = "classic" | "modern";

type ThemeContextType = {
    theme: ThemeName;
    mode: ModeName;
    setTheme: (theme: ThemeName) => void;
    setMode: (mode: ModeName) => void;
    toggleTheme: () => void;
    toggleMode: () => void;
};

const ThemeContext =
    createContext<ThemeContextType | undefined>(
        undefined
    );

type ThemeProviderProps = {
    children: React.ReactNode;
};

export const ThemeProvider: React.FC<
    ThemeProviderProps
> = ({children}) => {
    const [theme, setTheme] =
        useLocalStorage<ThemeName>(
            "ammber/ui-theme",
            "classic"
        );

    const [mode, setMode] =
        useLocalStorage<ModeName>(
            "ammber/ui-mode",
            "classic"
        );

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
    }, [theme]);

    useEffect(() => {
        document.documentElement.dataset.mode = mode;
    }, [mode]);

    const toggleTheme = () => {
        setTheme(theme === "classic" ? "modern" : "classic");
    };

    const toggleMode = () => {
        setMode(mode === "classic" ? "modern" : "classic");
    };

    const value = {
        theme,
        mode,
        setTheme,
        setMode,
        toggleTheme,
        toggleMode
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context =
        useContext(ThemeContext);

    if (!context) {
        throw new Error(
            "useTheme must be used within ThemeProvider"
        );
    }

    return context;
};
