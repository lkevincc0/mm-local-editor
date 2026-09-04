import {useNavigate} from "react-router-dom";
import {useProjectContext} from "../context/ProjectContext";
import {JSONData, useFileContext} from "../context/FileProvider";
import {reset} from "../context/treeDataSlice";
import {Project, convertTabContentToInitialTab, defaultProjectName, uniqueProjectName} from "./projects";
import {extractJsonFromPng, extractJsonFromSvg} from "./imageMetadata";

type ShowError = (title: string, message: string) => void;

// Strip the last extension from a filename: "Model.v2.json" -> "Model.v2".
const fileNameWithoutExtension = (name: string): string => {
    const idx = name.lastIndexOf(".");
    return idx > 0 ? name.slice(0, idx) : name;
};

// Shared "start modelling" actions used by the welcome page and the projects home.
export const useProjectLauncher = (showError: ShowError) => {
    const {projects, createProject, openProject} = useProjectContext();
    const {dispatch} = useFileContext();
    const navigate = useNavigate();

    const openEditor = (project: Project) => {
        openProject(project.id);
        dispatch(reset({treeData: project.treeData, tabData: project.tabData}));
        navigate("/projectEdit");
    };

    const launchNewProject = () => {
        openEditor(createProject());
    };

    const loadProjectFromJsonData = (jsonData: JSONData, fallbackName?: string) => {
        const tabData = convertTabContentToInitialTab(jsonData.tabData, jsonData.treeData);
        const existingNames = projects.map((project) => project.name);
        const baseName = jsonData.name?.trim() || fallbackName?.trim();

        // Prefer the name embedded in the file, then the filename, then "Untitled".
        const name = baseName
            ? uniqueProjectName(baseName, existingNames)
            : defaultProjectName(existingNames);

        // Restore feedback into the store the FeedbackProvider reads on mount.
        openEditor(createProject(name, {
            treeData: jsonData.treeData,
            tabData,
            feedbacks: jsonData.feedbacks ?? [],
            overallFeedback: jsonData.overallFeedback,
        }));
    };

    const importProjectFile = async (file: File) => {
        try {
            const isJson = file.type === "application/json" || file.name.endsWith(".json");
            const isPng = file.type === "image/png" || file.name.endsWith(".png");
            const isSvg = file.type === "image/svg+xml" || file.name.endsWith(".svg");

            if (!isJson && !isPng && !isSvg) {
                showError("Incorrect File Type", "Please select a JSON, PNG, or SVG file.");
                return;
            }

            let jsonData: JSONData | null = null;

            if (isJson) {
                const fileContent = await file.text();
                jsonData = JSON.parse(fileContent);
            } else if (isPng) {
                jsonData = await extractJsonFromPng(file) as JSONData | null;
            } else if (isSvg) {
                jsonData = await extractJsonFromSvg(file) as JSONData | null;
            }

            if (!jsonData) {
                showError(
                    "No Project Data Found",
                    "This image doesn't contain embedded project data. Please export it from this editor first, or import a JSON file instead."
                );
                return;
            }

            loadProjectFromJsonData(jsonData, fileNameWithoutExtension(file.name));
        } catch (error) {
            console.error("Error importing file:", error);
            showError("File Upload Failed", "Failed to process the selected file. Please try again.");
        }
    };

    return {openEditor, launchNewProject, importProjectFile};
};
