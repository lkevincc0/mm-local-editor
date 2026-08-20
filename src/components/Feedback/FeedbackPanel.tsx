import React, {
    useMemo,
    useState
} from "react";

import FeedbackItem from "./FeedbackItem";

import {useFeedbackContext} from "../context/FeedbackContext";

import "./FeedbackPanel.css";

type FeedbackFilter =
    | "all"
    | "open"
    | "resolved";

interface FeedbackPanelProps {
    /**
     * Called when the user closes the feedback panel.
     */
    onClose: () => void;

    /**
     * Reserved for the reply feature.
     */
    onReply?: (feedbackId: string) => void;

    /**
     * Called when the user clicks a feedback card, to locate its node
     * on the graph canvas.
     */
    onSelectNode?: (nodeId: string) => void;
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
    onClose,
    onReply,
    onSelectNode
}) => {
    const {
        feedbacks,
        selectedNodeId,
        selectedNodeLabel,
        addFeedback,
        updateFeedbackStatus,
        deleteFeedback
    } = useFeedbackContext();

    const [activeFilter, setActiveFilter] =
        useState<FeedbackFilter>("all");

    const [isComposerOpen, setIsComposerOpen] =
        useState(false);

    const [newFeedback, setNewFeedback] =
        useState("");

    /**
     * Feedback shown in the list. When a graph node is selected only that
     * node's feedback is shown; otherwise all feedback across the model is
     * listed so nothing stays hidden until its node happens to be clicked.
     */
    const visibleFeedbacks = useMemo(() => {
        if (!selectedNodeId) {
            return feedbacks;
        }

        return feedbacks.filter(
            (feedback) =>
                feedback.nodeId === selectedNodeId
        );
    }, [feedbacks, selectedNodeId]);

    const openCount = useMemo(
        () =>
            visibleFeedbacks.filter(
                (feedback) =>
                    feedback.status === "open"
            ).length,
        [visibleFeedbacks]
    );

    const resolvedCount = useMemo(
        () =>
            visibleFeedbacks.filter(
                (feedback) =>
                    feedback.status === "resolved"
            ).length,
        [visibleFeedbacks]
    );

    const filteredFeedbacks = useMemo(() => {
        switch (activeFilter) {
            case "open":
                return visibleFeedbacks.filter(
                    (feedback) =>
                        feedback.status === "open"
                );

            case "resolved":
                return visibleFeedbacks.filter(
                    (feedback) =>
                        feedback.status === "resolved"
                );

            case "all":
            default:
                return visibleFeedbacks;
        }
    }, [activeFilter, visibleFeedbacks]);

    const handleSubmitFeedback = () => {
        const content = newFeedback.trim();

        if (
            !selectedNodeId ||
            !content
        ) {
            return;
        }

        addFeedback(
            selectedNodeId,
            content,
            selectedNodeLabel ?? undefined
        );

        setNewFeedback("");
        setIsComposerOpen(false);

        /**
         * Newly-created feedback is normally unresolved,
         * so switch back to All to ensure that the user sees it.
         */
        setActiveFilter("all");
    };

    const handleCancelComposer = () => {
        setNewFeedback("");
        setIsComposerOpen(false);
    };

    return (
        <aside className="feedback-panel">
            <header className="feedback-panel-header">
                <div>
                    <span className="feedback-panel-eyebrow">
                        Review
                    </span>

                    <h2>Feedback</h2>
                </div>

                <button
                    type="button"
                    className="feedback-close-button"
                    onClick={onClose}
                    aria-label="Close feedback panel"
                >
                    ×
                </button>
            </header>

            {selectedNodeId ? (
                <section className="feedback-node-context">
                    <span className="feedback-node-label">
                        Attached to
                    </span>

                    <span
                        className="feedback-node-name"
                        title={
                            selectedNodeLabel ??
                            selectedNodeId
                        }
                    >
                        {selectedNodeLabel ??
                            selectedNodeId}
                    </span>

                    {!isComposerOpen && (
                        <button
                            type="button"
                            className="feedback-new-button"
                            onClick={() =>
                                setIsComposerOpen(true)
                            }
                        >
                            + New Feedback
                        </button>
                    )}
                </section>
            ) : (
                <div className="feedback-all-context">
                    <span className="feedback-all-title">
                        All feedback
                    </span>

                    <span className="feedback-all-hint">
                        Click a card to locate its node
                    </span>
                </div>
            )}

            {isComposerOpen && selectedNodeId && (
                <section className="feedback-composer">
                    <label
                        htmlFor="feedback-new-content"
                        className="feedback-composer-label"
                    >
                        New Feedback
                    </label>

                    <textarea
                        id="feedback-new-content"
                        className="feedback-composer-textarea"
                        value={newFeedback}
                        onChange={(event) =>
                            setNewFeedback(
                                event.target.value
                            )
                        }
                        placeholder={`Add feedback about ${
                            selectedNodeLabel ??
                            selectedNodeId
                        }...`}
                        rows={4}
                        autoFocus
                    />

                    <div className="feedback-composer-actions">
                        <button
                            type="button"
                            className="feedback-cancel-button"
                            onClick={
                                handleCancelComposer
                            }
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            className="feedback-submit-button"
                            onClick={
                                handleSubmitFeedback
                            }
                            disabled={
                                !newFeedback.trim()
                            }
                        >
                            Add Feedback
                        </button>
                    </div>
                </section>
            )}

            <nav
                className="feedback-filter-tabs"
                aria-label="Feedback filters"
            >
                <button
                    type="button"
                    className={
                        activeFilter === "all"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveFilter("all")
                    }
                >
                    All
                    <span>
                        {visibleFeedbacks.length}
                    </span>
                </button>

                <button
                    type="button"
                    className={
                        activeFilter === "open"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveFilter("open")
                    }
                >
                    Unresolved
                    <span>{openCount}</span>
                </button>

                <button
                    type="button"
                    className={
                        activeFilter === "resolved"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveFilter(
                            "resolved"
                        )
                    }
                >
                    Resolved
                    <span>{resolvedCount}</span>
                </button>
            </nav>

            <div className="feedback-list">
                {filteredFeedbacks.length > 0 ? (
                    filteredFeedbacks.map(
                        (feedback) => (
                            <FeedbackItem
                                key={feedback.id}
                                feedback={feedback}
                                onStatusChange={updateFeedbackStatus}
                                onReply={onReply}
                                onDelete={deleteFeedback}
                                onSelectNode={onSelectNode}
                            />
                        )
                    )
                ) : (
                    <div className="feedback-empty-list">
                        <strong>
                            {activeFilter === "all"
                                ? "No feedback yet"
                                : activeFilter ===
                                  "open"
                                ? "No unresolved feedback"
                                : "No resolved feedback"}
                        </strong>

                        <p>
                            {activeFilter === "all"
                                ? "Add the first feedback item for this node."
                                : "Try another feedback filter."}
                        </p>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default FeedbackPanel;