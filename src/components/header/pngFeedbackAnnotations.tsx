import type {Feedback} from "../types";

export const PNG_FEEDBACK_PANEL_GAP = 24;
export const PNG_FEEDBACK_PANEL_WIDTH = 400;

const PANEL_PADDING = 24;
const PANEL_CONTENT_WIDTH = PNG_FEEDBACK_PANEL_WIDTH - PANEL_PADDING * 2;
const CARD_PADDING = 14;
const CARD_CONTENT_WIDTH = PANEL_CONTENT_WIDTH - CARD_PADDING * 2;
const GROUP_NUMBER_DIAMETER = 22;
const GROUP_HEADER_GAP = 12;
const GROUP_GAP = 20;
const CARD_GAP = 10;
const AUTHOR_LINE_HEIGHT = 18;
const CONTENT_LINE_HEIGHT = 20;
const REPLY_LINE_HEIGHT = 18;

const COLORS = {
    paper: "#f7f6f0",
    text: "#11110f",
    muted: "#6d6c66",
    border: "#deddd6",
    purple: "#6b51c9",
    open: "#9a5b13",
    resolved: "#397052",
    white: "#ffffff"
};

const FONTS = {
    title: "600 24px Arial, sans-serif",
    group: "600 15px Arial, sans-serif",
    author: "600 13px Arial, sans-serif",
    status: "600 12px Arial, sans-serif",
    content: "14px Arial, sans-serif",
    replyLabel: "600 12px Arial, sans-serif",
    replyAuthor: "600 12px Arial, sans-serif",
    replyContent: "13px Arial, sans-serif",
    badge: "600 12px Arial, sans-serif"
};

export interface FeedbackGroup {
    number: number;
    nodeId: string;
    nodeLabel: string;
    feedbacks: Feedback[];
}

interface FeedbackReplyLayout {
    authorLines: string[];
    contentLines: string[];
}

interface FeedbackCardLayout {
    feedback: Feedback;
    top: number;
    height: number;
    authorLines: string[];
    contentLines: string[];
    replies: FeedbackReplyLayout[];
}

interface FeedbackGroupLayout {
    group: FeedbackGroup;
    top: number;
    headerHeight: number;
    labelLines: string[];
    cards: FeedbackCardLayout[];
}

export interface FeedbackPanelLayout {
    width: number;
    height: number;
    feedbackCount: number;
    groups: FeedbackGroupLayout[];
}

export interface GraphNodeBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface FeedbackNodeBadge {
    number: number;
    x: number;
    y: number;
}

export interface ExportPoint {
    x: number;
    y: number;
}

export interface PngExportDimensions {
    width: number;
    height: number;
    hasFeedbackPanel: boolean;
}

type NodeLabelResolver = (nodeId: string) => string | null | undefined;
type NodeBoundsResolver = (nodeId: string) => GraphNodeBounds | null | undefined;
type PointConverter = (point: ExportPoint) => ExportPoint;

const getExplicitNodeLabel = (feedbacks: Feedback[]): string | undefined =>
    feedbacks
        .map((feedback) => feedback.nodeLabel?.trim())
        .find((label): label is string => Boolean(label));

/**
 * Groups feedback by the first occurrence of each node id. Map insertion order
 * makes both the group numbering and the panel order deterministic.
 */
export const groupFeedbackByNode = (
    feedbacks: Feedback[],
    resolveNodeLabel: NodeLabelResolver = () => undefined
): FeedbackGroup[] => {
    const groupedFeedback = new Map<string, Feedback[]>();

    feedbacks.forEach((feedback) => {
        const group = groupedFeedback.get(feedback.nodeId);

        if (group) {
            group.push(feedback);
        } else {
            groupedFeedback.set(feedback.nodeId, [feedback]);
        }
    });

    return Array.from(groupedFeedback.entries()).map(
        ([nodeId, nodeFeedbacks], index) => {
            const resolvedLabel = resolveNodeLabel(nodeId)?.trim();

            return {
                number: index + 1,
                nodeId,
                nodeLabel:
                    getExplicitNodeLabel(nodeFeedbacks) ??
                    (resolvedLabel || nodeId),
                feedbacks: nodeFeedbacks
            };
        }
    );
};

