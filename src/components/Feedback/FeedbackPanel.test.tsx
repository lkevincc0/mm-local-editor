/**
* @jest-environment jsdom
*/
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import FeedbackPanel from "./FeedbackPanel";
import type {Feedback} from "../types.ts";

const feedbacks: Feedback[] = [
    {
        id: "feedback-1",
        nodeId: "Functional-6-1",
        nodeLabel: "Do1",
        author: "Kevin",
        content: "The boundary and purpose of Do1 could be clarified.",
        createdAt: "10 min ago",
        status: "open"
    },
    {
        id: "feedback-2",
        nodeId: "Functional-7-1",
        nodeLabel: "Do2",
        author: "Alice",
        content: "The relationship between Do1 and Do2 could be explained.",
        createdAt: "Yesterday",
        status: "resolved"
    }
];

const renderPanel = (
    overrides: Partial<Parameters<typeof FeedbackPanel>[0]> = {}
) => {
    const props = {
        selectedNodeId: null as string | null,
        feedbacks,
        onClose: vi.fn(),
        onAddFeedback: vi.fn(),
        onStatusChange: vi.fn(),
        onDeleteFeedback: vi.fn(),
        onSelectNode: vi.fn(),
        ...overrides
    };

    render(<FeedbackPanel {...props} />);

    return props;
};

describe("FeedbackPanel", () => {
    afterEach(cleanup);

    it("lists all feedback when no node is selected", () => {
        renderPanel();

        expect(screen.getByText("All feedback")).toBeTruthy();
        expect(screen.getByText("Kevin")).toBeTruthy();
        expect(screen.getByText("Alice")).toBeTruthy();
        expect(
            screen.queryByText(/Select a node/i)
        ).toBeNull();
    });

    it("shows only the selected node's feedback when a node is selected", () => {
        renderPanel({
            selectedNodeId: "Functional-6-1",
            selectedNodeLabel: "Do1"
        });

        expect(screen.getByText("Kevin")).toBeTruthy();
        expect(screen.queryByText("Alice")).toBeNull();
        expect(screen.getByText("Attached to")).toBeTruthy();
    });

    it("calls onSelectNode with the node id when a card is clicked", () => {
        const {onSelectNode} = renderPanel();

        fireEvent.click(
            screen.getByText(
                "The relationship between Do1 and Do2 could be explained."
            )
        );

        expect(onSelectNode).toHaveBeenCalledWith(
            "Functional-7-1"
        );
    });

    it("does not locate the node when a card button is clicked", () => {
        const {onSelectNode} = renderPanel();

        fireEvent.click(
            screen.getAllByRole("button", {name: "More feedback actions"})[0]
        );

        expect(onSelectNode).not.toHaveBeenCalled();
    });
});
