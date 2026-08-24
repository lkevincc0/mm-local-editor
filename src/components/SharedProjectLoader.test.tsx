/**
 * @vitest-environment jsdom
 */
import React from "react";
import {act, cleanup, render, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import SharedProjectLoader from "./SharedProjectLoader";
import type {Project} from "./utils/projects";
import {
    decodeSharedProjectHash,
    encodeSharedProject,
} from "./utils/shareProject";

const mocks = vi.hoisted(() => ({
    createProject: vi.fn(),
    dispatch: vi.fn(),
    navigate: vi.fn(),
    openProject: vi.fn(),
    projects: [] as Project[],
}));

vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual<typeof import("react-router-dom")>(
        "react-router-dom"
    );
    return {...actual, useNavigate: () => mocks.navigate};
});

vi.mock("./context/FileProvider", async () => {
    const actual = await vi.importActual<typeof import("./context/FileProvider")>(
        "./context/FileProvider"
    );
    return {
        ...actual,
        useFileContext: () => ({dispatch: mocks.dispatch}),
    };
});

vi.mock("./context/ProjectContext", () => ({
    useProjectContext: () => ({
        projects: mocks.projects,
        createProject: mocks.createProject,
        openProject: mocks.openProject,
    }),
}));

const goal = {
    id: 1,
    content: "Shared goal",
    type: "Do" as const,
    instanceId: "1-1" as const,
    children: [],
};

const sharedSource: Project = {
    id: "source-project-id",
    name: "Shared model",
    treeData: [goal],
    tabData: [{label: "Do", icon: "", rows: [goal]}],
    feedbacks: [],
    createdAt: 1,
    updatedAt: 2,
};

const shareHash = `#share=${encodeSharedProject(sharedSource)}`;

describe("SharedProjectLoader", () => {
    beforeEach(() => {
        window.history.replaceState(null, "", "/");
        mocks.projects = [];
        mocks.createProject.mockReset();
        mocks.dispatch.mockReset();
        mocks.navigate.mockReset();
        mocks.openProject.mockReset();
        mocks.createProject.mockImplementation((name, data) => ({
            id: "imported-project-id",
            name,
            ...data,
            createdAt: 3,
            updatedAt: 3,
        }));
        vi.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("validates and imports a shared project before opening the editor", async () => {
        window.history.replaceState(null, "", `/${shareHash}`);

        render(<SharedProjectLoader/>);

        await waitFor(() => expect(mocks.createProject).toHaveBeenCalledOnce());
        expect(mocks.createProject).toHaveBeenCalledWith(
            "Shared model (shared)",
            expect.objectContaining({
                treeData: sharedSource.treeData,
                tabData: sharedSource.tabData,
                feedbacks: [],
                sourceShareId: "source-project-id:2",
            })
        );
        expect(mocks.openProject).toHaveBeenCalledWith("imported-project-id");
        expect(mocks.dispatch).toHaveBeenCalledWith(expect.objectContaining({
            type: "treeData/reset",
        }));
        expect(mocks.navigate).toHaveBeenCalledWith("/projectEdit", {replace: true});
        expect(window.location.hash).toBe("");
    });

    it("opens an existing import instead of creating a duplicate", async () => {
        const shareId = decodeSharedProjectHash(shareHash)?.shareId;
        const existingProject: Project = {
            ...sharedSource,
            id: "existing-import-id",
            sourceShareId: shareId,
        };
        mocks.projects = [existingProject];
        window.history.replaceState(null, "", `/${shareHash}`);

        render(<SharedProjectLoader/>);

        await waitFor(() =>
            expect(mocks.openProject).toHaveBeenCalledWith("existing-import-id")
        );
        expect(mocks.createProject).not.toHaveBeenCalled();
    });

    it("reacts to a share hash received after the app has loaded", async () => {
        render(<SharedProjectLoader/>);

        act(() => {
            window.history.replaceState(null, "", `/${shareHash}`);
            window.dispatchEvent(new HashChangeEvent("hashchange"));
        });

        await waitFor(() => expect(mocks.createProject).toHaveBeenCalledOnce());
    });

    it("does not persist an invalid share link", async () => {
        window.history.replaceState(null, "", "/#share=not-valid");

        render(<SharedProjectLoader/>);

        await waitFor(() => expect(window.location.hash).toBe(""));
        expect(mocks.createProject).not.toHaveBeenCalled();
        expect(mocks.openProject).not.toHaveBeenCalled();
    });
});
