import {
    compressToEncodedURIComponent,
    decompressFromEncodedURIComponent,
} from "lz-string";
import {z} from "zod";

import {getBasename} from "./basename";
import type {Feedback, TreeGoal} from "../types";
import type {Project} from "./projects";

const SHARE_HASH_PREFIX = "#share=";
const SHARE_PAYLOAD_VERSION = 1;

// Version 40-L QR codes hold just under 3 KB in byte mode. Keeping some
// headroom makes the code easier for phone cameras to scan.
export const MAX_QR_URL_BYTES = 2800;

export type SharedProjectPayload = Pick<
    Project,
    "name" | "treeData" | "tabData"
> & {
    version: typeof SHARE_PAYLOAD_VERSION;
    shareId: string;
    feedbacks: Feedback[];
};

const LabelSchema = z.enum(["Do", "Be", "Feel", "Concern", "Who"]);

const InstanceIdSchema = z.string().regex(/^-?\d+-\d+$/);

const TreeGoalSchema: z.ZodType<TreeGoal> = z.lazy(() => z.object({
    id: z.number().finite(),
    content: z.string(),
    type: LabelSchema,
    instanceId: InstanceIdSchema,
    children: z.array(TreeGoalSchema).optional(),
    color: z.string().optional(),
    x: z.number().finite().optional(),
    y: z.number().finite().optional(),
}));

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

const SharedProjectPayloadSchema: z.ZodType<SharedProjectPayload> = z.object({
    version: z.literal(SHARE_PAYLOAD_VERSION),
    shareId: z.string().min(1).max(200),
    name: z.string().max(200),
    treeData: z.array(TreeGoalSchema),
    tabData: z.array(z.object({
        label: LabelSchema,
        icon: z.string(),
        rows: z.array(TreeGoalSchema),
    })),
    feedbacks: z.array(FeedbackSchema),
});

const collectTreeGoalIds = (goals: TreeGoal[], ids: number[]): void => {
    goals.forEach((goal) => {
        ids.push(goal.id);
        collectTreeGoalIds(goal.children ?? [], ids);
    });
};

const validatePayload = (value: unknown): SharedProjectPayload => {
    const result = SharedProjectPayloadSchema.safeParse(value);
    if (!result.success) {
        throw new Error("The shared project data is invalid or unsupported.");
    }

    const tabGoalIds = result.data.tabData.flatMap((tab) =>
        tab.rows.map((goal) => goal.id)
    );
    const uniqueTabGoalIds = new Set(tabGoalIds);
    const treeGoalIds: number[] = [];
    collectTreeGoalIds(result.data.treeData, treeGoalIds);

    if (
        uniqueTabGoalIds.size !== tabGoalIds.length ||
        treeGoalIds.some((goalId) => !uniqueTabGoalIds.has(goalId))
    ) {
        throw new Error("The shared project data contains invalid goal references.");
    }

    return result.data;
};

export const encodeSharedProject = (project: Project): string => {
    const payload: SharedProjectPayload = {
        version: SHARE_PAYLOAD_VERSION,
        shareId: `${project.id}:${project.updatedAt}`,
        name: project.name,
        treeData: project.treeData,
        tabData: project.tabData,
        feedbacks: project.feedbacks ?? [],
    };

    return compressToEncodedURIComponent(JSON.stringify(payload));
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

    const json = decompressFromEncodedURIComponent(encodedPayload);
    if (!json) {
        throw new Error("The shared project link could not be decoded.");
    }

    return validatePayload(JSON.parse(json));
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
