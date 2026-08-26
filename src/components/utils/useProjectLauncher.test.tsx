/**
 * @vitest-environment jsdom
 */
import {act, cleanup, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {useProjectLauncher} from "./useProjectLauncher";
import type {Feedback} from "../types";
import type {Project} from "./projects";

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

vi.mock("../context/FileProvider", async () => {
    const actual = await vi.importActual<typeof import("../context/FileProvider")>(
        "../context/FileProvider"
    );
    return {
        ...actual,
        useFileContext: () => ({dispatch: mocks.dispatch}),
    };
});

vi.mock("../context/ProjectContext", () => ({
    useProjectContext: () => ({
        projects: mocks.projects,
        createProject: mocks.createProject,
        openProject: mocks.openProject,
    }),
}));

const feedback: Feedback = {
    id: "feedback-1",
    nodeId: "Functional-1-1",
    author: "Current User",
    content: "needs more detail",
    createdAt: "Just now",
    status: "open",
    replyCount: 0,
};

// jsdom does not implement Blob.prototype.text(), so supply a File-like
// object that exposes the same surface importProjectFile() reads.
const buildJsonFile = (content: unknown): File => {
    const text = JSON.stringify(content);
    return {
        name: "model.json",
        type: "application/json",
        text: () => Promise.resolve(text),
    } as unknown as File;
};

describe("useProjectLauncher", () => {
    beforeEach(() => {
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
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("restores imported feedbacks into the created project", async () => {
        const {result} = renderHook(() => useProjectLauncher(vi.fn()));

        await act(async () => {
            await result.current.importProjectFile(buildJsonFile({
                name: "Imported model",
                feedbacks: [feedback],
                treeData: [],
                tabData: [],
            }));
        });

        expect(mocks.createProject).toHaveBeenCalledWith(
            "Imported model",
            expect.objectContaining({
                treeData: [],
                tabData: [],
                feedbacks: [feedback],
            })
        );
        expect(mocks.openProject).toHaveBeenCalledWith("imported-project-id");
        expect(mocks.dispatch).toHaveBeenCalledWith(expect.objectContaining({
            type: "treeData/reset",
        }));
        expect(mocks.navigate).toHaveBeenCalledWith("/projectEdit");
    });

    it("defaults to an empty feedback list when the file has none", async () => {
        const {result} = renderHook(() => useProjectLauncher(vi.fn()));

        await act(async () => {
            await result.current.importProjectFile(buildJsonFile({
                treeData: [],
                tabData: [],
            }));
        });

        expect(mocks.createProject).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({feedbacks: []})
        );
    });
});
