import React, {useEffect, useMemo, useState} from "react";
import Modal from "react-bootstrap/Modal";
import {BsCheck, BsPeople, BsQrCode, BsX} from "react-icons/bs";
import {QRCodeSVG} from "qrcode.react";

import type {Project} from "./utils/projects";
import ShareExportSection from "./ShareExportSection";
import {
    createProjectShareUrl,
    getShareUrlByteLength,
    MAX_QR_URL_BYTES,
} from "./utils/shareProject";
import styles from "./ShareModal.module.css";

type ShareModalProps = {
    show: boolean;
    project: Project;
    showGraphSection: boolean;
    onRenameProject?: (name: string) => void;
    onHide: () => void;
};

type CopyStatus = "idle" | "copied" | "error";

const ShareModal: React.FC<ShareModalProps> = ({show, project, showGraphSection, onRenameProject, onHide}) => {
    const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

    const shareUrl = useMemo(() => createProjectShareUrl(project), [project]);
    const tooLarge = getShareUrlByteLength(shareUrl) > MAX_QR_URL_BYTES;

    useEffect(() => {
        if (show) {
            setCopyStatus("idle");
        }
    }, [show]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopyStatus("copied");
        } catch {
            setCopyStatus("error");
        }
    };

    const isLocalhost = ["localhost", "127.0.0.1"].includes(
        window.location.hostname
    );

    return (
        <Modal
            show={show}
            onHide={onHide}
            centered
            dialogClassName={styles.dialog}
            contentClassName={styles.content}
            backdropClassName={styles.backdrop}
        >
            <Modal.Header className={styles.header}>
                <div className={styles.titleGroup}>
                    <span className={styles.icon}><BsPeople/></span>
                    <div className={styles.titleWrap}>
                        <Modal.Title className={styles.title}>Share</Modal.Title>
                        <div className={styles.subtitle}>
                            Anyone with the link can open this project
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    className={styles.closeButton}
                    onClick={onHide}
                    aria-label="Close"
                >
                    <BsX/>
                </button>
            </Modal.Header>

            <Modal.Body className={styles.body}>
                <div className={styles.titleSection}>
                    <label
                        htmlFor="share-project-title"
                        className={styles.titleLabel}
                    >
                        Project title
                    </label>
                    <input
                        id="share-project-title"
                        className={styles.titleInput}
                        value={project.name}
                        maxLength={200}
                        onChange={(event) => {
                            onRenameProject?.(event.target.value);
                        }}
                        onBlur={(event) => {
                            const name = event.target.value.trim();
                            onRenameProject?.(name || "Untitled");
                        }}
                        aria-label="Project title"
                    />
                </div>

                {tooLarge ? (
                    <p className={styles.error}>
                        This project is too large for a frontend-only link.
                        Try sharing a smaller model.
                    </p>
                ) : (
                    <>
                        <div className={styles.linkRow}>
                            <input
                                className={styles.linkInput}
                                value={shareUrl}
                                readOnly
                                aria-label="Share link"
                                onFocus={(event) => event.currentTarget.select()}
                            />
                            <button
                                type="button"
                                className={`${styles.copyButton} ${copyStatus === "copied" ? styles.copyButtonCopied : ""}`}
                                onClick={handleCopy}
                            >
                                {copyStatus === "copied" ? <BsCheck/> : null}
                                {copyStatus === "copied" ? "Copied" : "Copy link"}
                            </button>
                        </div>

                        {copyStatus === "error" && (
                            <p className={styles.errorSmall}>
                                Could not copy automatically. Select the link and copy it manually.
                            </p>
                        )}

                        <div className={styles.qrSection}>
                            <span className={styles.qrLabel}>
                                <BsQrCode/> Scan with your camera
                            </span>
                            <div className={styles.qrBox}>
                                <QRCodeSVG
                                    value={shareUrl}
                                    size={168}
                                    level="L"
                                    marginSize={2}
                                    data-testid="share-qr"
                                />
                            </div>
                        </div>

                        {isLocalhost && (
                            <p className={styles.warning}>
                                This link uses localhost, so another device cannot open it yet.
                            </p>
                        )}
                    </>
                )}
            </Modal.Body>

            <Modal.Footer className={styles.footer}>
                <ShareExportSection showGraphSection={showGraphSection}/>
            </Modal.Footer>
        </Modal>
    );
};

export default ShareModal;
