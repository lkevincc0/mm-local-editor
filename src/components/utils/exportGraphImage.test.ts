/** @vitest-environment jsdom */
import {Graph} from "@maxgraph/core";
import {afterEach, describe, expect, it} from "vitest";
import {serializeGraphSvg} from "./exportGraphImage";
import {BUBBLE_MIN_WIDTH, BUBBLE_PADDING} from "./feedbackBubble";

const graphs: Graph[] = [];
const makeGraph = () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const graph = new Graph(container);
    graphs.push(graph);
    const cell = graph.insertVertex(graph.getDefaultParent(), null, "Goal & value", -200, -100, 160, 80);
    graph.insertVertex(graph.getDefaultParent(), null, "Far goal", 900, 600, 160, 80);
    graph.setSelectionCell(cell);
    return graph;
};

afterEach(() => {
    graphs.forEach((graph) => graph.destroy());
    graphs.length = 0;
    document.body.innerHTML = "";
});

describe("SVG export bounds", () => {
    it.each([0.25, 0.5, 2])("exports the entire graph at zoom %s without changing selection", (scale) => {
        const graph = makeGraph();
        const selected = graph.getSelectionCell();
        const original = serializeGraphSvg(graph)!;
        graph.view.scaleAndTranslate(scale, -700, 300);
        const exported = serializeGraphSvg(graph)!;
        expect(exported.width).toBe(original.width);
        expect(exported.height).toBe(original.height);
        const parse = (svg: string) => new DOMParser().parseFromString(svg, "image/svg+xml");
        const doc = parse(exported.svgString);
        expect(doc.querySelector("parsererror")).toBeNull();
        expect(doc.documentElement.getAttribute("viewBox")).toBe(`0 0 ${exported.width} ${exported.height}`);
        expect(doc.documentElement.getAttribute("width")).toBe(String(exported.width));
        expect(doc.documentElement.textContent).toContain("Goal & value");
        expect(doc.documentElement.textContent).toContain("Far goal");
        const shapes = Array.from(doc.querySelectorAll('rect[stroke]:not([stroke="none"])'));
        expect(shapes).toHaveLength(2);
        expect(shapes.map((shape) => shape.outerHTML))
            .toEqual(Array.from(parse(original.svgString).querySelectorAll('rect[stroke]:not([stroke="none"])'), (shape) => shape.outerHTML));
        shapes.forEach((shape) => {
            const x = Number(shape.getAttribute("x"));
            const y = Number(shape.getAttribute("y"));
            expect(x).toBeGreaterThan(0);
            expect(y).toBeGreaterThan(0);
            expect(x + Number(shape.getAttribute("width"))).toBeLessThan(exported.width);
            expect(y + Number(shape.getAttribute("height"))).toBeLessThan(exported.height);
        });
        expect(graph.getSelectionCell()).toBe(selected);
        expect(graph.view.scale).toBe(scale);
        expect(graph.view.translate.x).toBe(-700);
    });

    it("reserves enough width for feedback on small graphs", () => {
        const graph = new Graph(document.createElement("div"));
        graphs.push(graph);
        graph.insertVertex(graph.getDefaultParent(), null, "Small", 0, 0, 80, 40);
        expect(serializeGraphSvg(graph)!.width).toBeLessThan(BUBBLE_MIN_WIDTH);
        expect(serializeGraphSvg(graph, true)!.width).toBe(BUBBLE_MIN_WIDTH + BUBBLE_PADDING * 2);
    });

    it("skips empty graphs", () => {
        const graph = new Graph(document.createElement("div"));
        graphs.push(graph);
        expect(serializeGraphSvg(graph)).toBeNull();
    });
});
