/**
* @jest-environment jsdom
*/
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import CanvasToolbar from "./CanvasToolbar";

const renderToolbar = () => {
    const setShowGoalSection = vi.fn();
    const setShowHierarchySection = vi.fn();
    const setShowGraphSection = vi.fn();
    const setShowFeedbackSection = vi.fn();
    render(
        <CanvasToolbar
            showGoalSection={true}
            setShowGoalSection={setShowGoalSection}
            showHierarchySection={true}
            setShowHierarchySection={setShowHierarchySection}
            showGraphSection={true}
            setShowGraphSection={setShowGraphSection}
            showFeedbackSection={true}
            setShowFeedbackSection={setShowFeedbackSection}
        />
    );
    return {setShowGoalSection, setShowHierarchySection, setShowGraphSection, setShowFeedbackSection};
};

describe("CanvasToolbar", () => {
    afterEach(cleanup);

    it("toggles the goal list panel", () => {
        const {setShowGoalSection} = renderToolbar();
        fireEvent.click(screen.getByRole("button", {name: "Goal list"}));
        expect(setShowGoalSection).toHaveBeenCalledWith(false);
    });

    it("toggles the canvas panel", () => {
        const {setShowGraphSection} = renderToolbar();
        fireEvent.click(screen.getByRole("button", {name: "Canvas"}));
        expect(setShowGraphSection).toHaveBeenCalledWith(false);
    });

    it("toggles the hierarchy panel", () => {
        const {setShowHierarchySection} = renderToolbar();
        fireEvent.click(screen.getByRole("button", {name: "Hierarchy"}));
        expect(setShowHierarchySection).toHaveBeenCalledWith(false);
    });

    it("toggles the feedback panel", () => {
        const {setShowFeedbackSection} = renderToolbar();
        fireEvent.click(screen.getByRole("button", {name: "Feedback"}));
        expect(setShowFeedbackSection).toHaveBeenCalledWith(false);
    });
});
