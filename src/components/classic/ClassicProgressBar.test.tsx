/**
* @jest-environment jsdom
*/
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import ClassicProgressBar from "./ClassicProgressBar";

const renderBar = (activeStep: "goals" | "model" = "goals") => {
    const onStepChange = vi.fn();
    const onToggleFeedback = vi.fn();
    render(
        <ClassicProgressBar
            activeStep={activeStep}
            onStepChange={onStepChange}
            showFeedbackSection={false}
            onToggleFeedback={onToggleFeedback}
        />
    );
    return {onStepChange, onToggleFeedback};
};

describe("ClassicProgressBar", () => {
    afterEach(cleanup);

    it("marks the active step with aria-current", () => {
        renderBar("goals");
        expect(screen.getByRole("button", {name: /Goal List/}).getAttribute("aria-current")).toBe("step");
        expect(screen.getByRole("button", {name: /Render Model/}).getAttribute("aria-current")).toBeNull();
    });

    it("switches to the model step", () => {
        const {onStepChange} = renderBar("goals");
        fireEvent.click(screen.getByRole("button", {name: /Render Model/}));
        expect(onStepChange).toHaveBeenCalledWith("model");
    });

    it("switches to the goals step", () => {
        const {onStepChange} = renderBar("model");
        fireEvent.click(screen.getByRole("button", {name: /Goal List/}));
        expect(onStepChange).toHaveBeenCalledWith("goals");
    });

    it("toggles the feedback panel", () => {
        const {onToggleFeedback} = renderBar();
        fireEvent.click(screen.getByRole("button", {name: /Feedback/}));
        expect(onToggleFeedback).toHaveBeenCalled();
    });
});
