import React, {useState} from "react";

import type {
    Feedback,
    FeedbackStatus
} from "../types.ts";

interface FeedbackItemProps {
    feedback: Feedback;

    onStatusChange?: (
        feedbackId: string,
        newStatus: FeedbackStatus
    ) => void;

    onReply?: (feedbackId: string) => void;

    onDelete?: (feedbackId: string) => void;

    /**
     * Called when the card is clicked, to locate the node it is
     * attached to on the graph canvas.
     */
    onSelectNode?: (nodeId: string) => void;
}

const FeedbackItem: React.FC<FeedbackItemProps> = ({
    feedback,
    onStatusChange,
    onReply,
    onDelete,
    onSelectNode
}) => {
    const [showMenu, setShowMenu] = useState(false);

    const isResolved = feedback.status === "resolved";

    const nodeLabel = feedback.nodeLabel ?? feedback.nodeId;

    const handleCardClick = () => {
        if (!onSelectNode) {
            return;
        }

        onSelectNode(feedback.nodeId);
    };

    const handleStatusClick = (
        event: React.MouseEvent<HTMLButtonElement>
    ) => {
        event.stopPropagation();

        if (!onStatusChange) {
            return;
        }

        onStatusChange(
            feedback.id,
            isResolved ? "open" : "resolved"
        );
    };

    const handleReplyClick = (
        event: React.MouseEvent<HTMLButtonElement>
    ) => {
        event.stopPropagation();
        onReply?.(feedback.id);
    };

    const handleDelete = (
        event: React.MouseEvent<HTMLButtonElement>
    ) => {
        event.stopPropagation();
        onDelete?.(feedback.id);
        setShowMenu(false);
    };

    return (
        <article
            className={`feedback-item ${
                isResolved
                    ? "feedback-item-resolved"
                    : ""
            }`}
            onClick={handleCardClick}
            title={
                onSelectNode
                    ? "Click to locate this node"
                    : undefined
            }
        >
            <div
                className="feedback-node-tag"
                title={`On ${nodeLabel}`}
            >
                <span
                    className="feedback-node-tag-dot"
                    aria-hidden="true"
                />

                {nodeLabel}
            </div>

            <header className="feedback-item-header">
                <div className="feedback-author">
                    <div
                        className="feedback-avatar"
                        aria-hidden="true"
                    >
                        {feedback.author
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                    </div>

                    <div className="feedback-author-info">
                        <strong className="feedback-author-name">
                            {feedback.author}
                        </strong>

                        <span className="feedback-time">
                            {feedback.createdAt}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    className={`feedback-status-button ${
                        isResolved
                            ? "feedback-status-resolved"
                            : "feedback-status-open"
                    }`}
                    onClick={handleStatusClick}
                    aria-label={
                        isResolved
                            ? "Mark feedback as unresolved"
                            : "Mark feedback as resolved"
                    }
                >
                    {isResolved
                        ? "Resolved"
                        : "Unresolved"}
                </button>
            </header>

            <p className="feedback-content">
                {feedback.content}
            </p>

            <footer className="feedback-item-footer">
                <button
                    type="button"
                    className="feedback-text-button"
                    onClick={handleReplyClick}
                >
                    Reply

                    {(feedback.replyCount ?? 0) >
                        0 && (
                        <span className="feedback-reply-count">
                            (
                            {
                                feedback.replyCount
                            }
                            )
                        </span>
                    )}
                </button>

                <div className="feedback-more-wrapper">
                    <button
                        type="button"
                        className="feedback-more-button"
                        aria-label="More feedback actions"
                        title="More actions"
                        onClick={(event) => {
                            event.stopPropagation();
                            setShowMenu(
                                (current) =>
                                    !current
                            );
                        }}
                    >
                        •••
                    </button>

                    {showMenu && (
                        <div className="feedback-action-menu">
                            <button
                                type="button"
                                className="feedback-delete-action"
                                onClick={handleDelete}
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </footer>
        </article>
    );
};

export default FeedbackItem;
