/**
* @jest-environment jsdom
*/
import {cleanup, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import Welcome from "./Welcome";
import FileProvider from "./context/FileProvider";
import ProjectProvider from "./context/ProjectProvider";
import {ThemeProvider} from "./context/ThemeContext";

const renderWelcome = () => {
    render(
        <MemoryRouter>
            <ProjectProvider>
                <FileProvider>
                    <ThemeProvider>
                        <Welcome/>
                    </ThemeProvider>
                </FileProvider>
            </ProjectProvider>
        </MemoryRouter>
    );
};

describe("Welcome", () => {
    afterEach(cleanup);

    beforeEach(() => {
        localStorage.clear();
        // Exercise the modern layout in these tests (classic renders the legacy hero).
        localStorage.setItem("ammber/ui-theme", JSON.stringify("modern"));
    });

    it("shows the hero with logo and actions", () => {
        renderWelcome();
        expect(screen.getByAltText("AMMBER logo")).toBeTruthy();
        expect(screen.getByRole("heading", {name: "Make motivation clear."})).toBeTruthy();
        expect(screen.getByRole("button", {name: "Import project"})).toBeTruthy();
    });

    it("links Get started to the recent projects page", () => {
        renderWelcome();
        const link = screen.getByRole("link", {name: /Get started/});
        expect(link.getAttribute("href")).toBe("/projects");
    });

    it("shows the classic hero when the classic theme is active", () => {
        localStorage.setItem("ammber/ui-theme", JSON.stringify("classic"));
        renderWelcome();
        expect(screen.getByRole("heading", {name: "AMMBER"})).toBeTruthy();
        expect(screen.getByRole("link", {name: /Get started/}).getAttribute("href")).toBe("/projects");
    });
});
