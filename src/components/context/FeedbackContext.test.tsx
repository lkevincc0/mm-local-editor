/**
* @jest-environment jsdom
*/
import {act, renderHook} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {beforeEach, describe, expect, it} from "vitest";
import {FeedbackProvider, useFeedbackContext} from "./FeedbackContext";
import {ProfileProvider} from "./ProfileContext";
import ProjectProvider from "./ProjectProvider";
import {useProjectContext} from "./ProjectContext";

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

    it("starts with no overall feedback", () => {
        const {result} = renderHook(() => useFeedbackContext(), {wrapper});

        expect(result.current.overallFeedback).toBeUndefined();
    });

    it("saves and clears the overall feedback", () => {
        const {result} = renderHook(
            () => ({
                feedback: useFeedbackContext(),
                projects: useProjectContext()
            }),
            {wrapper}
        );

        act(() => {
            result.current.projects.createProject("Feedback test");
        });

        act(() => {
            result.current.feedback.setOverallFeedback(
                "The model needs one more actor."
            );
        });

        expect(result.current.feedback.overallFeedback).toMatchObject({
            author: "Current User",
            content: "The model needs one more actor."
        });

        // Persisted into the project stored in localStorage.
        const stored = JSON.parse(
            localStorage.getItem("ammber/projects") ?? "[]"
        );
        expect(stored[0].overallFeedback.content).toBe(
            "The model needs one more actor."
        );

        act(() => {
            result.current.feedback.setOverallFeedback("   ");
        });

        expect(result.current.feedback.overallFeedback).toBeUndefined();

        const cleared = JSON.parse(
            localStorage.getItem("ammber/projects") ?? "[]"
        );
        expect(cleared[0].overallFeedback).toBeUndefined();
    });

    it("trims overall feedback content", () => {
        const {result} = renderHook(() => useFeedbackContext(), {wrapper});

        act(() => {
            result.current.setOverallFeedback(
                "  looks good overall  "
            );
        });

        expect(result.current.overallFeedback?.content).toBe(
            "looks good overall"
        );
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
