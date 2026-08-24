import React, {useState} from "react";

import Avatar from "./Avatar";
import {useProfileContext} from "./context/ProfileContext";

import "./Profile.css";

const Profile: React.FC = () => {
    const {
        authorName,
        updateProfile
    } = useProfileContext();

    const [showModal, setShowModal] = useState(false);
    const [nameInput, setNameInput] = useState(authorName);

    const openModal = () => {
        setNameInput(authorName);
        setShowModal(true);
    };

    const handleCancel = () => {
        setShowModal(false);
    };

    const handleSave = () => {
        updateProfile(nameInput.trim());
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
                <Avatar
                    seed={authorName}
                    size={34}
                    className="avatar"
                />

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

                        <div className="profile-preview">
                            <Avatar
                                seed={nameInput}
                                size={72}
                                className="profile-preview-avatar"
                            />
                        </div>

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
