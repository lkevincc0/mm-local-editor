/**
* @jest-environment jsdom
*/
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {ThemeProvider, useTheme} from "./ThemeContext";

const Probe = () => {
    const {theme, mode, setTheme, setMode} = useTheme();
    return (
        <div>
            <span data-testid="theme">{theme}</span>
            <span data-testid="mode">{mode}</span>
            <button onClick={() => setTheme("modern")}>set modern theme</button>
            <button onClick={() => setMode("modern")}>set modern mode</button>
        </div>
    );
};

const renderProbe = () => {
    render(
        <ThemeProvider>
            <Probe/>
        </ThemeProvider>
    );
};

describe("ThemeContext", () => {
    afterEach(cleanup);

    beforeEach(() => {
        localStorage.clear();
        delete document.documentElement.dataset.theme;
        delete document.documentElement.dataset.mode;
    });

    it("defaults to classic theme and classic mode", () => {
        renderProbe();
        expect(screen.getByTestId("theme").textContent).toBe("classic");
        expect(screen.getByTestId("mode").textContent).toBe("classic");
        expect(document.documentElement.dataset.theme).toBe("classic");
        expect(document.documentElement.dataset.mode).toBe("classic");
    });

    it("setTheme updates documentElement dataset and localStorage", () => {
        renderProbe();
        fireEvent.click(screen.getByText("set modern theme"));
        expect(screen.getByTestId("theme").textContent).toBe("modern");
        expect(document.documentElement.dataset.theme).toBe("modern");
        expect(JSON.parse(localStorage.getItem("ammber/ui-theme") ?? "")).toBe("modern");
    });

    it("setMode updates documentElement dataset and localStorage", () => {
        renderProbe();
        fireEvent.click(screen.getByText("set modern mode"));
        expect(screen.getByTestId("mode").textContent).toBe("modern");
        expect(document.documentElement.dataset.mode).toBe("modern");
        expect(JSON.parse(localStorage.getItem("ammber/ui-mode") ?? "")).toBe("modern");
    });
});
