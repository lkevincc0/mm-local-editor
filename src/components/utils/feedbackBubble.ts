import type {OverallFeedback} from "../types";

// Chat-bubble renderer for the overall feedback on the exported PNG.
// Colors are fixed export-artifact colors (the modern palette) so the PNG
// looks the same regardless of the in-app theme.

export const BUBBLE_PADDING = 22;
export const BUBBLE_RADIUS = 18;
export const BUBBLE_TAIL = 12;
export const BUBBLE_AUTHOR_SIZE = 14;
export const BUBBLE_TEXT_SIZE = 16;
export const BUBBLE_LINE_HEIGHT = 24;
export const BUBBLE_MIN_WIDTH = 420;

const BUBBLE_FILL = "#f4f3ee";
const BUBBLE_BORDER = "#deddd6";
const BUBBLE_INK = "#11110f";
const BUBBLE_MUTED = "#6d6c66";

const FONT_FAMILY =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

// Deterministic author avatar (coloured disc + initial) so the exported
// bubble shows who wrote the overall feedback without needing the DOM.
const AVATAR_SIZE = 32;
const AVATAR_RADIUS = AVATAR_SIZE / 2;
const AVATAR_GAP = 12;
const AVATAR_COLORS = [
    "#6b51c9",
    "#b7771e",
    "#397052",
    "#9f352d",
    "#2c6e9e",
    "#71486d"
];

const hashString = (input: string): number => {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
        hash = (hash * 31 + input.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
};

const avatarColor = (author: string): string =>
    AVATAR_COLORS[hashString(author.trim()) % AVATAR_COLORS.length];

const drawAvatar = (
    ctx: CanvasRenderingContext2D,
    author: string,
    cx: number,
    cy: number
): void => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, AVATAR_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = avatarColor(author);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.round(AVATAR_SIZE * 0.48)}px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
        (author.trim().charAt(0) || "?").toUpperCase(),
        cx,
        cy + 0.5
    );
    ctx.restore();
};

export const wrapBubbleText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
): string[] => {
    const lines: string[] = [];

    text.split("\n").forEach((paragraph) => {
        const words = paragraph.split(/\s+/).filter(Boolean);

        if (words.length === 0) {
            lines.push("");
            return;
        }

        let line = words[0];

        words.slice(1).forEach((word) => {
            const candidate = `${line} ${word}`;

            if (ctx.measureText(candidate).width <= maxWidth) {
                line = candidate;
            } else {
                lines.push(line);
                line = word;
            }
        });

        lines.push(line);
    });

    return lines;
};

const formatUpdatedAt = (updatedAt: string): string => {
    const date = new Date(updatedAt);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
};

// Measure first so the caller can size the export canvas before drawing.
export const measureOverallFeedbackBubble = (
    ctx: CanvasRenderingContext2D,
    feedback: OverallFeedback,
    maxWidth: number
): {width: number; height: number; lines: string[]} => {
    ctx.font = `${BUBBLE_TEXT_SIZE}px ${FONT_FAMILY}`;
    const lines = wrapBubbleText(
        ctx,
        feedback.content,
        Math.max(maxWidth - BUBBLE_PADDING * 2, 80)
    );

    ctx.font = `600 ${BUBBLE_AUTHOR_SIZE}px ${FONT_FAMILY}`;
    const authorWidth =
        ctx.measureText(feedback.author).width +
        AVATAR_SIZE +
        AVATAR_GAP;
    const stamp = formatUpdatedAt(feedback.updatedAt);
    ctx.font = `${BUBBLE_AUTHOR_SIZE}px ${FONT_FAMILY}`;
    const stampWidth = stamp ? ctx.measureText(stamp).width + 12 : 0;

    ctx.font = `${BUBBLE_TEXT_SIZE}px ${FONT_FAMILY}`;
    const longestLine = lines.reduce((a, b) => (a.length > b.length ? a : b), "");
    const contentWidth = Math.max(
        ctx.measureText(longestLine).width,
        authorWidth + stampWidth
    );

    const width = Math.min(
        maxWidth,
        Math.max(
            BUBBLE_MIN_WIDTH,
            Math.ceil(contentWidth) + BUBBLE_PADDING * 2
        )
    );

    const height =
        BUBBLE_TAIL +
        BUBBLE_PADDING +
        AVATAR_SIZE +
        6 +
        lines.length * BUBBLE_LINE_HEIGHT +
        BUBBLE_PADDING;

    return {width, height, lines};
};

