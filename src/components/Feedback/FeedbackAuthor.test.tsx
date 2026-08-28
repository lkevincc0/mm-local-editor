/**
 * @jest-environment jsdom
 */
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {ProfileProvider} from "../context/ProfileContext";
import FeedbackAuthor from "./FeedbackAuthor";

const renderAuthor = () => {
    render(
        <ProfileProvider>
            <FeedbackAuthor />
        </ProfileProvider>
    );
};

describe("FeedbackAuthor", () => {
    afterEach(cleanup);

    beforeEach(() => {
        localStorage.clear();
    });

    it("prompts to set a name when none is saved", () => {
        renderAuthor();

        expect(screen.getByText("Set name")).toBeTruthy();
    });

    it("saves a typed name and updates the display", () => {
        renderAuthor();

        fireEvent.click(
            screen.getByRole("button", {
                name: "Edit name and avatar"
            })
        );

        const input =
            screen.getByPlaceholderText("Your name");

        fireEvent.change(input, {
            target: {value: "Jinbao"}
        });

        fireEvent.click(
            screen.getByRole("button", {name: "Save"})
        );

        expect(screen.getByText("Jinbao")).toBeTruthy();
    });

    it("cancels editing without saving changes", () => {
        renderAuthor();

        fireEvent.click(
            screen.getByRole("button", {
                name: "Edit name and avatar"
            })
        );

        fireEvent.change(
            screen.getByPlaceholderText("Your name"),
            {target: {value: "Discarded"}}
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "Cancel"
            })
        );

        expect(screen.queryByText("Discarded")).toBeNull();
        expect(screen.getByText("Set name")).toBeTruthy();
    });

    it("shows the avatar shuffle control while editing", () => {
        renderAuthor();

        fireEvent.click(
            screen.getByRole("button", {
                name: "Edit name and avatar"
            })
        );

        expect(
            screen.getByRole("button", {
                name: "Change avatar"
            })
        ).toBeTruthy();
    });
});