const splitLongToken = (
    context: CanvasRenderingContext2D,
    token: string,
    maxWidth: number
): string[] => {
    const chunks: string[] = [];
    let chunk = "";

    Array.from(token).forEach((character) => {
        const candidate = chunk + character;

        if (chunk && context.measureText(candidate).width > maxWidth) {
            chunks.push(chunk);
            chunk = character;
        } else {
            chunk = candidate;
        }
    });

    if (chunk) {
        chunks.push(chunk);
    }

    return chunks;
};

/**
 * Wraps normal prose at whitespace while still splitting CJK text and long
 * uninterrupted strings by Unicode code point so content can never overflow.
 */
export const wrapCanvasText = (
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
): string[] => {
    const lines: string[] = [];

    text.replace(/\r\n?/g, "\n").split("\n").forEach((paragraph) => {
        if (!paragraph) {
            lines.push("");
            return;
        }

        const tokens = paragraph.match(/\s+|[^\s]+/gu) ?? [];
        let currentLine = "";

        tokens.forEach((token) => {
            if (/^\s+$/u.test(token)) {
                if (
                    currentLine &&
                    context.measureText(currentLine + token).width <= maxWidth
                ) {
                    currentLine += token;
                }
                return;
            }

            const candidate = currentLine + token;

            if (context.measureText(candidate).width <= maxWidth) {
                currentLine = candidate;
                return;
            }

            if (currentLine) {
                lines.push(currentLine.trimEnd());
                currentLine = "";
            }

            if (context.measureText(token).width <= maxWidth) {
                currentLine = token;
                return;
            }

            const chunks = splitLongToken(context, token, maxWidth);
            lines.push(...chunks.slice(0, -1));
            currentLine = chunks[chunks.length - 1] ?? "";
        });

        lines.push(currentLine.trimEnd());
    });

    return lines;
};

const getWrappedLines = (
    context: CanvasRenderingContext2D,
    text: string,
    font: string,
    maxWidth: number
): string[] => {
    context.font = font;
    return wrapCanvasText(context, text, maxWidth);
};

const calculateCardLayout = (
    context: CanvasRenderingContext2D,
    feedback: Feedback,
    top: number
): FeedbackCardLayout => {
    const authorLines = getWrappedLines(
        context,
        `Author: ${feedback.author}`,
        FONTS.author,
        CARD_CONTENT_WIDTH
    );
    const contentLines = getWrappedLines(
        context,
        feedback.content,
        FONTS.content,
        CARD_CONTENT_WIDTH
    );
    const replies = (feedback.replies ?? []).map((reply) => ({
        authorLines: getWrappedLines(
            context,
            `Reply - ${reply.author}`,
            FONTS.replyAuthor,
            CARD_CONTENT_WIDTH - 12
        ),
        contentLines: getWrappedLines(
            context,
            reply.content,
            FONTS.replyContent,
            CARD_CONTENT_WIDTH - 12
        )
    }));

    let height = CARD_PADDING;
    height += authorLines.length * AUTHOR_LINE_HEIGHT;
    height += 4 + AUTHOR_LINE_HEIGHT;
    height += 10 + contentLines.length * CONTENT_LINE_HEIGHT;

    if (replies.length > 0) {
        height += 12 + REPLY_LINE_HEIGHT;
        replies.forEach((reply) => {
            height += 8;
            height += reply.authorLines.length * REPLY_LINE_HEIGHT;
            height += 2 + reply.contentLines.length * REPLY_LINE_HEIGHT;
        });
    }

    height += CARD_PADDING;

    return {
        feedback,
        top,
        height,
        authorLines,
        contentLines,
        replies
    };
};

