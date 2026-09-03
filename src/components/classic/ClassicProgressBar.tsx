import React from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import {BsChatSquareText, BsInfoCircleFill} from "react-icons/bs";

import {ClusterUsageInfo} from "../UsageInfo/ClusterUsageInfo";
import {GraphUsageInfo} from "../UsageInfo/GraphUsageInfo";

import "./ClassicProgressBar.css";

export type ClassicStep = "goals" | "model";

interface ClassicProgressBarProps {
    activeStep: ClassicStep;
    onStepChange: (step: ClassicStep) => void;
    showFeedbackSection: boolean;
    onToggleFeedback: () => void;
}

// Help icon that opens a popover with usage instructions, like the original
// per-step info icons. Stops propagation so clicking it does not switch steps.
const StepHelp = ({title, content}: {title: string; content: React.ReactNode}) => (
    <OverlayTrigger
        trigger="click"
        placement="left"
        rootClose
        overlay={
            <Popover>
                <Popover.Body>{content}</Popover.Body>
            </Popover>
        }
    >
        {/* OverlayTrigger needs to attach a ref to its child;
            react-icons components do not forward refs. */}
        <span
            className="classic-step-help"
            title={title}
            onClick={(event) => event.stopPropagation()}
        >
            <BsInfoCircleFill className="ms-1" />
        </span>
    </OverlayTrigger>
);

// Classic arrow-steps breadcrumb ported from the original ProgressBar:
// step 1 shows the goal list and hierarchy, step 2 shows the rendered model.
const ClassicProgressBar: React.FC<ClassicProgressBarProps> = ({
    activeStep,
    onStepChange,
    showFeedbackSection,
    onToggleFeedback,
}) => {
    return (
        <div className="classic-progress-bar">
            <div
                className="arrow-steps"
                role="group"
                aria-label="Editor workflow steps"
            >
                <button
                    type="button"
                    id="clusterTab"
                    className={`step ${activeStep === "goals" ? "current" : ""}`}
                    aria-current={activeStep === "goals" ? "step" : undefined}
                    onClick={() => onStepChange("goals")}
                >
                    <span>
                        Goal List / Arrange Hierarchy
                        <StepHelp
                            title="Goal list and hierarchy help"
                            content={<ClusterUsageInfo />}
                        />
                    </span>
                </button>
                <button
                    type="button"
                    id="graphTab"
                    className={`step ${activeStep === "model" ? "current" : ""}`}
                    aria-current={activeStep === "model" ? "step" : undefined}
                    onClick={() => onStepChange("model")}
                >
                    <span>
                        Render Model
                        <StepHelp
                            title="Model canvas help"
                            content={<GraphUsageInfo />}
                        />
                    </span>
                </button>
                <button
                    type="button"
                    className={`classic-feedback-toggle ${showFeedbackSection ? "active" : ""}`}
                    aria-pressed={showFeedbackSection}
                    onClick={onToggleFeedback}
                >
                    <BsChatSquareText />
                    Feedback
                </button>
            </div>
        </div>
    );
};

export default ClassicProgressBar;
