import {deflate, inflate} from "pako";
import {decompressFromEncodedURIComponent} from "lz-string";
import {z} from "zod";

import {getBasename} from "./basename";
import type {Feedback, TreeGoal} from "../types";
import type {Project} from "./projects";

// Shares a project by embedding a compressed, URL-safe snapshot in the URL
// fragment. v2 uses raw deflate + base64url and stores each tab's rows as
// goal-id references (no duplicated goal objects). Legacy v1 links, which were
// compressed with lz-string, are still decoded for backwards compatibility.
const SHARE_HASH_PREFIX = "#share=";
const SHARE_PAYLOAD_VERSION = 2;
const LEGACY_PAYLOAD_VERSION = 1;

// Version 40-L QR codes hold just under 3 KB in byte mode. Keeping some
// headroom makes the code easier for phone cameras to scan.
export const MAX_QR_URL_BYTES = 2800;

export type SharedProjectPayload = Pick<
    Project,
    "name" | "treeData" | "tabData"
> & {
    version: number;
    shareId: string;
    feedbacks: Feedback[];
};

// --- base64url helpers (URL-safe, no padding) ---
const bytesToBase64Url = (bytes: Uint8Array): string => {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
};

const base64UrlToBytes = (value: string): Uint8Array => {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

// pako works on bytes, so bridge JSON text through UTF-8.
const encodeUtf8 = (text: string): Uint8Array =>
    new TextEncoder().encode(text);

const decodeUtf8 = (bytes: Uint8Array): string =>
    new TextDecoder().decode(bytes);

// --- Schemas ---
const LabelSchema = z.enum(["Do", "Be", "Feel", "Concern", "Who"]);

const InstanceIdSchema = z.string().regex(/^-?\d+-\d+$/);

const TreeGoalSchema: z.ZodType<TreeGoal> = z.lazy(() =>
    z.object({
        id: z.number().finite(),
        content: z.string(),
        type: LabelSchema,
        instanceId: InstanceIdSchema,
        children: z.array(TreeGoalSchema).optional(),
        color: z.string().optional(),
        x: z.number().finite().optional(),
        y: z.number().finite().optional(),
    })
);

const FeedbackReplySchema = z.object({
    id: z.string(),
    author: z.string(),
    content: z.string(),
    createdAt: z.string(),
});

const FeedbackSchema = z.object({
    id: z.string(),
    nodeId: z.string(),
    nodeLabel: z.string().optional(),
    author: z.string(),
    content: z.string(),
    createdAt: z.string(),
    status: z.enum(["open", "resolved"]),
    replyCount: z.number().int().nonnegative().optional(),
    replies: z.array(FeedbackReplySchema).optional(),
});

const PayloadBaseSchema = z.object({
    shareId: z.string().min(1).max(200),
    name: z.string().max(200),
    treeData: z.array(TreeGoalSchema),
    feedbacks: z.array(FeedbackSchema),
});

// v2: each tab references its rows by goal id instead of embedding them.
const V2PayloadSchema = PayloadBaseSchema.extend({
    version: z.literal(SHARE_PAYLOAD_VERSION),
    tabData: z.array(
        z.object({
            label: LabelSchema,
            icon: z.string(),
            rows: z.array(z.number().int().nonnegative()),
        })
    ),
});

// v1 (legacy): rows are the full goal objects, compressed with lz-string.
const V1PayloadSchema = PayloadBaseSchema.extend({
    version: z.literal(LEGACY_PAYLOAD_VERSION),
    tabData: z.array(
        z.object({
            label: LabelSchema,
            icon: z.string(),
            rows: z.array(TreeGoalSchema),
        })
    ),
});

// --- Helpers ---
const collectTreeGoalIds = (goals: TreeGoal[], ids: number[]): void => {
    goals.forEach((goal) => {
        ids.push(goal.id);
        collectTreeGoalIds(goal.children ?? [], ids);
    });
};

const collectGoals = (goals: TreeGoal[], byId: Map<number, TreeGoal>): void => {
    goals.forEach((goal) => {
        byId.set(goal.id, goal);
        collectGoals(goal.children ?? [], byId);
    });
};

// Every tree goal must be referenced from the tab data exactly once. This
// invariant lets the decoder rebuild v2 tab rows from the tree.
const assertValidGoalRefs = (
    treeData: TreeGoal[],
    tabGoalIds: number[]
): void => {
    const uniqueTabGoalIds = new Set(tabGoalIds);
    if (uniqueTabGoalIds.size !== tabGoalIds.length) {
        throw new Error(
            "The shared project data contains invalid goal references."
        );
    }

    const treeGoalIds: number[] = [];
    collectTreeGoalIds(treeData, treeGoalIds);
    if (treeGoalIds.some((goalId) => !uniqueTabGoalIds.has(goalId))) {
        throw new Error(
            "The shared project data contains invalid goal references."
        );
    }
};

// Rebuild the tab rows (id refs) back into goal objects from the tree.
const normalizeV2 = (
    payload: z.infer<typeof V2PayloadSchema>
): SharedProjectPayload => {
    const goalById = new Map<number, TreeGoal>();
    collectGoals(payload.treeData, goalById);

    return {
        version: payload.version,
        shareId: payload.shareId,
        name: payload.name,
        treeData: payload.treeData,
        tabData: payload.tabData.map((tab) => ({
            label: tab.label,
            icon: tab.icon,
            rows: tab.rows
                .map((id) => goalById.get(id))
                .filter((goal): goal is TreeGoal => goal !== undefined),
        })),
        feedbacks: payload.feedbacks,
    };
};

// Try the current v2 deflate format. Returns undefined when the payload is not
// v2 (e.g. a legacy v1 link), but propagates validation errors for real v2 data.
const tryDecodeV2 = (
    encoded: string
): SharedProjectPayload | undefined => {
    let json: string;
    try {
        json = decodeUtf8(inflate(base64UrlToBytes(encoded), {raw: true}));
    } catch {
        return undefined;
    }

    let data: unknown;
    try {
        data = JSON.parse(json);
    } catch {
        return undefined;
    }

    const result = V2PayloadSchema.safeParse(data);
    if (!result.success) {
        throw new Error("The shared project data is invalid or unsupported.");
    }

    assertValidGoalRefs(
        result.data.treeData,
        result.data.tabData.flatMap((tab) => tab.rows)
    );
    return normalizeV2(result.data);
};

// Try the legacy v1 lz-string format.
const tryDecodeV1 = (
    encoded: string
): SharedProjectPayload | undefined => {
    let json: string;
    try {
        const decoded = decompressFromEncodedURIComponent(encoded);
        if (!decoded) {
            return undefined;
        }
        json = decoded;
    } catch {
        return undefined;
    }

    let data: unknown;
    try {
        data = JSON.parse(json);
    } catch {
        return undefined;
    }

    const result = V1PayloadSchema.safeParse(data);
    if (!result.success) {
        throw new Error("The shared project data is invalid or unsupported.");
    }

    assertValidGoalRefs(
        result.data.treeData,
        result.data.tabData.flatMap((tab) =>
            tab.rows.map((goal) => goal.id)
        )
    );
    return result.data as SharedProjectPayload;
};

export const encodeSharedProject = (project: Project): string => {
    const payload = {
        version: SHARE_PAYLOAD_VERSION,
        shareId: `${project.id}:${project.updatedAt}`,
        name: project.name,
        treeData: project.treeData,
        tabData: project.tabData.map((tab) => ({
            label: tab.label,
            icon: tab.icon,
            rows: tab.rows.map((goal) => goal.id),
        })),
        feedbacks: project.feedbacks ?? [],
    };

    const compressed = deflate(encodeUtf8(JSON.stringify(payload)), {
        raw: true,
        level: 9,
    });
    return bytesToBase64Url(compressed);
};

export const decodeSharedProjectHash = (
    hash: string
): SharedProjectPayload | null => {
    if (!hash.startsWith(SHARE_HASH_PREFIX)) {
        return null;
    }

    const encodedPayload = hash.slice(SHARE_HASH_PREFIX.length);
    if (!encodedPayload || encodedPayload.length > MAX_QR_URL_BYTES) {
        throw new Error("The shared project link is invalid or too large.");
    }

    // Prefer the current v2 format, then fall back to legacy v1 links.
    const v2 = tryDecodeV2(encodedPayload);
    if (v2) {
        return v2;
    }

    const v1 = tryDecodeV1(encodedPayload);
    if (v1) {
        return v1;
    }

    throw new Error("The shared project link could not be decoded.");
};

export const createProjectShareUrl = (
    project: Project,
    origin: string = window.location.origin,
    basename: string = getBasename()
): string => {
    const normalizedBasename = basename.replace(/\/$/, "");
    const url = new URL(`${normalizedBasename}/`, origin);
    url.hash = `share=${encodeSharedProject(project)}`;
    return url.toString();
};

export const getShareUrlByteLength = (url: string): number =>
    new TextEncoder().encode(url).length;
