import React, {useState} from "react";
import Dropdown from "react-bootstrap/Dropdown";
import {BsThreeDots} from "react-icons/bs";
import ConfirmModal from "./ConfirmModal";
import ShareModal from "./ShareModal";
import {Project, cardAccentColor, countGoals, formatRelativeTime} from "./utils/projects";
import styles from "./Home.module.css";

type ProjectCardProps = {
    project: Project;
    index: number;
    onOpen: () => void;
    onRename: (name: string) => void;
    onDelete: () => void;
};

const ProjectCard: React.FC<ProjectCardProps> = ({project, index, onOpen, onRename, onDelete}) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(project.name);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    const startRename = () => {
        setTimeout(() => {
            setDraft(project.name);
            setEditing(true);
        }, 0);
    };

    const commitRename = () => {
        const name = draft.trim();
        if (name) {
            onRename(name);
        }
        setEditing(false);
    };

    const accent = cardAccentColor(index);

    return (
        <div className={styles.card} data-cy="project-card">
            <Dropdown className={styles.cardMenu} align="end">
                <Dropdown.Toggle
                    variant="link"
                    className={styles.cardMenuToggle}
                    aria-label={`Options for ${project.name}`}
                >
                    <BsThreeDots/>
                </Dropdown.Toggle>
                <Dropdown.Menu>
                    <Dropdown.Item onClick={startRename}>Rename</Dropdown.Item>
                    <Dropdown.Item onClick={() => setShowShareModal(true)}>Share</Dropdown.Item>
                    <Dropdown.Item onClick={() => setConfirmDelete(true)} className="text-danger">
                        Delete
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>

            <button
                type="button"
                className={styles.thumb}
                style={{background: `linear-gradient(135deg, ${accent} 0%, ${accent}B3 100%)`}}
                onClick={onOpen}
            >
                {project.name.charAt(0).toUpperCase()}
            </button>

            <div className={styles.cardBody}>
                {editing ? (
                    <input
                        autoFocus
                        className={styles.nameInput}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                commitRename();
                            } else if (e.key === "Escape") {
                                setEditing(false);
                            }
                        }}
                    />
                ) : (
                    <div className={styles.name} onClick={onOpen} data-cy="project-name">
                        {project.name}
                    </div>
                )}
                <div className={styles.meta}>
                    {countGoals(project.treeData)} goals · Edited {formatRelativeTime(project.updatedAt)}
                </div>
            </div>

            <ConfirmModal
                show={confirmDelete}
                title="Delete project"
                message={`Delete "${project.name}"? This cannot be undone.`}
                confirmLabel="Delete project"
                destructive
                onHide={() => setConfirmDelete(false)}
                onConfirm={() => {
                    setConfirmDelete(false);
                    onDelete();
                }}
            />

            <ShareModal
                show={showShareModal}
                project={project}
                showGraphSection={false}
                // The projects list never has an editor (and its
                // GraphProvider/FeedbackProvider) mounted, so this project's
                // graph can never be exported from here even if it happens to
                // be the last-opened one.
                isOpenProject={false}
                onRenameProject={onRename}
                onHide={() => setShowShareModal(false)}
            />
        </div>
    );
};

export default ProjectCard;
