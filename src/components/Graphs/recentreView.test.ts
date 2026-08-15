/**
* @jest-environment jsdom
*/
import {describe, expect, it, vi} from "vitest";
import {recentreView} from "./recentreView";

type GraphBounds = {x: number; y: number; width: number; height: number};

// Minimal Graph double: recentreView only reads container, getGraphBounds and view.
const makeGraph = (bounds: GraphBounds, clientWidth: number, clientHeight: number) => {
    const scaleAndTranslate = vi.fn();
    const graph = {
        container: {clientWidth, clientHeight},
        getGraphBounds: () => bounds,
        view: {
            scale: 1,
            translate: {x: 0, y: 0},
            scaleAndTranslate,
        },
    };
    return {graph, scaleAndTranslate};
};

describe("recentreView", () => {
    it("scales a large graph down and centres it in the container", () => {
        const {graph, scaleAndTranslate} = makeGraph({x: 0, y: 0, width: 2000, height: 1400}, 1000, 700);
        recentreView(graph as never);

        const [scale, translateX, translateY] = scaleAndTranslate.mock.calls[0];
        // scale fits the graph into the container minus 64px padding on each side
        expect(scale).toBeCloseTo(Math.min((1000 - 128) / 2000, (700 - 128) / 1400));
        // the graph centre lands on the container centre: screen = (model + translate) * scale
        expect((1000 + translateX) * scale).toBeCloseTo(500, 0);
        expect((700 + translateY) * scale).toBeCloseTo(350, 0);
    });

    it("never zooms in beyond 100%", () => {
        const {graph, scaleAndTranslate} = makeGraph({x: 0, y: 0, width: 100, height: 100}, 1000, 700);
        recentreView(graph as never);

        expect(scaleAndTranslate.mock.calls[0][0]).toBe(1);
    });

    it("does nothing when the container has no size yet", () => {
        const {graph, scaleAndTranslate} = makeGraph({x: 0, y: 0, width: 100, height: 100}, 0, 0);
        recentreView(graph as never);

        expect(scaleAndTranslate).not.toHaveBeenCalled();
    });
});
