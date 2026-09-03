import {describe, expect, it} from "vitest";

import type {OverallFeedback} from "../types";
import {
    BUBBLE_MIN_WIDTH,
    BUBBLE_PADDING,
    drawOverallFeedbackBubble,
    measureOverallFeedbackBubble,
    wrapBubbleText
} from "./feedbackBubble";

// Deterministic stand-in for canvas text measurement: 7px per character at
// any font size, which is all these layout functions rely on.
const createMockContext = () => {
    const calls: {method: string; args: unknown[]}[] = [];

    const ctx = {
        font: "",
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 0,
        textBaseline: "",
        measureText: (text: string) => {
            calls.push({method: "measureText", args: [text]});
            return {width: text.length * 7};
        },
        fillText: (...args: unknown[]) => {
            calls.push({method: "fillText", args});
        },
        beginPath: () => {
            calls.push({method: "beginPath", args: []});
        },
        moveTo: (...args: unknown[]) => {
            calls.push({method: "moveTo", args});
        },
        lineTo: (...args: unknown[]) => {
            calls.push({method: "lineTo", args});
        },
        closePath: () => {
            calls.push({method: "closePath", args: []});
        },
        fill: () => {
            calls.push({method: "fill", args: []});
        },
        stroke: () => {
            calls.push({method: "stroke", args: []});
        },
        rect: (...args: unknown[]) => {
            calls.push({method: "rect", args});
        },
        save: () => {
            calls.push({method: "save", args: []});
        },
        restore: () => {
            calls.push({method: "restore", args: []});
        }
    };

    return {ctx: ctx as unknown as CanvasRenderingContext2D, calls};
};

const feedback: OverallFeedback = {
    author: "Reviewer",
    content: "Overall the model reads well.",
    updatedAt: "2026-09-03T12:00:00.000Z"
};

describe("feedbackBubble", () => {
    it("wraps text to the available width", () => {
        const {ctx} = createMockContext();
        // 7px per char -> 100px fits 14 characters.
        const lines = wrapBubbleText(
            ctx,
            "one two three four five six",
            100
        );

        expect(lines.length).toBeGreaterThan(1);
        lines.forEach((line) => {
            expect(ctx.measureText(line).width).toBeLessThanOrEqual(100);
        });
        expect(lines.join(" ")).toBe("one two three four five six");
    });

    it("keeps explicit line breaks", () => {
        const {ctx} = createMockContext();
        const lines = wrapBubbleText(ctx, "a\nb", 1000);

        expect(lines).toEqual(["a", "b"]);
    });

    it("sizes the bubble to its content within the max width", () => {
        const {ctx} = createMockContext();
        const maxWidth = 500;
        const bubble = measureOverallFeedbackBubble(ctx, feedback, maxWidth);

        expect(bubble.width).toBeLessThanOrEqual(maxWidth);
        expect(bubble.width).toBeGreaterThanOrEqual(BUBBLE_MIN_WIDTH);
        expect(bubble.height).toBeGreaterThan(
            BUBBLE_PADDING + 12 + 6 + bubble.lines.length * 20
        );
    });

    it("grows with the number of wrapped lines", () => {
        const {ctx} = createMockContext();
        const shortFb = {...feedback, content: "Short."};
        const longFb = {
            ...feedback,
            content: "A much longer piece of overall feedback that has to wrap over several lines when the width is tight."
        };

        const shortBubble = measureOverallFeedbackBubble(ctx, shortFb, 320);
        const longBubble = measureOverallFeedbackBubble(ctx, longFb, 320);

        expect(longBubble.lines.length).toBeGreaterThan(shortBubble.lines.length);
        expect(longBubble.height).toBeGreaterThan(shortBubble.height);
    });

    it("draws author, date and one fillText per line", () => {
        const {ctx, calls} = createMockContext();
        const drawCallsBefore = calls.filter(
            (call) => call.method === "fillText"
        ).length;

        const height = drawOverallFeedbackBubble(ctx, feedback, 12, 20, 400);

        expect(height).toBeGreaterThan(0);

        const fillTexts = calls.filter((call) => call.method === "fillText");
        const {lines} = measureOverallFeedbackBubble(ctx, feedback, 400);

        // author + optional date stamp + one call per content line
        expect(fillTexts.length - drawCallsBefore).toBe(lines.length + 2);
    });
});
