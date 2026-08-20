/**
 * @jest-environment jsdom
 */
import {describe, expect, it} from "vitest";
import {Blob as NodeBlob} from "node:buffer";
import {
    embedJsonInPng,
    embedJsonInSvg,
    extractJsonFromPng,
    extractJsonFromSvg
} from "./imageMetadata";

// jsdom's Blob is missing the File API methods arrayBuffer()/text(); swap in
// Node's Blob so the embed/extract helpers can read blobs under test.
globalThis.Blob = NodeBlob as unknown as typeof Blob;

// Multi-byte UTF-8 (Chinese) plus a surrogate-pair emoji, to prove the
// encoding survives a round trip.
const SAMPLE = {
    tabData: [{label: "功能", icon: "star", goalIds: [1, 2]}],
    treeData: [{id: 1, text: "验证中文与 emoji 🎯", children: []}]
};

describe("imageMetadata", () => {
    it("round-trips project data through a PNG", async () => {
        const png = new Blob(["fake-png-bytes"], {type: "image/png"});
        const embedded = await embedJsonInPng(png, SAMPLE);

        expect(await extractJsonFromPng(embedded)).toEqual(SAMPLE);
    });

    it("keeps the original PNG bytes intact at the front", async () => {
        const original = new Uint8Array([1, 2, 3, 4, 5]);
        const embedded = await embedJsonInPng(
            new Blob([original]),
            SAMPLE
        );
        const bytes = new Uint8Array(await embedded.arrayBuffer());

        expect([...bytes.subarray(0, original.length)]).toEqual([
            1, 2, 3, 4, 5
        ]);
    });

    it("round-trips project data through an SVG", async () => {
        const svg =
            "<svg xmlns='http://www.w3.org/2000/svg'></svg>";
        const embedded = embedJsonInSvg(svg, SAMPLE);

        expect(
            await extractJsonFromSvg(
                new Blob([embedded], {type: "image/svg+xml"})
            )
        ).toEqual(SAMPLE);
    });

    it("returns null for a PNG with no embedded data", async () => {
        const png = new Blob(["plain-png"], {type: "image/png"});

        expect(await extractJsonFromPng(png)).toBeNull();
    });

    it("returns null for an SVG with no metadata", async () => {
        const svg =
            "<svg xmlns='http://www.w3.org/2000/svg'></svg>";

        expect(
            await extractJsonFromSvg(
                new Blob([svg], {type: "image/svg+xml"})
            )
        ).toBeNull();
    });
});