export const calculateFeedbackPanelLayout = (
    context: CanvasRenderingContext2D,
    groups: FeedbackGroup[]
): FeedbackPanelLayout => {
    context.save();

    let cursor = 88;
    const groupLayouts = groups.map((group) => {
        const labelLines = getWrappedLines(
            context,
            group.nodeLabel,
            FONTS.group,
            PANEL_CONTENT_WIDTH - GROUP_NUMBER_DIAMETER - GROUP_HEADER_GAP
        );
        const headerHeight = Math.max(
            GROUP_NUMBER_DIAMETER,
            labelLines.length * CONTENT_LINE_HEIGHT
        );
        let cardTop = cursor + headerHeight + 10;
        const cards = group.feedbacks.map((feedback) => {
            const card = calculateCardLayout(context, feedback, cardTop);
            cardTop += card.height + CARD_GAP;
            return card;
        });
        const layout = {
            group,
            top: cursor,
            headerHeight,
            labelLines,
            cards
        };

        cursor = cardTop - CARD_GAP + GROUP_GAP;
        return layout;
    });

    context.restore();

    return {
        width: PNG_FEEDBACK_PANEL_WIDTH,
        height: Math.max(112, cursor + 4),
        feedbackCount: groups.reduce(
            (count, group) => count + group.feedbacks.length,
            0
        ),
        groups: groupLayouts
    };
};

export const calculatePngExportDimensions = (
    graphWidth: number,
    graphHeight: number,
    panelLayout: FeedbackPanelLayout | null
): PngExportDimensions => {
    if (!panelLayout) {
        return {
            width: graphWidth,
            height: graphHeight,
            hasFeedbackPanel: false
        };
    }

    return {
        width: graphWidth + PNG_FEEDBACK_PANEL_GAP + panelLayout.width,
        height: Math.max(graphHeight, panelLayout.height),
        hasFeedbackPanel: true
    };
};

export const getFeedbackNodeBadges = (
    groups: FeedbackGroup[],
    resolveNodeBounds: NodeBoundsResolver,
    convertPoint: PointConverter = (point) => point
): FeedbackNodeBadge[] =>
    groups.flatMap((group) => {
        const bounds = resolveNodeBounds(group.nodeId);

        if (!bounds) {
            return [];
        }

        const point = convertPoint({
            x: bounds.x + bounds.width,
            y: bounds.y
        });

        return [{number: group.number, x: point.x, y: point.y}];
    });

/**
 * Cell states use the SVG's user coordinate system. Mapping through the live
 * SVG screen CTM keeps badges aligned when a viewBox or CSS/SVG transform is
 * present, then normalises the result back into exported logical pixels.
 */
export const createSvgToCanvasPointConverter = (
    svgElement: SVGSVGElement,
    canvasWidth: number,
    canvasHeight: number,
    coordinateElement: SVGGraphicsElement = svgElement
): PointConverter => {
    try {
        const matrix = coordinateElement.getScreenCTM();
        const bounds = svgElement.getBoundingClientRect();

        if (!matrix || bounds.width <= 0 || bounds.height <= 0) {
            return (point) => point;
        }

        return (point) => {
            const svgPoint = svgElement.createSVGPoint();
            svgPoint.x = point.x;
            svgPoint.y = point.y;
            const screenPoint = svgPoint.matrixTransform(matrix);

            return {
                x: (screenPoint.x - bounds.left) * canvasWidth / bounds.width,
                y: (screenPoint.y - bounds.top) * canvasHeight / bounds.height
            };
        };
    } catch {
        return (point) => point;
    }
};

const drawLines = (
    context: CanvasRenderingContext2D,
    lines: string[],
    x: number,
    y: number,
    lineHeight: number
): number => {
    lines.forEach((line, index) => {
        context.fillText(line, x, y + index * lineHeight);
    });

    return y + lines.length * lineHeight;
};

const drawCircleNumber = (
    context: CanvasRenderingContext2D,
    number: number,
    x: number,
    y: number,
    radius: number,
    withOutline = false
) => {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = COLORS.purple;
    context.fill();

    if (withOutline) {
        context.strokeStyle = COLORS.white;
        context.lineWidth = 2;
        context.stroke();
    }

    context.font = FONTS.badge;
    context.fillStyle = COLORS.white;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(number), x, y + 0.5);
};

export const drawFeedbackNodeBadges = (
    context: CanvasRenderingContext2D,
    badges: FeedbackNodeBadge[]
) => {
    context.save();
    badges.forEach((badge) => {
        drawCircleNumber(context, badge.number, badge.x, badge.y, 12, true);
    });
    context.restore();
};

