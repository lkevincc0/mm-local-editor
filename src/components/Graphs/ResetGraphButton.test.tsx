/**
* @jest-environment jsdom
*/
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {useEffect, useRef} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {defaultFeedbacks} from "../../data/defaultFeedback";
import {FeedbackProvider, useFeedbackContext} from "../context/FeedbackContext";
import {ProfileProvider} from "../context/ProfileContext";
import ProjectProvider from "../context/ProjectProvider";
import ResetGraphButton from "./ResetGraphButton";

const mockDispatch = vi.fn();

vi.mock("../context/FileProvider", async () => {
    const actual = await vi.importActual<typeof import("../context/FileProvider")>(
        "../context/FileProvider"
    );
    return {
        ...actual,
        useFileContext: () => ({dispatch: mockDispatch})
    };
});

// Renders alongside ResetGraphButton to seed stale feedback and expose the
// current feedback list so we can assert on what "Reset" leaves behind.
const FeedbackProbe = ({onFeedbacks}: {onFeedbacks: (count: number, ids: string[]) => void}) => {
    const {feedbacks, addFeedback} = useFeedbackContext();
    const seeded = useRef(false);

    useEffect(() => {
        if (seeded.current) {
            return;
        }
        seeded.current = true;
        addFeedback("Functional-1-1", "stale feedback from a previous graph");
    }, [addFeedback]);

    useEffect(() => {
        onFeedbacks(feedbacks.length, feedbacks.map((feedback) => feedback.id));
    }, [feedbacks, onFeedbacks]);

    return null;
};

const renderButton = (onFeedbacks: (count: number, ids: string[]) => void) => {
    render(
        <ProfileProvider>
            <ProjectProvider>
                <FeedbackProvider>
                    <FeedbackProbe onFeedbacks={onFeedbacks} />
                    <ResetGraphButton />
                </FeedbackProvider>
            </ProjectProvider>
        </ProfileProvider>
    );
};

describe("ResetGraphButton", () => {
    beforeEach(() => {
        localStorage.clear();
        mockDispatch.mockClear();
    });

    afterEach(() => {
        cleanup();
    });

    it("clears leftover feedback when resetting to Empty", () => {
        const onFeedbacks = vi.fn();
        renderButton(onFeedbacks);

        expect(onFeedbacks).toHaveBeenLastCalledWith(1, expect.any(Array));

        fireEvent.click(screen.getByText("Reset"));
        fireEvent.click(screen.getByText("Empty"));

        expect(mockDispatch).toHaveBeenCalled();
        expect(onFeedbacks).toHaveBeenLastCalledWith(0, []);
    });

    it("seeds the template feedback when resetting to Default", () => {
        const onFeedbacks = vi.fn();
        renderButton(onFeedbacks);

        fireEvent.click(screen.getByText("Reset"));
        fireEvent.click(screen.getByText("Default"));

        expect(mockDispatch).toHaveBeenCalled();
        expect(onFeedbacks).toHaveBeenLastCalledWith(
            defaultFeedbacks.length,
            defaultFeedbacks.map((feedback) => feedback.id)
        );
    });
});
