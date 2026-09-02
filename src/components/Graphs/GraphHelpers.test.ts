import {Graph} from "@maxgraph/core";
import {describe, it, expect, vi} from "vitest";
import {makeLabelForGoalType} from "../utils/GraphUtils";
import {SymbolKey} from "../utils/GraphConstants.tsx";
import {renderFunction} from "./GraphHelpers";

describe("renderFunction", () => {
    it("preserves spaces in functional goal labels", () => {
        const geometry = {height: 0, width: 0};
        const node = {getGeometry: () => geometry};
        const insertVertex = vi.fn(() => node);
        const graph = {
            getStylesheet: () => ({getDefaultVertexStyle: () => ({})}),
            insertVertex,
            getPreferredSizeForCell: () => null,
        } as unknown as Graph;

        renderFunction(
            {
                GoalID: 3,
                instanceId: "3-1",
                GoalType: "Functional",
                GoalContent: "Do 3",
                GoalNote: "",
                SubGoals: [],
            },
            graph,
            null,
            {value: null},
            {},
            {},
            {},
            {},
            undefined
        );

        expect(insertVertex.mock.calls[0][2]).toBe("Do 3");
    });
});

describe("makeLabelForGoalType", () => {
    it("uses ',\\n' separator when type is STAKEHOLDER", () => {
        const items = ["A", "B", "C"];
        const result = makeLabelForGoalType(items, "STAKEHOLDER");

        expect(result).toBe("A,\nB,\nC");
    });

    it.each(["FUNCTIONAL", "EMOTION", "NEGATIVE", "QUALITY"])(
        "uses default ', ' separator for %s type, and breaks lines according to square layout",
        (type) => {
            const items = ["A", "B", "C"];
            const result = makeLabelForGoalType(items, type as SymbolKey);
            expect(result).toBe("A, B,\nC");
        }
    );

    it("uses default ', ' separator when type is undefined", () => {
        const items = ["A", "B"];
        const result = makeLabelForGoalType(items, undefined);

        expect(result).toBe("A, B");
    });

    it.each(["FUNCTIONAL", "STAKEHOLDER", "EMOTION", "NEGATIVE", "QUALITY"])(
        "should handle empty array for %s type", 
        (type) => {
            const items: string[] = [];
            const result = makeLabelForGoalType(items, type as SymbolKey);

            expect(result).toBe("");
        }
    );
});
