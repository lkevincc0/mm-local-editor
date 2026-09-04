import type {Graph} from "@maxgraph/core";

// Center the graph without enlarging it.
// The math follows maxGraph's convention: screen = (model + translate) * scale,
// so translate is expressed in model units.
export const recentreView = (graphInstance: Graph) => {
    // A destroyed graph (e.g. after a UI-mode switch) has no drawPane; any
    // view mutation on it revalidates a dead view and crashes.
    if (!graphInstance.view?.drawPane) return;

    const container = graphInstance.container;
    const bounds = graphInstance.getGraphBounds();
    if (!container || !bounds || bounds.width <= 0 || bounds.height <= 0) return;

    const padding = 64;
    const cw = container.clientWidth - padding * 2;
    const ch = container.clientHeight - padding * 2;
    if (cw <= 0 || ch <= 0) return;

    const view = graphInstance.view;
    const oldScale = view.scale;
    const w = bounds.width / oldScale;
    const h = bounds.height / oldScale;
    const newScale = Math.min(1, cw / w, ch / h);
    const modelX = bounds.x / oldScale - view.translate.x;
    const modelY = bounds.y / oldScale - view.translate.y;
    const translateX = (container.clientWidth / newScale - w) / 2 - modelX;
    const translateY = (container.clientHeight / newScale - h) / 2 - modelY;

    view.scaleAndTranslate(newScale, translateX, translateY);
};
