import {useState} from "react";
import {Graph} from "@maxgraph/core";
import {Canvg} from 'canvg';
import * as d3 from 'd3';
import Dropdown from "react-bootstrap/Dropdown";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import ErrorModal, {ErrorModalProps} from "../ErrorModal";
import {useFileContext} from "../context/FileProvider";
import {useProjectContext} from "../context/ProjectContext";
import {useFeedbackContext} from "../context/FeedbackContext";
import {useGraph} from "../context/GraphContext";
import {returnFocusToGraph} from "../utils/GraphUtils";
import DropdownButton from "react-bootstrap/DropdownButton";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import {embedJsonInPng, embedJsonInSvg} from "../utils/imageMetadata";
import {
    calculateFeedbackPanelLayout,
    calculatePngExportDimensions,
    createSvgToCanvasPointConverter,
    drawFeedbackNodeBadges,
    drawFeedbackPanel,
    getFeedbackNodeBadges,
    groupFeedbackByNode,
    PNG_FEEDBACK_PANEL_GAP
} from "./pngFeedbackAnnotations";

const PNG_EXPORT_SCALE = 3;

// Add showGraphSection prop to control Export button enablement
// This ensures Export is only available when user is in "Render Model" interface
const ExportFileButton = ({showGraphSection}: { showGraphSection: boolean }) => {
    const {graph} = useGraph(); // Use the context to get the graph instance
    const {cluster, tabData, treeData} = useFileContext(); // Get goals and cluster from file context
    const {currentProject} = useProjectContext(); // Get the project name for the embedded metadata
    const {feedbacks} = useFeedbackContext(); // Get the feedback for the embedded metadata
    const [errorModal, setErrorModal] = useState<ErrorModalProps>({
        show: false,
        title: "",
        message: "",
        onHide: () => setErrorModal(prev => ({...prev, show: false}))
    });

    // Simplified logic: Export is only available when showGraphSection is true
    // This means user must be in "Render Model" interface (after clicking "Arrange Hierarchy / Render Model")
    const isModelReadyForExport = (): boolean => {
        // Only enable export when user is in Render Model interface
        // AND there are functional goals in the cluster
        return showGraphSection && cluster.ClusterGoals.some((goal) => goal.GoalType === "Functional");
    };

    // Function to get tooltip message based on current state
    const getTooltipMessage = (): string => {
        if (!showGraphSection) {
            return "Please click 'Arrange Hierarchy / Render Model' to enable export.";
        }
        if (cluster.ClusterGoals.length === 0) {
            return "Please add goals to the hierarchy before exporting.";
        }
        if (!cluster.ClusterGoals.some((goal) => goal.GoalType === "Functional")) {
            return "Please add at least one functional goal (Do type) to the hierarchy before exporting.";
        }
        return "Export is ready.";
    };

    const findSVGElementInGraph = (graph: Graph) => {
        // Check if the model is ready before proceeding
        if (!isModelReadyForExport()) {
            setErrorModal({
                show: true,
                title: "Cannot Export Model",
                message: getTooltipMessage(),
                onHide: () => setErrorModal(prev => ({...prev, show: false}))
            });
            return null;
        }

        if (!graph) {
            return null;
        }

        // Clear all selection for no green bounding box
        graph.clearSelection();
        // Get the html holding the SVG
        const svgElement = graph.getContainer().querySelector('svg');

        if (!svgElement) {
            console.error('Failed to find SVG element in the graph container.');
            return null;
        }
        return svgElement;
    };

    // Function to export graph as an image
    const exportGraphAsSVG = async (graph: Graph) => {
        const svgElement = (graph) && findSVGElementInGraph(graph);
        if (!svgElement) {
            return;
        }

        // Serialize the SVG element to a string
        const serializer = new XMLSerializer();
        const rawSvgString = serializer.serializeToString(svgElement);

        const projectData = {name: currentProject?.name, feedbacks, tabData, treeData: treeData || []};
        const svgString = embedJsonInSvg(rawSvgString, projectData);
        try {
            // If chromium browser
            if ('showSaveFilePicker' in self) {
                const options: SaveFilePickerOptions = {
                    id: 'exportImage',
                    suggestedName: 'Graph.svg',
                    startIn: 'downloads',
                    types: [{
                        description: 'SVG Image',
                        accept: {'image/svg+xml': ['.svg']}
                    }]
                };
                const handle = await self.showSaveFilePicker(options);
                const writable = await handle.createWritable();
                await writable.write(new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'}));
                await writable.close();
            }
            // Fallback for non chromium browsers
            else {
                // Create a Blob and trigger download
                const blob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
                const url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = 'graph.svg';
                link.click();

                // Clean up
                URL.revokeObjectURL(url);
            }
        }

        catch (error) {
            console.error('Failed to save file: ', error);
        }
        // Return focus to graph container to enable keyboard shortcuts
        returnFocusToGraph();
    };

    // Function to export graph as PNG
    const exportGraphAsPNG = async (graph: Graph) => {
        const svgElement = (graph) && findSVGElementInGraph(graph);
        if (!svgElement) {
            return;
        }

        // Export a copy so the visible canvas is never mutated.
        const svgCopy = svgElement.cloneNode(true) as SVGSVGElement;
        const svg = d3.select(svgCopy);
        svg.insert("rect", ":first-child")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("fill", "white");

        // Serialize the SVG element to a string
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgCopy);
        const graphWidth = svgElement.clientWidth;
        const graphHeight = svgElement.clientHeight;

        // Create a canvas element
        const canvas = document.createElement('canvas');
        // Render at a higher pixel density for a sharper PNG export
        canvas.width = Math.round(svgElement.clientWidth * PNG_EXPORT_SCALE);
        canvas.height = Math.round(svgElement.clientHeight * PNG_EXPORT_SCALE);

        const context = canvas.getContext('2d');
        if (!context) {
            console.error('Failed to get canvas context.');
            return;
        }
        context.scale(PNG_EXPORT_SCALE, PNG_EXPORT_SCALE);

        // Use Canvg to render SVG onto the canvas
        const v = Canvg.fromString(context, svgString, {
            ignoreDimensions: true
        });

        // Render SVG onto the canvas
        await v.render();

        let exportCanvas = canvas;

        if (feedbacks.length > 0) {
            const graphModel = graph.getDataModel();
            const groups = groupFeedbackByNode(feedbacks, (nodeId) => {
                const cell = graphModel.getCell(nodeId);

                if (!cell) {
                    return undefined;
                }

                const value = cell.getValue();

                if (typeof value === "string" && value.trim()) {
                    return value;
                }

                return graph.getLabel(cell);
            });
            const panelLayout = calculateFeedbackPanelLayout(context, groups);
            const dimensions = calculatePngExportDimensions(
                graphWidth,
                graphHeight,
                panelLayout
            );
            const finalCanvas = document.createElement("canvas");
            finalCanvas.width = Math.round(dimensions.width * PNG_EXPORT_SCALE);
            finalCanvas.height = Math.round(dimensions.height * PNG_EXPORT_SCALE);

            const finalContext = finalCanvas.getContext("2d");

            if (!finalContext) {
                console.error("Failed to get final canvas context.");
                return;
            }

            finalContext.scale(PNG_EXPORT_SCALE, PNG_EXPORT_SCALE);
            finalContext.fillStyle = "white";
            finalContext.fillRect(0, 0, dimensions.width, dimensions.height);
            finalContext.drawImage(
                canvas,
                0,
                0,
                canvas.width,
                canvas.height,
                0,
                0,
                graphWidth,
                graphHeight
            );

            const drawPane = graph.getView().getDrawPane();
            const coordinateElement = drawPane instanceof SVGGraphicsElement
                ? drawPane
                : svgElement;
            const convertPoint = createSvgToCanvasPointConverter(
                svgElement,
                graphWidth,
                graphHeight,
                coordinateElement
            );
            const badges = getFeedbackNodeBadges(
                groups,
                (nodeId) => {
                    const cell = graphModel.getCell(nodeId);
                    const state = cell ? graph.getView().getState(cell) : null;

                    if (!state) {
                        return undefined;
                    }

                    return {
                        x: state.x,
                        y: state.y,
                        width: state.width,
                        height: state.height
                    };
                },
                convertPoint
            );

            drawFeedbackNodeBadges(finalContext, badges);
            drawFeedbackPanel(
                finalContext,
                panelLayout,
                graphWidth + PNG_FEEDBACK_PANEL_GAP,
                dimensions.height
            );
            exportCanvas = finalCanvas;
        }

        // Convert the canvas content to a Blob (PNG format)
        exportCanvas.toBlob(async (blob) => {
            if (blob) {
                try {
                    const projectData = {
                        name: currentProject?.name,
                        feedbacks,
                        tabData,
                        treeData: treeData || []
                    };
                    const finalBlob = await embedJsonInPng(blob, projectData);

                    if ('showSaveFilePicker' in self) {
                        const options: SaveFilePickerOptions = {
                            id: 'exportImage',
                            suggestedName: 'Graph.png',
                            startIn: 'downloads',
                            types: [{
                                description: 'PNG Image',
                                accept: {'image/png': ['.png']}
                            }]
                        };
                        const handle = await self.showSaveFilePicker(options);
                        const writable = await handle.createWritable();
                        await writable.write(finalBlob);
                        await writable.close();
                    } else {
                        // Fallback for non-Chromium browsers
                        const url = URL.createObjectURL(finalBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = 'graph.png';
                        link.click();
                        URL.revokeObjectURL(url);
                    }
                } catch (error) {
                    console.error('Failed to save file: ', error);
                }
            }
        }, 'image/png');

        // Return focus to graph container to enable keyboard shortcuts
        returnFocusToGraph();
    };

    // Check if the model is ready for export
    const isReady = isModelReadyForExport();
    const tooltipMessage = getTooltipMessage();

    // Create tooltip overlay for disabled state
    const tooltip = (
        <Tooltip id="export-tooltip">
            {tooltipMessage}
        </Tooltip>
    );

    return (
        <>
            <OverlayTrigger placement="bottom"
                            overlay={tooltip}
                            trigger={(!isReady) ? ['hover', 'focus'] : []}>
                <DropdownButton as={ButtonGroup}
                                title="Export"
                                variant="outline-primary"
                                disabled={!isReady}>
                    <Dropdown.Item onClick={() => exportGraphAsPNG(graph!)}
                                   disabled={!graph}>
                        Export as PNG
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => exportGraphAsSVG(graph!)}
                                   disabled={!graph}>
                        Export as SVG
                    </Dropdown.Item>
                </DropdownButton>
            </OverlayTrigger>
            <ErrorModal {...errorModal} />
        </>
    );
};

export default ExportFileButton;
