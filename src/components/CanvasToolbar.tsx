import React, {Dispatch} from "react";
import "./CanvasToolbar.css";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import {GraphUsageInfo} from "./UsageInfo/GraphUsageInfo";
import {ClusterUsageInfo} from "./UsageInfo/ClusterUsageInfo";
import {BsInfoCircleFill} from "react-icons/bs";

interface CanvasToolbarProps {
    showGoalSection: boolean
    setShowGoalSection: Dispatch<React.SetStateAction<boolean>>
    showHierarchySection: boolean
    setShowHierarchySection: Dispatch<React.SetStateAction<boolean>>
    showGraphSection: boolean
    setShowGraphSection: Dispatch<React.SetStateAction<boolean>>
}

// A help icon that opens a popover with usage instructions.
const HelpIcon = ({title, content}: {title: string; content: React.ReactNode}) => (
    <OverlayTrigger
        trigger="click"
        placement="bottom"
        rootClose
        overlay={
            <Popover>
                <Popover.Body>{content}</Popover.Body>
            </Popover>
        }
    >
        <span className="canvas-toolbar-help" title={title}>
            <BsInfoCircleFill />
        </span>
    </OverlayTrigger>
);

// Slim toolbar that toggles each workspace panel, like a canvas app (e.g. draw.io).
const CanvasToolbar = ({
                           showGoalSection,
                           setShowGoalSection,
                           showHierarchySection,
                           setShowHierarchySection,
                           showGraphSection,
                           setShowGraphSection,
                       }: CanvasToolbarProps) => {
    return (
        <div className="canvas-toolbar">
            <button
                type="button"
                className={`canvas-toolbar-pill ${showGoalSection ? "active" : ""}`}
                onClick={() => setShowGoalSection(!showGoalSection)}
            >
                Goal list
            </button>
            <button
                type="button"
                className={`canvas-toolbar-pill ${showGraphSection ? "active" : ""}`}
                onClick={() => setShowGraphSection(!showGraphSection)}
            >
                Canvas
            </button>
            <button
                type="button"
                className={`canvas-toolbar-pill ${showHierarchySection ? "active" : ""}`}
                onClick={() => setShowHierarchySection(!showHierarchySection)}
            >
                Hierarchy
            </button>

            <span className="canvas-toolbar-sep" />

            <HelpIcon
                title="Editor help"
                content={
                    <>
                        <ClusterUsageInfo />
                        <hr />
                        <GraphUsageInfo />
                    </>
                }
            />
        </div>
    );
};

export default CanvasToolbar;
