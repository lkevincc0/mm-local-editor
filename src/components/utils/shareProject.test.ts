import {describe, expect, it} from "vitest";
import {compressToEncodedURIComponent} from "lz-string";

import type {Project} from "./projects";
import {
    createProjectShareUrl,
    decodeSharedProjectHash,
    encodeSharedProject,
} from "./shareProject";

const goal = {
    id: 1,
    content: "Share this goal",
    type: "Do" as const,
    instanceId: "1-1" as const,
    children: [],
};

const project: Project = {
    id: "local-project-id",
    name: "Shared model",
    treeData: [goal],
    tabData: [{label: "Do", icon: "", rows: [goal]}],
    feedbacks: [],
    createdAt: 1,
    updatedAt: 2,
};

describe("frontend project sharing", () => {
    it("round-trips a project snapshot through the URL-safe payload", () => {
        const encoded = encodeSharedProject(project);
        const decoded = decodeSharedProjectHash(`#share=${encoded}`);

        expect(decoded).toEqual({
            version: 1,
            shareId: "local-project-id:2",
            name: project.name,
            treeData: project.treeData,
            tabData: project.tabData,
            feedbacks: [],
        });
    });

    it("creates a deployment-safe URL", () => {
        const url = createProjectShareUrl(
            project,
            "https://example.com",
            "/mm-local-editor"
        );

        expect(url).toMatch(/^https:\/\/example\.com\/mm-local-editor\/#share=/);
        expect(decodeSharedProjectHash(new URL(url).hash)?.name).toBe(project.name);
    });

    it("ignores hashes that are not share links", () => {
        expect(decodeSharedProjectHash("#section")).toBeNull();
    });

    it("rejects invalid share data", () => {
        expect(() => decodeSharedProjectHash("#share=not-valid")).toThrow();
    });

    it("rejects malformed nested project data", () => {
        const malformedPayload = {
            version: 1,
            shareId: "malformed-share",
            name: "Malformed model",
            treeData: [{...goal, children: [{...goal, id: "not-a-number"}]}],
            tabData: [{label: "Do", icon: "", rows: [goal]}],
            feedbacks: [],
        };
        const encoded = compressToEncodedURIComponent(
            JSON.stringify(malformedPayload)
        );

        expect(() => decodeSharedProjectHash(`#share=${encoded}`)).toThrow(
            "The shared project data is invalid or unsupported."
        );
    });

    it("rejects tree goals that are missing from the tab data", () => {
        const missingGoalPayload = {
            version: 1,
            shareId: "missing-goal-share",
            name: "Missing goal model",
            treeData: [goal],
            tabData: [],
            feedbacks: [],
        };
        const encoded = compressToEncodedURIComponent(
            JSON.stringify(missingGoalPayload)
        );

        expect(() => decodeSharedProjectHash(`#share=${encoded}`)).toThrow(
            "The shared project data contains invalid goal references."
        );
    });
});