const drawFeedbackCard = (
    context: CanvasRenderingContext2D,
    card: FeedbackCardLayout,
    panelX: number
) => {
    const cardX = panelX + PANEL_PADDING;
    const textX = cardX + CARD_PADDING;

    context.fillStyle = COLORS.white;
    context.fillRect(cardX, card.top, PANEL_CONTENT_WIDTH, card.height);
    context.strokeStyle = COLORS.border;
    context.lineWidth = 1;
    context.strokeRect(
        cardX + 0.5,
        card.top + 0.5,
        PANEL_CONTENT_WIDTH - 1,
        card.height - 1
    );

    let cursor = card.top + CARD_PADDING;
    context.font = FONTS.author;
    context.fillStyle = COLORS.text;
    cursor = drawLines(
        context,
        card.authorLines,
        textX,
        cursor,
        AUTHOR_LINE_HEIGHT
    );

    cursor += 4;
    context.font = FONTS.status;
    context.fillStyle = card.feedback.status === "resolved"
        ? COLORS.resolved
        : COLORS.open;
    context.fillText(
        card.feedback.status === "resolved" ? "Resolved" : "Open",
        textX,
        cursor
    );
    cursor += AUTHOR_LINE_HEIGHT + 10;

    context.font = FONTS.content;
    context.fillStyle = COLORS.text;
    cursor = drawLines(
        context,
        card.contentLines,
        textX,
        cursor,
        CONTENT_LINE_HEIGHT
    );

    if (card.replies.length === 0) {
        return;
    }

    cursor += 12;
    context.font = FONTS.replyLabel;
    context.fillStyle = COLORS.muted;
    context.fillText("Replies", textX, cursor);
    cursor += REPLY_LINE_HEIGHT;

    card.replies.forEach((reply) => {
        cursor += 8;
        context.font = FONTS.replyAuthor;
        context.fillStyle = COLORS.purple;
        cursor = drawLines(
            context,
            reply.authorLines,
            textX + 12,
            cursor,
            REPLY_LINE_HEIGHT
        );
        cursor += 2;
        context.font = FONTS.replyContent;
        context.fillStyle = COLORS.text;
        cursor = drawLines(
            context,
            reply.contentLines,
            textX + 12,
            cursor,
            REPLY_LINE_HEIGHT
        );
    });
};

export const drawFeedbackPanel = (
    context: CanvasRenderingContext2D,
    layout: FeedbackPanelLayout,
    panelX: number,
    canvasHeight: number
) => {
    context.save();
    context.textAlign = "left";
    context.textBaseline = "top";

    context.fillStyle = COLORS.paper;
    context.fillRect(panelX, 0, layout.width, canvasHeight);
    context.strokeStyle = COLORS.border;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(panelX + 0.5, 0);
    context.lineTo(panelX + 0.5, canvasHeight);
    context.stroke();

    context.font = FONTS.title;
    context.fillStyle = COLORS.text;
    context.fillText(
        `Feedback (${layout.feedbackCount})`,
        panelX + PANEL_PADDING,
        PANEL_PADDING
    );

    context.strokeStyle = COLORS.border;
    context.beginPath();
    context.moveTo(panelX + PANEL_PADDING, 69.5);
    context.lineTo(panelX + layout.width - PANEL_PADDING, 69.5);
    context.stroke();

    layout.groups.forEach((groupLayout) => {
        drawCircleNumber(
            context,
            groupLayout.group.number,
            panelX + PANEL_PADDING + GROUP_NUMBER_DIAMETER / 2,
            groupLayout.top + GROUP_NUMBER_DIAMETER / 2,
            GROUP_NUMBER_DIAMETER / 2
        );

        context.textAlign = "left";
        context.textBaseline = "top";
        context.font = FONTS.group;
        context.fillStyle = COLORS.text;
        drawLines(
            context,
            groupLayout.labelLines,
            panelX + PANEL_PADDING + GROUP_NUMBER_DIAMETER + GROUP_HEADER_GAP,
            groupLayout.top + 1,
            CONTENT_LINE_HEIGHT
        );

        groupLayout.cards.forEach((card) => {
            drawFeedbackCard(context, card, panelX);
        });
    });

    context.restore();
};