// Draw the bubble with its tail pointing up-left, like a chat message.
// Returns the height of everything drawn (tail + bubble).
export const drawOverallFeedbackBubble = (
    ctx: CanvasRenderingContext2D,
    feedback: OverallFeedback,
    x: number,
    y: number,
    maxWidth: number
): number => {
    const {width, height, lines} = measureOverallFeedbackBubble(
        ctx,
        feedback,
        maxWidth
    );

    const bubbleY = y + BUBBLE_TAIL;

    ctx.save();

    // Tail
    ctx.fillStyle = BUBBLE_FILL;
    ctx.strokeStyle = BUBBLE_BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 26, bubbleY + 0.5);
    ctx.lineTo(x + 14, y);
    ctx.lineTo(x + 44, bubbleY + 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bubble body
    ctx.beginPath();

    if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, bubbleY, width, height - BUBBLE_TAIL, BUBBLE_RADIUS);
    } else {
        ctx.rect(x, bubbleY, width, height - BUBBLE_TAIL);
    }

    ctx.fill();
    ctx.stroke();

    // Author row: avatar + name
    drawAvatar(
        ctx,
        feedback.author,
        x + BUBBLE_PADDING + AVATAR_RADIUS,
        bubbleY + BUBBLE_PADDING + AVATAR_RADIUS
    );

    const authorTextTop =
        bubbleY + BUBBLE_PADDING + (AVATAR_SIZE - BUBBLE_AUTHOR_SIZE) / 2;

    ctx.fillStyle = BUBBLE_MUTED;
    ctx.font = `600 ${BUBBLE_AUTHOR_SIZE}px ${FONT_FAMILY}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(
        feedback.author,
        x + BUBBLE_PADDING + AVATAR_SIZE + AVATAR_GAP,
        authorTextTop
    );

    const stamp = formatUpdatedAt(feedback.updatedAt);

    if (stamp) {
        ctx.font = `${BUBBLE_AUTHOR_SIZE}px ${FONT_FAMILY}`;
        const stampWidth = ctx.measureText(stamp).width;
        ctx.fillText(
            stamp,
            x + width - BUBBLE_PADDING - stampWidth,
            authorTextTop
        );
    }

    // Content
    ctx.fillStyle = BUBBLE_INK;
    ctx.font = `${BUBBLE_TEXT_SIZE}px ${FONT_FAMILY}`;

    lines.forEach((line, index) => {
        ctx.fillText(
            line,
            x + BUBBLE_PADDING,
            bubbleY + BUBBLE_PADDING + AVATAR_SIZE + 6 + index * BUBBLE_LINE_HEIGHT
        );
    });

    ctx.restore();

    return height;
};

const SVG_NS = "http://www.w3.org/2000/svg";

const makeSvgText = (
    doc: Document,
    text: string,
    attrs: Record<string, string>
): SVGTextElement => {
    const el = doc.createElementNS(SVG_NS, "text");
    Object.entries(attrs).forEach(([key, value]) =>
        el.setAttribute(key, value)
    );
    el.textContent = text;
    return el;
};

// Renders the overall-feedback chat bubble as vector SVG elements (tail,
// rounded body, avatar + initial, author/date and wrapped content) appended
// below the graph, and extends the SVG canvas height/viewBox to fit it.
export const injectOverallFeedbackBubble = (
    svgString: string,
    graphWidth: number,
    graphHeight: number,
    feedback: OverallFeedback
): string => {
    const ctx = document.createElement("canvas").getContext("2d");

    if (!ctx) {
        return svgString;
    }

    const maxWidth = graphWidth - BUBBLE_PADDING * 2;
    const bubble = measureOverallFeedbackBubble(ctx, feedback, maxWidth);
    const bandHeight = BUBBLE_PADDING + bubble.height + BUBBLE_PADDING;
    const bubbleX = Math.max(BUBBLE_PADDING, (graphWidth - bubble.width) / 2);
    const bodyTop = graphHeight + BUBBLE_PADDING + BUBBLE_TAIL;

    const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");
    const svg = doc.documentElement;

    const group = doc.createElementNS(SVG_NS, "g");

    // Tail
    const tail = doc.createElementNS(SVG_NS, "path");
    tail.setAttribute(
        "d",
        `M ${bubbleX + 26} ${bodyTop + 0.5} L ${bubbleX + 14} ${
            bodyTop - BUBBLE_TAIL
        } L ${bubbleX + 44} ${bodyTop + 0.5} Z`
    );
    tail.setAttribute("fill", BUBBLE_FILL);
    tail.setAttribute("stroke", BUBBLE_BORDER);
    tail.setAttribute("stroke-width", "1");
    group.appendChild(tail);

    // Body
    const body = doc.createElementNS(SVG_NS, "rect");
    body.setAttribute("x", String(bubbleX));
    body.setAttribute("y", String(bodyTop));
    body.setAttribute("width", String(bubble.width));
    body.setAttribute("height", String(bubble.height - BUBBLE_TAIL));
    body.setAttribute("rx", String(BUBBLE_RADIUS));
    body.setAttribute("fill", BUBBLE_FILL);
    body.setAttribute("stroke", BUBBLE_BORDER);
    body.setAttribute("stroke-width", "1");
    group.appendChild(body);

    // Avatar
    const avatarCx = bubbleX + BUBBLE_PADDING + AVATAR_RADIUS;
    const avatarCy = bodyTop + BUBBLE_PADDING + AVATAR_RADIUS;
    const circle = doc.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", String(avatarCx));
    circle.setAttribute("cy", String(avatarCy));
    circle.setAttribute("r", String(AVATAR_RADIUS));
    circle.setAttribute("fill", avatarColor(feedback.author));
    group.appendChild(circle);

    const initial = (feedback.author.trim().charAt(0) || "?").toUpperCase();
    group.appendChild(
        makeSvgText(doc, initial, {
            x: String(avatarCx),
            y: String(avatarCy),
            "text-anchor": "middle",
            "dominant-baseline": "central",
            "font-family": FONT_FAMILY,
            "font-size": String(Math.round(AVATAR_SIZE * 0.48)),
            "font-weight": "700",
            fill: "#ffffff"
        })
    );

    // Author + date
    const authorY = avatarCy;
    const authorX = bubbleX + BUBBLE_PADDING + AVATAR_SIZE + AVATAR_GAP;
    group.appendChild(
        makeSvgText(doc, feedback.author, {
            x: String(authorX),
            y: String(authorY),
            "dominant-baseline": "central",
            "font-family": FONT_FAMILY,
            "font-size": String(BUBBLE_AUTHOR_SIZE),
            "font-weight": "600",
            fill: BUBBLE_MUTED
        })
    );

    const stamp = formatUpdatedAt(feedback.updatedAt);

    if (stamp) {
        group.appendChild(
            makeSvgText(doc, stamp, {
                x: String(bubbleX + bubble.width - BUBBLE_PADDING),
                y: String(authorY),
                "text-anchor": "end",
                "dominant-baseline": "central",
                "font-family": FONT_FAMILY,
                "font-size": String(BUBBLE_AUTHOR_SIZE),
                fill: BUBBLE_MUTED
            })
        );
    }

    // Wrapped content
    const content = doc.createElementNS(SVG_NS, "text");
    content.setAttribute("x", String(bubbleX + BUBBLE_PADDING));
    content.setAttribute(
        "y",
        String(bodyTop + BUBBLE_PADDING + AVATAR_SIZE + 6)
    );
    content.setAttribute("font-family", FONT_FAMILY);
    content.setAttribute("font-size", String(BUBBLE_TEXT_SIZE));
    content.setAttribute("fill", BUBBLE_INK);

    bubble.lines.forEach((line, index) => {
        const tspan = doc.createElementNS(SVG_NS, "tspan");
        tspan.setAttribute("x", String(bubbleX + BUBBLE_PADDING));

        if (index > 0) {
            tspan.setAttribute("dy", String(BUBBLE_LINE_HEIGHT));
        }

        tspan.textContent = line || "\u00a0";
        content.appendChild(tspan);
    });

    group.appendChild(content);
    svg.appendChild(group);

    // Extend the canvas to reveal the bubble band below the graph.
    svg.setAttribute("height", String(graphHeight + bandHeight));
    const viewBox = svg.getAttribute("viewBox");

    if (viewBox) {
        const parts = viewBox.trim().split(/\s+/).map(Number);

        if (parts.length === 4 && Number.isFinite(parts[3])) {
            svg.setAttribute(
                "viewBox",
                `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3] + bandHeight}`
            );
        }
    }

    return new XMLSerializer().serializeToString(doc);
};
