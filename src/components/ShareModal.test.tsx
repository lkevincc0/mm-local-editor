/**
 * @vitest-environment jsdom
 */
import React from "react";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import ShareModal from "./ShareModal";
import type {Project} from "./utils/projects";

const goal = {
    id: 1,
    content: "Share this goal",
    type: "Do" as const,
    instanceId: "1-1" as const,
    children: [],
};

const project: Project = {
    id: "project-id",
    name: "Shareable model",
    treeData: [goal],
    tabData: [{label: "Do", icon: "", rows: [goal]}],
    feedbacks: [],
    createdAt: 1,
    updatedAt: 2,
};

const pseudoRandomText = (length: number): string => {
    let seed = 123456789;
    return Array.from({length}, () => {
        seed = (seed * 16807) % 2147483647;
        return String.fromCharCode(32 + (seed % 95));
    }).join("");
};

describe("ShareModal", () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("generates a QR code and a copyable project link", () => {
        render(<ShareModal show projects={[project]} onHide={vi.fn()}/>);

        fireEvent.click(screen.getByRole("button", {name: "Generate QR code"}));

        const input = screen.getByLabelText("Share link") as HTMLInputElement;
        expect(input.value).toContain("#share=");
        expect(document.querySelector("svg")).not.toBeNull();
        expect(screen.getByText("Scan this QR code or copy the link below.")).toBeTruthy();
    });

    it("shows an error instead of rendering an oversized QR code", () => {
        const oversizedGoal = {
            ...goal,
            content: pseudoRandomText(12_000),
        };
        const oversizedProject: Project = {
            ...project,
            treeData: [oversizedGoal],
            tabData: [{label: "Do", icon: "", rows: [oversizedGoal]}],
        };

        render(<ShareModal show projects={[oversizedProject]} onHide={vi.fn()}/>);
        fireEvent.click(screen.getByRole("button", {name: "Generate QR code"}));

        expect(screen.getByText(
            "This project is too large for a frontend-only QR code. " +
            "Try sharing a smaller model."
        )).toBeTruthy();
        expect(document.querySelector("svg")).toBeNull();
    });
});
