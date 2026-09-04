import {describe, expect, it} from "vitest";
import {compressToEncodedURIComponent} from "lz-string";
import {deflate} from "pako";

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

// A richer project with nested goals, multiple tabs and feedback, to exercise
// the v2 id-reference rebuild path.
const richTree = [
    {
        id: 1,
        content: "Do",
        type: "Do" as const,
        instanceId: "1-1" as const,
        children: [
            {
                id: 6,
                content: "Do1",
                type: "Do" as const,
                instanceId: "6-1" as const,
                children: [],
            },
        ],
    },
    {
        id: 2,
        content: "Be",
        type: "Be" as const,
        instanceId: "2-1" as const,
        children: [],
    },
];

const richProject: Project = {
    id: "rich-project",
    name: "Rich model",
    treeData: richTree,
    tabData: [
        {
            label: "Do",
            icon: "/img/Function.png",
            rows: [richTree[0], richTree[0].children![0]],
        },
        {label: "Be", icon: "/img/Cloud.png", rows: [richTree[1]]},
    ],
    feedbacks: [
        {
            id: "feedback-1",
            nodeId: "Functional-1-1",
            author: "A",
            content: "Great model",
            createdAt: "Just now",
            status: "open",
        },
    ],
    overallFeedback: {
        author: "Reviewer",
        content: "Overall the model reads well.",
        updatedAt: "2026-09-03T12:00:00.000Z",
    },
    createdAt: 1,
    updatedAt: 5,
};

// Build a v2 (deflate + base64url) payload from an object, for invalid-data tests.
const bytesToBase64Url = (bytes: Uint8Array): string => {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
};

const encodeV2Raw = (value: unknown): string =>
    bytesToBase64Url(
        deflate(new TextEncoder().encode(JSON.stringify(value)), {
            raw: true,
            level: 9,
        })
    );

describe("frontend project sharing", () => {
    it("round-trips a v2 project snapshot through the URL-safe payload", () => {
        const encoded = encodeSharedProject(project);
        const decoded = decodeSharedProjectHash(`#share=${encoded}`);

        expect(decoded).toEqual({
            version: 2,
            shareId: "local-project-id:2",
            name: project.name,
            treeData: project.treeData,
            tabData: project.tabData,
            feedbacks: [],
        });
    });

    it("round-trips a nested project with multiple tabs and feedback", () => {
        const encoded = encodeSharedProject(richProject);
        const decoded = decodeSharedProjectHash(`#share=${encoded}`);

        expect(decoded).toEqual({
            version: 2,
            shareId: "rich-project:5",
            name: richProject.name,
            treeData: richTree,
            tabData: richProject.tabData,
            feedbacks: richProject.feedbacks,
            overallFeedback: richProject.overallFeedback,
        });
    });

    it("emits a URL-safe payload without base64 padding or unsafe chars", () => {
        const encoded = encodeSharedProject(richProject);

        expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(encoded).not.toMatch(/[+/=]/);
    });

    it("produces a shorter payload than the legacy lz-string format", () => {
        const v2 = encodeSharedProject(richProject);

        const legacyPayload = {
            version: 1,
            shareId: "rich-project:5",
            name: richProject.name,
            treeData: richProject.treeData,
            tabData: richProject.tabData,
            feedbacks: richProject.feedbacks,
        };
        const legacy = compressToEncodedURIComponent(
            JSON.stringify(legacyPayload)
        );

        expect(v2.length).toBeLessThan(legacy.length);
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

    it("decodes a legacy v1 lz-string link", () => {
        const legacyPayload = {
            version: 1,
            shareId: "legacy-project:3",
            name: "Legacy model",
            treeData: [goal],
            tabData: [{label: "Do", icon: "", rows: [goal]}],
            feedbacks: [],
        };
        const encoded = compressToEncodedURIComponent(
            JSON.stringify(legacyPayload)
        );

        const decoded = decodeSharedProjectHash(`#share=${encoded}`);
        expect(decoded).toEqual({
            version: 1,
            shareId: "legacy-project:3",
            name: "Legacy model",
            treeData: [goal],
            tabData: [{label: "Do", icon: "", rows: [goal]}],
            feedbacks: [],
        });
    });

    it("rejects malformed nested project data (v2)", () => {
        const malformedPayload = {
            version: 2,
            shareId: "malformed-share",
            name: "Malformed model",
            treeData: [
                {...goal, children: [{...goal, id: "not-a-number"}]},
            ],
            tabData: [{label: "Do", icon: "", rows: [1]}],
            feedbacks: [],
        };
        const encoded = encodeV2Raw(malformedPayload);

        expect(() => decodeSharedProjectHash(`#share=${encoded}`)).toThrow(
            "The shared project data is invalid or unsupported."
        );
    });

    it("rejects tree goals that are missing from the tab data (v2)", () => {
        const missingGoalPayload = {
            version: 2,
            shareId: "missing-goal-share",
            name: "Missing goal model",
            treeData: [goal],
            tabData: [],
            feedbacks: [],
        };
        const encoded = encodeV2Raw(missingGoalPayload);

        expect(() => decodeSharedProjectHash(`#share=${encoded}`)).toThrow(
            "The shared project data contains invalid goal references."
        );
    });
});
