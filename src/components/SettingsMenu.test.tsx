/**
* @jest-environment jsdom
*/
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import SettingsMenu from "./SettingsMenu";
import {ThemeProvider} from "./context/ThemeContext";

const renderButton = () => {
    return render(
        <ThemeProvider>
            <SettingsMenu/>
        </ThemeProvider>
    );
};

describe("SettingsMenu", () => {
    afterEach(cleanup);

    beforeEach(() => {
        localStorage.clear();
        delete document.documentElement.dataset.theme;
        delete document.documentElement.dataset.mode;
    });

    it("offers switching to modern UI by default (classic)", () => {
        renderButton();
        expect(screen.getByRole("button", {name: "Switch to modern UI"})).toBeTruthy();
    });

    it("switches theme and mode together to modern", () => {
        renderButton();
        fireEvent.click(screen.getByRole("button", {name: "Switch to modern UI"}));
        expect(document.documentElement.dataset.theme).toBe("modern");
        expect(document.documentElement.dataset.mode).toBe("modern");
        expect(JSON.parse(localStorage.getItem("ammber/ui-theme") ?? "")).toBe("modern");
        expect(JSON.parse(localStorage.getItem("ammber/ui-mode") ?? "")).toBe("modern");
    });

    it("switches back to classic", () => {
        renderButton();
        fireEvent.click(screen.getByRole("button", {name: "Switch to modern UI"}));
        fireEvent.click(screen.getByRole("button", {name: "Switch to classic UI"}));
        expect(document.documentElement.dataset.theme).toBe("classic");
        expect(document.documentElement.dataset.mode).toBe("classic");
    });

    it("persists state across remount via localStorage", () => {
        const first = renderButton();
        fireEvent.click(screen.getByRole("button", {name: "Switch to modern UI"}));
        first.unmount();

        renderButton();
        expect(screen.getByRole("button", {name: "Switch to classic UI"})).toBeTruthy();
    });
});
