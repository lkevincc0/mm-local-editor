import React, {useState} from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import {BsFiletypePng, BsFiletypeSvg} from "react-icons/bs";

import ErrorModal, {ErrorModalProps} from "./ErrorModal";
import {useFeedbackContext} from "./context/FeedbackContext";
import {useFileContext} from "./context/FileProvider";
import {useGraph} from "./context/GraphContext";
import {useProjectContext} from "./context/ProjectContext";
import {
    EmbeddedProjectData,
    exportGraphAsPNG,
    exportGraphAsSVG,
    getExportReadiness
} from "./utils/exportGraphImage";

import styles from "./ShareModal.module.css";

type ShareExportSectionProps = {
    showGraphSection: boolean;
};

const ShareExportSection: React.FC<ShareExportSectionProps> = ({
    showGraphSection
}) => {
    const {graph} = useGraph();
    const {cluster, tabData, treeData} = useFileContext();
    const {currentProject} = useProjectContext();
    const {feedbacks, overallFeedback} = useFeedbackContext();

    const [includeFeedback, setIncludeFeedback] = useState(true);
    const [errorModal, setErrorModal] = useState<ErrorModalProps>({
        show: false,
        title: "",
        message: "",
        onHide: () => setErrorModal((prev) => ({...prev, show: false}))
    });

    const {ready, message} = getExportReadiness(showGraphSection, cluster);

    const showReadinessError = () => {
        setErrorModal({
            show: true,
            title: "Cannot Export Model",
            message,
            onHide: () => setErrorModal((prev) => ({...prev, show: false}))
        });
    };

    const buildProjectData = (): EmbeddedProjectData => ({
        name: currentProject?.name,
        feedbacks,
        overallFeedback,
        tabData,
        treeData: treeData || []
    });

    const handleExportPng = () => {
        if (!ready || !graph) {
            showReadinessError();
            return;
        }

        exportGraphAsPNG(graph, {
            projectData: buildProjectData(),
            includeOverallFeedback: includeFeedback
        });
    };

    const handleExportSvg = () => {
        if (!ready || !graph) {
            showReadinessError();
            return;
        }

        exportGraphAsSVG(graph, buildProjectData());
    };

    const tooltip = <Tooltip id="export-tooltip">{message}</Tooltip>;

    return (
        <div className={styles.exportSection}>
            <div className={styles.exportHeader}>
                <div>
                    <div className={styles.exportTitle}>
                        Export
                    </div>
                    <div className={styles.exportDescription}>
                        Download the rendered model as an image
                    </div>
                </div>
            </div>

            <label
                className={
                    overallFeedback?.content.trim()
                        ? styles.feedbackToggle
                        : `${styles.feedbackToggle} ${styles.feedbackToggleDisabled}`
                }
            >
                <input
                    type="checkbox"
                    checked={includeFeedback && Boolean(overallFeedback?.content.trim())}
                    disabled={!overallFeedback?.content.trim()}
                    onChange={(event) =>
                        setIncludeFeedback(event.target.checked)
                    }
                />
                <span className={styles.toggleTrack} aria-hidden="true">
                    <span className={styles.toggleThumb}/>
                </span>
                <span className={styles.toggleLabel}>
                    Include overall feedback in PNG
                    {!overallFeedback?.content.trim() && (
                        <span className={styles.toggleHint}>
                            Add it in the Feedback panel first
                        </span>
                    )}
                </span>
            </label>

            <div className={styles.exportButtons}>
                <OverlayTrigger
                    placement="top"
                    overlay={tooltip}
                    trigger={ready ? [] : ["hover", "focus"]}
                >
                    <span className={styles.exportButtonWrap}>
                        <button
                            type="button"
                            className={styles.exportButton}
                            onClick={handleExportPng}
                            disabled={!ready}
                        >
                            <BsFiletypePng/>
                            PNG
                        </button>
                    </span>
                </OverlayTrigger>

                <OverlayTrigger
                    placement="top"
                    overlay={tooltip}
                    trigger={ready ? [] : ["hover", "focus"]}
                >
                    <span className={styles.exportButtonWrap}>
                        <button
                            type="button"
                            className={styles.exportButton}
                            onClick={handleExportSvg}
                            disabled={!ready}
                        >
                            <BsFiletypeSvg/>
                            SVG
                        </button>
                    </span>
                </OverlayTrigger>
            </div>

            <ErrorModal {...errorModal} />
        </div>
    );
};

export default ShareExportSection;
