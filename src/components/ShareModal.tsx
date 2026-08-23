import React, {useEffect, useState} from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import {QRCodeSVG} from "qrcode.react";

import type {Project} from "./utils/projects";
import {
    createProjectShareUrl,
    getShareUrlByteLength,
    MAX_QR_URL_BYTES,
} from "./utils/shareProject";

type ShareModalProps = {
    show: boolean;
    projects: Project[];
    onHide: () => void;
};

type CopyStatus = "idle" | "copied" | "error";

const ShareModal: React.FC<ShareModalProps> = ({
    show,
    projects,
    onHide,
}) => {
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [shareUrl, setShareUrl] = useState("");
    const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
    const [generationError, setGenerationError] = useState("");

    useEffect(() => {
        if (show) {
            setShareUrl("");
            setCopyStatus("idle");
            setGenerationError("");
        }
    }, [show]);

    useEffect(() => {
        if (!show) {
            return;
        }

        setSelectedProjectId((currentId) => {
            const projectStillExists = projects.some(
                (project) => project.id === currentId
            );

            return projectStillExists
                ? currentId
                : projects[0]?.id ?? "";
        });
    }, [show, projects]);

    const handleGenerate = () => {
        const selectedProject = projects.find(
            (project) => project.id === selectedProjectId
        );

        if (!selectedProject) {
            return;
        }

        const nextShareUrl = createProjectShareUrl(selectedProject);
        if (getShareUrlByteLength(nextShareUrl) > MAX_QR_URL_BYTES) {
            setGenerationError(
                "This project is too large for a frontend-only QR code. " +
                "Try sharing a smaller model."
            );
            return;
        }

        setShareUrl(nextShareUrl);
        setCopyStatus("idle");
        setGenerationError("");
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopyStatus("copied");
        } catch {
            setCopyStatus("error");
        }
    };

    const selectedProject = projects.find(
        (project) => project.id === selectedProjectId
    );

    const isLocalhost = ["localhost", "127.0.0.1"].includes(
        window.location.hostname
    );

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Share project</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {shareUrl ? (
                    <div className="text-center">
                        <div className="d-inline-flex rounded border bg-white p-3">
                            <QRCodeSVG
                                value={shareUrl}
                                size={240}
                                level="L"
                                marginSize={4}
                                title={`Share ${selectedProject?.name ?? "project"}`}
                            />
                        </div>

                        <p className="mt-3 mb-3 text-secondary">
                            Scan this QR code or copy the link below.
                        </p>

                        <Form.Control
                            type="text"
                            value={shareUrl}
                            readOnly
                            aria-label="Share link"
                        />

                        {isLocalhost && (
                            <p className="mt-3 mb-0 small text-warning-emphasis">
                                This link uses localhost, so another device cannot open it yet.
                            </p>
                        )}

                        {copyStatus === "copied" && (
                            <p className="mt-2 mb-0 small text-success">
                                Link copied.
                            </p>
                        )}

                        {copyStatus === "error" && (
                            <p className="mt-2 mb-0 small text-danger">
                                Could not copy automatically. Select the link and copy it manually.
                            </p>
                        )}
                    </div>
                ) : (
                    <Form.Group>
                        <Form.Label>Project</Form.Label>
                        <Form.Select
                            value={selectedProjectId}
                            onChange={(event) => {
                                setSelectedProjectId(event.target.value);
                                setGenerationError("");
                            }}
                        >
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </Form.Select>

                        {generationError && (
                            <p className="mt-3 mb-0 small text-danger">
                                {generationError}
                            </p>
                        )}
                    </Form.Group>
                )}
            </Modal.Body>

            <Modal.Footer>
                {shareUrl ? (
                    <>
                        <Button
                            variant="outline-secondary"
                            onClick={() => setShareUrl("")}
                        >
                            Back
                        </Button>
                        <Button variant="dark" onClick={handleCopy}>
                            Copy link
                        </Button>
                    </>
                ) : (
                    <>
                        <Button variant="outline-secondary" onClick={onHide}>
                            Cancel
                        </Button>
                        <Button
                            variant="dark"
                            onClick={handleGenerate}
                            disabled={!selectedProjectId}
                        >
                            Generate QR code
                        </Button>
                    </>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default ShareModal;
