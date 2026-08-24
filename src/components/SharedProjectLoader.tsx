import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";

import ErrorModal, {ErrorModalProps} from "./ErrorModal";
import {useFileContext} from "./context/FileProvider";
import {useProjectContext} from "./context/ProjectContext";
import {createInitialState, reset} from "./context/treeDataSlice";
import {uniqueProjectName} from "./utils/projects";
import {decodeSharedProjectHash} from "./utils/shareProject";

const clearShareHash = () => {
    window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`
    );
};

const SharedProjectLoader: React.FC = () => {
    const navigate = useNavigate();
    const {dispatch} = useFileContext();
    const {projects, createProject, openProject} = useProjectContext();
    const [errorModal, setErrorModal] = useState<ErrorModalProps>({
        show: false,
        title: "",
        message: "",
        onHide: () => setErrorModal((current) => ({...current, show: false})),
    });

    useEffect(() => {
        const importSharedProject = () => {
            if (!window.location.hash.startsWith("#share=")) {
                return;
            }

            try {
                const sharedProject = decodeSharedProjectHash(window.location.hash);
                if (!sharedProject) {
                    return;
                }

                // Run the same state construction used by reset() before writing
                // anything to local storage. This catches invalid goal references.
                createInitialState(sharedProject.tabData, sharedProject.treeData);

                const existingProject = projects.find(
                    (project) => project.sourceShareId === sharedProject.shareId
                );
                const project = existingProject ?? createProject(
                    uniqueProjectName(
                        `${sharedProject.name.trim() || "Untitled"} (shared)`,
                        projects.map((candidate) => candidate.name)
                    ),
                    {
                        treeData: sharedProject.treeData,
                        tabData: sharedProject.tabData,
                        feedbacks: sharedProject.feedbacks,
                        sourceShareId: sharedProject.shareId,
                    }
                );

                openProject(project.id);
                dispatch(reset({
                    treeData: project.treeData,
                    tabData: project.tabData,
                }));
                clearShareHash();
                navigate("/projectEdit", {replace: true});
            } catch (error) {
                console.error("Failed to import shared project:", error);
                clearShareHash();
                setErrorModal({
                    show: true,
                    title: "Cannot Open Shared Project",
                    message: error instanceof Error
                        ? error.message
                        : "The shared project link is invalid.",
                    onHide: () =>
                        setErrorModal((current) => ({...current, show: false})),
                });
            }
        };

        importSharedProject();
        window.addEventListener("hashchange", importSharedProject);

        return () => {
            window.removeEventListener("hashchange", importSharedProject);
        };
    }, [createProject, dispatch, navigate, openProject, projects]);

    return <ErrorModal {...errorModal}/>;
};

export default SharedProjectLoader;
