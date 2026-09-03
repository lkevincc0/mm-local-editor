import type {OverallFeedback} from "../types";

// Chat-bubble renderer for the overall feedback on the exported PNG.
// Colors are fixed export-artifact colors (the modern palette) so the PNG
// looks the same regardless of the in-app theme.

export const BUBBLE_PADDING = 18;
export const BUBBLE_RADIUS = 16;
export const BUBBLE_TAIL = 10;
export const BUBBLE_AUTHOR_SIZE = 12;
export const BUBBLE_TEXT_SIZE = 14;
export const BUBBLE_LINE_HEIGHT = 20;
export const BUBBLE_MIN_WIDTH = 260;

const BUBBLE_FILL = "#f4f3ee";
const BUBBLE_BORDER = "#deddd6";
const BUBBLE_INK = "#11110f";
const BUBBLE_MUTED = "#6d6c66";

const FONT_FAMILY =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

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
    const authorWidth = ctx.measureText(feedback.author).width;
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
        BUBBLE_AUTHOR_SIZE +
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

    // Author row
    ctx.fillStyle = BUBBLE_MUTED;
    ctx.font = `600 ${BUBBLE_AUTHOR_SIZE}px ${FONT_FAMILY}`;
    ctx.textBaseline = "top";
    ctx.fillText(feedback.author, x + BUBBLE_PADDING, bubbleY + BUBBLE_PADDING);

    const stamp = formatUpdatedAt(feedback.updatedAt);

    if (stamp) {
        ctx.font = `${BUBBLE_AUTHOR_SIZE}px ${FONT_FAMILY}`;
        const stampWidth = ctx.measureText(stamp).width;
        ctx.fillText(
            stamp,
            x + width - BUBBLE_PADDING - stampWidth,
            bubbleY + BUBBLE_PADDING
        );
    }

    // Content
    ctx.fillStyle = BUBBLE_INK;
    ctx.font = `${BUBBLE_TEXT_SIZE}px ${FONT_FAMILY}`;

    lines.forEach((line, index) => {
        ctx.fillText(
            line,
            x + BUBBLE_PADDING,
            bubbleY + BUBBLE_PADDING + BUBBLE_AUTHOR_SIZE + 6 + index * BUBBLE_LINE_HEIGHT
        );
    });

    ctx.restore();

    return height;
};
