import React, {useEffect, useState} from "react";

import ProjectEditHeader from "./header/ProjectEditHeader";
import "./ProjectEdit.css";
import SectionPanel from "./SectionPanel";
import CanvasToolbar from "./CanvasToolbar";

import {GraphProvider} from "./context/GraphContext";
import {FeedbackProvider} from "./context/FeedbackContext";

export type PanelDock = "left" | "right";

const PANEL_LAYOUT_STORAGE_KEY = "ammber/editor-panel-layout";

const readPanelDock = (
    panel: "goal" | "hierarchy",
    fallback: PanelDock
): PanelDock => {
    try {
        const saved = JSON.parse(
            localStorage.getItem(PANEL_LAYOUT_STORAGE_KEY) ?? "{}"
        ) as Record<string, unknown>;

        return saved[panel] === "left" || saved[panel] === "right"
            ? saved[panel]
            : fallback;
    } catch {
        return fallback;
    }
};

const ProjectEdit: React.FC = () => {
    const [showGoalSection, setShowGoalSection] = useState(true);
    const [showHierarchySection, setShowHierarchySection] = useState(true);
    const [showGraphSection, setShowGraphSection] = useState(true);
    const [showFeedbackSection, setShowFeedbackSection] = useState(true);

    const [goalDock, setGoalDock] = useState<PanelDock>(() =>
        readPanelDock("goal", "left")
    );

    const [hierarchyDock, setHierarchyDock] = useState<PanelDock>(() =>
        readPanelDock("hierarchy", "right")
    );

    useEffect(() => {
        localStorage.setItem(
            PANEL_LAYOUT_STORAGE_KEY,
            JSON.stringify({
                goal: goalDock,
                hierarchy: hierarchyDock
            })
        );
    }, [goalDock, hierarchyDock]);

    return (
        <GraphProvider>
            <FeedbackProvider>
                <div className="project-edit-shell">
                    <ProjectEditHeader
                        showGoalSection={showGoalSection}
                        setShowGoalSection={setShowGoalSection}
                        showGraphSection={showGraphSection}
                    />

                    <CanvasToolbar
                        showGoalSection={showGoalSection}
                        setShowGoalSection={setShowGoalSection}
                        showHierarchySection={showHierarchySection}
                        setShowHierarchySection={setShowHierarchySection}
                        showGraphSection={showGraphSection}
                        setShowGraphSection={setShowGraphSection}
                        showFeedbackSection={showFeedbackSection}
                        setShowFeedbackSection={setShowFeedbackSection}
                    />

                    <SectionPanel
                        showGoalSection={showGoalSection}
                        setShowGoalSection={setShowGoalSection}
                        goalDock={goalDock}
                        setGoalDock={setGoalDock}
                        showHierarchySection={showHierarchySection}
                        setShowHierarchySection={setShowHierarchySection}
                        hierarchyDock={hierarchyDock}
                        setHierarchyDock={setHierarchyDock}
                        showGraphSection={showGraphSection}
                        showFeedbackSection={showFeedbackSection}
                        setShowFeedbackSection={setShowFeedbackSection}
                        paddingX={20}
                    />
                </div>
            </FeedbackProvider>
        </GraphProvider>
    );
};

export default ProjectEdit;
