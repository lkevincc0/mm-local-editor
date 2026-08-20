/**
* @jest-environment jsdom
*/
import {act, renderHook} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {beforeEach, describe, expect, it} from "vitest";
import {FeedbackProvider, useFeedbackContext} from "./FeedbackContext";
import {ProfileProvider} from "./ProfileContext";
import ProjectProvider from "./ProjectProvider";

const wrapper = ({children}: PropsWithChildren) => (
    <ProfileProvider>
        <ProjectProvider>
            <FeedbackProvider>{children}</FeedbackProvider>
        </ProjectProvider>
    </ProfileProvider>
);

describe("FeedbackProvider", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("starts with no feedback", () => {
        const {result} = renderHook(() => useFeedbackContext(), {wrapper});

        expect(result.current.feedbacks).toEqual([]);
    });

    it("adds a new feedback to the front", () => {
        const {result} = renderHook(() => useFeedbackContext(), {wrapper});

        act(() => {
            result.current.addFeedback(
                "Functional-8-1",
                "needs more detail",
                "Do3"
            );
        });

        expect(result.current.feedbacks).toHaveLength(1);
        expect(result.current.feedbacks[0]).toMatchObject({
            nodeId: "Functional-8-1",
            nodeLabel: "Do3",
            content: "needs more detail",
            status: "open",
            author: "Current User"
        });
    });

    it("updates a feedback status", () => {
        const {result} = renderHook(() => useFeedbackContext(), {wrapper});

        act(() => {
            result.current.addFeedback(
                "Functional-6-1",
                "needs a clearer outcome"
            );
        });

        const addedId = result.current.feedbacks[0].id;

        act(() => {
            result.current.updateFeedbackStatus(
                addedId,
                "resolved"
            );
        });

        expect(
            result.current.feedbacks.find(
                (feedback) => feedback.id === addedId
            )?.status
        ).toBe("resolved");
    });

    it("deletes a feedback", () => {
        const {result} = renderHook(() => useFeedbackContext(), {wrapper});

        act(() => {
            result.current.addFeedback(
                "Functional-6-1",
                "needs a clearer outcome"
            );
        });

        const addedId = result.current.feedbacks[0].id;

        act(() => {
            result.current.deleteFeedback(addedId);
        });

        expect(result.current.feedbacks).toHaveLength(0);
        expect(
            result.current.feedbacks.some(
                (feedback) => feedback.id === addedId
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
