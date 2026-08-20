import React, {useState} from "react";

import Avatar from "./Avatar";
import {useProfileContext} from "./context/ProfileContext";
import {AVATAR_COUNT} from "./utils/avatarSprite";

import "./Profile.css";

const Profile: React.FC = () => {
    const {
        authorName,
        authorAvatar,
        updateProfile
    } = useProfileContext();

    const [showModal, setShowModal] = useState(false);
    const [nameInput, setNameInput] = useState(authorName);
    const [avatarInput, setAvatarInput] = useState(
        authorAvatar
    );

    const openModal = () => {
        setNameInput(authorName);
        setAvatarInput(authorAvatar);
        setShowModal(true);
    };

    const handleCancel = () => {
        setShowModal(false);
    };

    const handleSave = () => {
        updateProfile(
            nameInput.trim(),
            avatarInput
        );
        setShowModal(false);
    };

    return (
        <>
            <button
                type="button"
                className="profile-trigger"
                onClick={openModal}
                aria-label="Edit profile"
            >
                {authorAvatar ? (
                    <Avatar
                        avatar={authorAvatar}
                        size={34}
                        className="avatar"
                    />
                ) : (
                    <span className="avatar avatar-default">
                        {(
                            authorName ||
                            "?"
                        )
                            .trim()
                            .charAt(0)
                            .toUpperCase() || "?"}
                    </span>
                )}

                <span className="profile-name">
                    {authorName.trim() || "Set name"}
                </span>
            </button>

            {showModal && (
                <div
                    className="profile-modal-overlay"
                    onClick={handleCancel}
                >
                    <div
                        className="profile-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="profile-modal-title"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <header className="profile-modal-header">
                            <div>
                                <span className="profile-modal-eyebrow">
                                    Your profile
                                </span>

                                <h3
                                    id="profile-modal-title"
                                    className="profile-modal-title"
                                >
                                    Edit profile
                                </h3>
                            </div>

                            <button
                                type="button"
                                className="profile-modal-close"
                                onClick={handleCancel}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </header>

                        <label className="profile-field">
                            <span className="profile-field-label">
                                Name
                            </span>

                            <input
                                className="profile-name-input"
                                value={nameInput}
                                onChange={(event) =>
                                    setNameInput(
                                        event.target.value
                                    )
                                }
                                placeholder="Your name"
                                autoFocus
                            />
                        </label>

                        <span className="profile-field-label">
                            Avatar
                        </span>

                        <div className="avatar-grid">
                            {Array.from(
                                {length: AVATAR_COUNT},
                                (_, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className={`avatar-cell ${
                                            avatarInput ===
                                            String(index + 1)
                                                ? "selected"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setAvatarInput(
                                                String(index + 1)
                                            )
                                        }
                                        aria-label={`Avatar ${
                                            index + 1
                                        }`}
                                    >
                                        <Avatar
                                            avatar={String(index + 1)}
                                            size={64}
                                        />
                                    </button>
                                )
                            )}
                        </div>

                        <footer className="profile-modal-actions">
                            <button
                                type="button"
                                className="profile-cancel"
                                onClick={handleCancel}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="profile-save"
                                onClick={handleSave}
                                disabled={!nameInput.trim()}
                            >
                                Save
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </>
    );
};

export default Profile;
