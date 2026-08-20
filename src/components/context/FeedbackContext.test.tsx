/**
* @jest-environment jsdom
*/
import {act, renderHook} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {describe, expect, it} from "vitest";
import {FeedbackProvider, useFeedbackContext} from "./FeedbackContext";

const wrapper = ({children}: PropsWithChildren) => (
    <FeedbackProvider>{children}</FeedbackProvider>
);

describe("FeedbackProvider", () => {
    it("seeds demo feedback for the Do1 node", () => {
        const {result} = renderHook(() => useFeedbackContext(), {wrapper});

        expect(result.current.feedbacks).toHaveLength(3);
        expect(
            result.current.feedbacks.every(
                (feedback) => feedback.nodeId === "Functional-6-1"
            )
        ).toBe(true);
    });

    it("adds a new feedback to the front", () => {
        const {result} = renderHook(() => useFeedbackContext(), {wrapper});

        act(() => {
            result.current.addFeedback(
                "Functional-8-1",
                "needs more detail"
            );
        });

        expect(result.current.feedbacks).toHaveLength(4);
        expect(result.current.feedbacks[0]).toMatchObject({
            nodeId: "Functional-8-1",
            content: "needs more detail",
            status: "open",
            author: "Current User"
        });
    });

    it("updates a feedback status", () => {
        const {result} = renderHook(() => useFeedbackContext(), {wrapper});

        act(() => {
            result.current.updateFeedbackStatus(
                "feedback-1",
                "resolved"
            );
        });

        expect(
            result.current.feedbacks.find(
                (feedback) => feedback.id === "feedback-1"
            )?.status
        ).toBe("resolved");
    });

    it("deletes a feedback", () => {
        const {result} = renderHook(() => useFeedbackContext(), {wrapper});

        act(() => {
            result.current.deleteFeedback("feedback-1");
        });

        expect(result.current.feedbacks).toHaveLength(2);
        expect(
            result.current.feedbacks.some(
                (feedback) => feedback.id === "feedback-1"
            )
        ).toBe(false);
    });

    it("selects a node with its label", () => {
        const {result} = renderHook(() => useFeedbackContext(), {wrapper});

        act(() => {
            result.current.setSelectedNode(
                "Functional-6-1",
                "Do1"
            );
        });

        expect(result.current.selectedNodeId).toBe(
            "Functional-6-1"
        );
        expect(result.current.selectedNodeLabel).toBe("Do1");
    });

    it("clears the selected node", () => {
        const {result} = renderHook(() => useFeedbackContext(), {wrapper});

        act(() => {
            result.current.setSelectedNode(
                "Functional-6-1",
                "Do1"
            );
            result.current.setSelectedNode(null);
        });

        expect(result.current.selectedNodeId).toBeNull();
        expect(result.current.selectedNodeLabel).toBeNull();
    });
});
