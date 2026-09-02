import {
    Cell,
    CellStyle,
    Client,
    DragSource,
    error,
    EventObject,
    getDefaultPlugins,
    Graph,
    InternalEvent,
    KeyHandler,
    RubberBandHandler,
    UndoManager,
} from "@maxgraph/core";
import '@maxgraph/core/css/common.css';

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import ErrorModal, {ErrorModalProps} from "../ErrorModal.tsx";
import {associateNonFunctions, isGoalNameEmpty, layoutFunctions, renderGoals, restoreSavedPositions} from './GraphHelpers';
import {recentreView} from "./recentreView";
import {registerCustomShapes} from "./GraphShapes";
import "./GraphWorker.css";
import {useFileContext} from "../context/FileProvider.tsx";
import {useGraph} from "../context/GraphContext";
import {Cluster, GlobObject, InstanceId} from "../types.ts";
import GraphSidebar from "./GraphSidebar";
import WarningMessage from "./WarningMessage";

import {VERTEX_FONT} from "../utils/GraphConstants.tsx"
import {getCellNumericIds, validateInstanceId} from "../utils/GraphUtils";
import {removeGoalIdFromTree, updateTextForInstanceId, updatePositionForInstanceId} from "../context/treeDataSlice.ts";
import ConfirmModal from "../ConfirmModal.tsx";
import {parseGoalRefId} from "../utils/GraphUtils";
import {fixEditorPosition, returnFocusToGraph} from "../utils/GraphUtils.tsx";

import {useFeedbackContext} from "../context/FeedbackContext";

//Graph id & Side bar id
const GRAPH_DIV_ID = "graphContainer";

// keybinding for the 'delete' key on MacOS; this is used in the implementation
//   of the delete function
const DELETE_KEYBINDING = 8;
const DELETE_KEYBINDING2 = 46;

interface CellHistory {
    [cellID: string]: [width: number | undefined, height: number | undefined];
}

const GraphWorker: React.FC<{ showGraphSection?: boolean }> = ({showGraphSection = false}) => {
    const divGraph = useRef<HTMLDivElement>(null);
    const {cluster, dispatch, treeIds, showLineBetweenNonFunctionalGoals} = useFileContext();
    const {graph, setGraph} = useGraph();
    const {setSelectedNode} = useFeedbackContext();

    // Keep the latest context function available to maxGraph listeners without
    // forcing the graph setup effect to re-run whenever the context re-renders.
    const setSelectedNodeRef = useRef(setSelectedNode);
    setSelectedNodeRef.current = setSelectedNode;

    const treeIdsRef = useRef(treeIds);
    treeIdsRef.current = treeIds;
    // Guards against dispatching stale positions while renderGraph is rebuilding cells.
    const isRenderingRef = useRef(false);


    const hasFunctionalGoal = (cluster: Cluster) => (
        cluster.ClusterGoals.some((goal) => goal.GoalType === "Functional")
    );
    const hasFunctionalGoalInCluster = useMemo<boolean>(() => hasFunctionalGoal(cluster), [cluster]);

    const [errorModal, setErrorModal] = useState<ErrorModalProps>({
        show: false,
        title: "",
        message: "",
        onHide: () => setErrorModal(prev => ({...prev, show: false})),
    });


    const [showDeleteWarning, setShowDeleteWarning] = useState(false);

    const [removeChildren, setRemoveChildren] = useState(false);
    const [deletingCells, setDeletingCells] = useState<Cell[] | null>(null);

    const childrenOfSelectedCell = (graph: Graph, selectedCell: Cell): Cell[] => {
        const outgoingEdges = graph.getOutgoingEdges(selectedCell, null);
        return outgoingEdges.filter((edge) => edge?.target !== selectedCell);
    };

    const deleteItemFromGraph = (graph: Graph, removeChildrenFlag: boolean, cells: Cell[]) => {

        if (!cells || !graph) return;

        // 1) Collect all cells that would be removed (including children)
        const toRemoveSet = new Set<Cell>();
        const collect = (cell: Cell) => {
            if (toRemoveSet.has(cell)) return;
            toRemoveSet.add(cell);
            const outgoing = graph.getOutgoingEdges(cell, null) || [];
            if (removeChildrenFlag && outgoing.length) {
                outgoing.forEach(edge => { if (edge.target) collect(edge.target); });
            }
        };
        cells.forEach(collect);
        const toRemove = Array.from(toRemoveSet);

        // Validate goal IDs only.
        type InvalidInfo = { id: string | null, reason: string };
        const invalids: InvalidInfo[] = [];
        const parsedById = new Map<string, { goalId: number; instanceId: InstanceId }>();

        toRemove.forEach(cell => {
            if (cell.isEdge()) return;

            const id = cell.getId();
            try {
                if (!id) throw new Error("Missing goal cell ID");
                const pairs = parseGoalRefId(id);
                if (!pairs?.length) throw new Error(`Malformed goal cell ID "${id}"`);
                pairs.forEach(({goalId, instanceId}) => {
                    parsedById.set(id, {goalId, instanceId});
                });

            } catch (err) {
                invalids.push({
                    id: id ?? 'unknown',
                    reason: err instanceof Error ? err.message : 'Unknown parsing error',
                });
            }
        });

        if (invalids.length > 0) {
            const message = invalids
                .map(inv => inv.reason)
                .join('\n\n');
            setErrorModal({
                show: true,
                title: 'Invalid Cell IDs',
                message,
                onHide: () => setErrorModal(prev => ({...prev, show: false})),
            });
            return;
        }

        const deletedCells: Cell[] = [];
        const removeCellRecursively = (cell: Cell) => {
            const outgoing = graph.getOutgoingEdges(cell, null) || [];
            if (removeChildrenFlag && outgoing.length) {
                outgoing.forEach(edge => { if (edge.target) removeCellRecursively(edge.target); });
            }
            const removed = graph.removeCells([cell], removeChildrenFlag) || [];
            deletedCells.push(...removed);
        };
        cells.forEach(cell => removeCellRecursively(cell));

        deletedCells.forEach(cell => {
            if (cell.isEdge()) return;

            const id = cell.getId();
            if (!id) return;
            const parsed = parsedById.get(id);
            if (!parsed) {
                console.warn('Deleted cell has no parsed info (unexpected):', id);
                return;
            }
            dispatch(removeGoalIdFromTree({
                id: parsed.goalId,
                instanceId: parsed.instanceId,
                removeChildren: removeChildrenFlag,
            }));
        });
        setShowDeleteWarning(false);
    };

    const adjustFontSize = (
        theOldStyle: CellStyle,
        oldWidth: number,
        oldHeight: number,
        newWidth: number,
        newHeight: number
    ) => {
        const oldFontSize = theOldStyle.fontSize;
        let newFontSize;
        let oldRatio;

        if (oldFontSize) {
            if (oldWidth / oldHeight > 1.4) {
                oldRatio = oldFontSize / oldHeight;
            } else {
                oldRatio = oldFontSize / oldWidth;
            }

            if (newWidth / newHeight > 1.4) {
                newFontSize = oldRatio * newHeight;
            } else {
                newFontSize = oldRatio * newWidth;
            }
        } else {
            return oldFontSize;
        }
        return newFontSize;
    };

    const setGraphStyle = (graph: Graph) => {
        // config: permit vertices to be connected by edges
        //graph.setConnectable(true);
        graph.setCellsEditable(true);
        graph.setPanning(true);
        graph.setCellsResizable(true);
        graph.setCellsMovable(true); // Allow cells to be moved
        graph.setCellsSelectable(true); // Allow cells to be selected


        // config: set default style for edges inserted into graph
        const edgeStyle = graph.getStylesheet().getDefaultEdgeStyle();
        edgeStyle.strokeColor = "black";
        edgeStyle.fontColor = "black";
        edgeStyle.endArrow = "none";
        edgeStyle.strokeWidth = 2;
        edgeStyle.editable = true;
        // edgeStyle['edgeStyle'] = "customMMEdgeStyle";
        graph.getStylesheet().putDefaultEdgeStyle(edgeStyle);

        // config: set default style for vertices inserted into graph
        const nodeStyle = graph.getStylesheet().getDefaultVertexStyle();
        nodeStyle.fillColor = "#ffffff";
        nodeStyle.strokeColor = "#000000";
        nodeStyle.strokeWidth = 2;
        nodeStyle.autoSize = false;
        nodeStyle.resizable = true;
        nodeStyle.fontSize = VERTEX_FONT.size;
        nodeStyle.fontColor = VERTEX_FONT.color;
        nodeStyle.editable = true;
        nodeStyle.shape = "image";
        nodeStyle.imageAspect = false;
        graph.getStylesheet().putDefaultVertexStyle(nodeStyle);
    };

    const graphListener = useCallback((graph: Graph): (() => void) => {
        const cellHistory: CellHistory = {};
        const changeHandler = (_sender: string, evt: EventObject) => {
                graph.getDataModel().beginUpdate();
                evt.consume();
                try {
                    const changes = evt.getProperty("edit").changes;
                    for (let i = 0; i < changes.length; i++) {
                        const change = changes[i];
                        if (change.constructor.name == "GeometryChange") {
                            const cell: Cell = changes[i].cell;
                            const cellID = cell.getId();
                            const oldStyle = cell.getStyle();
                            const newWidth = cell.getGeometry()?.height;
                            const newHeight = cell.getGeometry()?.width;

                            if (cellID != null && cellHistory[cellID] == undefined) {
                                cellHistory[cellID] = [newWidth, newHeight];
                            } else {
                                if (cellID != null) {
                                    const oldWidth = cellHistory[cellID][0];
                                    const oldHeight = cellHistory[cellID][1];
                                    if (oldWidth && oldHeight && newWidth && newHeight) {
                                        let newFontSize =
                                            adjustFontSize(
                                                oldStyle,
                                                oldWidth,
                                                oldHeight,
                                                newWidth,
                                                newHeight
                                            ) || 1;

                                        const minFontsize = 10;
                                        const maxFontsize = 30;
                                        newFontSize = Math.max(minFontsize, newFontSize);
                                        newFontSize = Math.min(maxFontsize, newFontSize);

                                        const finalStyle: CellStyle = oldStyle;
                                        finalStyle.fontSize = newFontSize;

                                        graph.getDataModel().setStyle(cell, finalStyle);
                                    }
                                }
                            }
                            if (cellID) {
                                cellHistory[cellID] = [newWidth, newHeight];
                            }

                            // Only persist user-initiated drags; skip events fired during renderGraph.
                            if (!isRenderingRef.current && cellID?.startsWith("Functional-")) {
                                const geo = cell.getGeometry();
                                if (geo !== null) {
                                    const instanceId = validateInstanceId(cellID.replace("Functional-", ""));
                                    dispatch(updatePositionForInstanceId({instanceId, x: geo.x, y: geo.y}));
                                }
                            }
                        }
                        else if (change.constructor.name == "ValueChange") {
                            const cell: Cell = change.cell;
                            // goal id

                            if (isGoalNameEmpty(change.value)) {
                                graph.getDataModel().setValue(cell, change.previous);
                                setErrorModal({
                                    show: true,
                                    title: "Input Error",
                                    message: "Goal name cannot be empty.",
                                    onHide: () => setErrorModal(prev => ({...prev, show: false}))
                                });
                                return;
                            }

                            const numericCellIds = getCellNumericIds(cell);
                            const newGoalValues = change.value.split(",");

                            // Check if the number of items matches
                            const nUpdated = numericCellIds.length;
                            if (nUpdated !== newGoalValues.length) {
                                graph.getDataModel().setValue(cell, change.previous);
                                setErrorModal({
                                    show: true,
                                    title: "Input Error",
                                    message: `Please provide ${nUpdated} ${(nUpdated === 1) ? "item" : "items"} separated by commas`,
                                    onHide: () => setErrorModal(prev => ({...prev, show: false}))
                                });
                            } else {
                                numericCellIds.forEach((instanceId, i) => {
                                    dispatch(updateTextForInstanceId({instanceId, text: newGoalValues[i]}));
                                });
                            }
                        }
                    }
                } finally {
                    graph.getDataModel().endUpdate();
                    graph.refresh();
                }
            };
        graph.getDataModel().addListener(InternalEvent.CHANGE, changeHandler);
        return () => graph.getDataModel().removeListener(changeHandler);
    }, [dispatch]);

    const supportFunctions = (graph: Graph) => {
        const keyHandler = new KeyHandler(graph);
        const deleteSelection = () => {
            if (!graph.isEnabled()) return;

            const selectedCells = graph.getSelectionCells();
            if (!selectedCells.length) return;

            setDeletingCells(selectedCells);
            const hasChildren = childrenOfSelectedCell(graph, selectedCells[0]).length > 0;
            if (hasChildren && !selectedCells[0].isEdge()) {
                setShowDeleteWarning(true);
                return;
            }

            deleteItemFromGraph(graph, false, selectedCells);
        };

        keyHandler.bindKey(DELETE_KEYBINDING, deleteSelection);
        keyHandler.bindKey(DELETE_KEYBINDING2, deleteSelection);

        // undo: add undo manager, this is the object that keeps track of the
        //   history of changes made to the graph
        const undoManager = new UndoManager();
        const listener = (_sender: string, evt: EventObject) => {
            undoManager.undoableEditHappened(evt.getProperty("edit"));
        };

        // undo: for some reason the undo listener has to be added to both the view
        //   and the model
        graph.getDataModel().addListener(InternalEvent.UNDO, listener);
        graph.getView().addListener(InternalEvent.UNDO, listener);

        // undo: add key-handler that listens for 'command'+'z' to execute undo
        const undoKeyHandler = new KeyHandler(graph);
        undoKeyHandler.getFunction = (evt: KeyboardEvent) => {
            // if mac command key pressed ...
            if (Client.IS_MAC && evt.metaKey) {
                // ... and z pressed
                if (evt.code === "KeyZ") {
                    // ... and provided that we have some history to undo
                    //   DO NOT DELETE : removing this guard can crash the web browser
                    if (undoManager.indexOfNextAdd > 1) {
                        // ... then we can execute undo
                        undoManager.undo();
                    }
                }
                // if windows control key pressed ...
            } else if (Client.IS_WIN && evt.ctrlKey) {
                if (evt.code === "KeyZ") {
                    // ... and provided that we have some history to undo
                    //   DO NOT DELETE : removing this guard can crash the web browser
                    if (undoManager.indexOfNextAdd > 1) {
                        // ... then we can execute undo
                        undoManager.undo();
                    }
                }
            }
            return null;
        };
    };

    /**
     * Sidebar
     */

    // config: allow cells to be dropped into the graph canvas at arbitrary points
    //   This is necessary for the drag-and-drop functionality of the sidebar

    DragSource.prototype.getDropTarget = (
        graph: Graph,
        x: number,
        y: number
    ): Cell | null => {
        const cell = graph.getCellAt(x, y);
        return cell && !graph.isValidDropTarget(cell) ? cell : null;
    };

    const resetGraph = (
        graph: Graph,
        rootGoalWrapper: { value: Cell | null },
        emotionsGlob: GlobObject,
        negativesGlob: GlobObject,
        qualitiesGlob: GlobObject,
        stakeholdersGlob: GlobObject
    ) => {
        // Reset - remove any existing graph if render is called
        graph.removeCells(graph.getChildVertices(graph.getDefaultParent()));
        graph.removeCells(graph.getChildEdges(graph.getDefaultParent()));

        // Reset the root goal
        rootGoalWrapper.value = null;

        // Clear the accumulators for non-functional goals
        Object.keys(emotionsGlob).forEach(key => delete emotionsGlob[key]);
        Object.keys(negativesGlob).forEach(key => delete negativesGlob[key]);
        Object.keys(qualitiesGlob).forEach(key => delete qualitiesGlob[key]);
        Object.keys(stakeholdersGlob).forEach(key => delete stakeholdersGlob[key]);
    };

    const renderGraph = useCallback(() => {
        if (!graph) return;
        const selectedCellIds = graph.getSelectionCells()
            .map((cell) => cell.getId())
            .filter((id): id is string => id !== null);
        // Declare necessary variables
        // Use rootGoalWrapper to be able to update its value
        let rootGoal: Cell | null = null;
        const rootGoalWrapper = {value: null as Cell | null};
        const emotionsGlob: GlobObject = {};
        const negativesGlob: GlobObject = {};
        const qualitiesGlob: GlobObject = {};
        const stakeholdersGlob: GlobObject = {};

        isRenderingRef.current = true;
        resetGraph(
            graph,
            rootGoalWrapper,
            emotionsGlob,
            negativesGlob,
            qualitiesGlob,
            stakeholdersGlob
        );

        // Check if the browser is supported
        if (!Client.isBrowserSupported()) {
            error("Browser not supported!", 200, false);
            isRenderingRef.current = false;
            return;
        }

        // Start the transaction to render the graph
        graph.getDataModel().beginUpdate();

        // render functional goals
        renderGoals(
            cluster.ClusterGoals,
            graph,
            null,
            rootGoalWrapper,
            emotionsGlob,
            negativesGlob,
            qualitiesGlob,
            stakeholdersGlob
        );
        rootGoal = rootGoalWrapper.value;
        layoutFunctions(graph, rootGoal);
        restoreSavedPositions(graph, cluster.ClusterGoals);

        // render non-functional goals
        associateNonFunctions(
            cluster.ClusterGoals,
            graph,
            rootGoal,
            emotionsGlob,
            negativesGlob,
            qualitiesGlob,
            stakeholdersGlob,
            showLineBetweenNonFunctionalGoals
        );

        graph.getDataModel().endUpdate();
        const restoredSelection = selectedCellIds
            .map((id) => graph.getDataModel().getCell(id))
            .filter((cell): cell is Cell => cell !== null);
        graph.setSelectionCells(restoredSelection);
        isRenderingRef.current = false;
    }, [graph, cluster, showLineBetweenNonFunctionalGoals]);

    // First useEffect to set up graph. Only run on mount.
    useEffect(() => {
        const graphContainer: HTMLElement | undefined =
            divGraph.current || undefined;

        if (graphContainer) {
            InternalEvent.disableContextMenu(graphContainer);

            const plugins = [
                ...getDefaultPlugins(),
                RubberBandHandler,
            ];

            // Creates the graph with the custom plugins
            const graphInstance = new Graph(graphContainer, undefined, plugins);

            setGraphStyle(graphInstance);
            const removeChangeListener = graphListener(graphInstance);
            fixEditorPosition(graphInstance);
            supportFunctions(graphInstance);

            // Ensure mouse interactions restore focus so keyboard shortcuts work, without breaking in-place editing
            graphInstance.addListener(InternalEvent.CLICK, (_sender: string, evt: EventObject) => {
                const cell = evt.getProperty('cell') as Cell | null;
                if (!cell && !graphInstance.isEditing()) {
                    returnFocusToGraph();
                }
            });
            graphInstance.getSelectionModel().addListener(InternalEvent.CHANGE, () => {
                if (!graphInstance.isEditing()) {
                    returnFocusToGraph();
                }

                const selectedCells = graphInstance.getSelectionCells();

                // Feedback is attached to exactly one graph node at a time.
                // Clear the feedback target if nothing (or multiple cells) is selected.
                if (selectedCells.length !== 1) {
                    setSelectedNodeRef.current(null);
                    return;
                }

                const selectedCell = selectedCells[0];

                // Do not attach feedback to edges.
                if (!selectedCell.isVertex()) {
                    setSelectedNodeRef.current(null);
                    return;
                }

                const cellId = selectedCell.getId();

                if (!cellId) {
                    setSelectedNodeRef.current(null);
                    return;
                }

                const cellValue = selectedCell.getValue();
                const nodeLabel =
                    typeof cellValue === "string" && cellValue.trim().length > 0
                        ? cellValue
                        : cellId;

                setSelectedNodeRef.current(cellId, nodeLabel);
            });

            registerCustomShapes();
            setGraph(graphInstance);

            return () => {
                removeChangeListener();
                graphInstance.destroy();
                setGraph(null);
            };
        }
    // supportFunctions must not be a dependency: its identity changes every
    // render, which would tear down and re-create the graph on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [graphListener, setGraph]);

    // Render graph changes.
    useEffect(() => {
        if (graph) {
            // If user has goals defined, draw the graph
            if (cluster.ClusterGoals.length > 0) {
                renderGraph();
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => recentreView(graph));
                });
            }
            else {
                graph.getDataModel().clear();
            }
        }
    }, [cluster, graph, renderGraph]);

    // Recenter after canvas resizes.
    useEffect(() => {
        if (!showGraphSection || !graph || !divGraph.current) return;

        const container = divGraph.current;
        let frameId: number | null = null;

        const observer = new ResizeObserver(() => {
            if (frameId !== null) cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(() => recentreView(graph));
        });

        observer.observe(container);

        return () => {
            observer.disconnect();
            if (frameId !== null) cancelAnimationFrame(frameId);
        };
    }, [showGraphSection, graph]);


    // --------------------------------------------------------------------------------------------------------------------------------------------------
    const nAssociatedGoal =
        deletingCells && graph
            ? childrenOfSelectedCell(graph, deletingCells[0]).length
            : 0;

    return (
        <div style={{position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column"}}>
            <ErrorModal {...errorModal} />
            <ConfirmModal
                show={showDeleteWarning}
                title="Delete goal with children"
                message={
                    <>
                        The selected goal has {nAssociatedGoal} associated {(nAssociatedGoal === 1) ? 'goal' : 'goals'}
                        <br />
                        Choose below if you also want to delete them.
                    </>
                }
                onHide={() => setShowDeleteWarning(false)}
                onConfirm={() => {
                    if (graph && deletingCells) {
                        deleteItemFromGraph(graph, removeChildren, deletingCells);
                    } else {
                        console.warn("Graph not initialized yet");
                    }
                    setShowDeleteWarning(false);
                }}
                extraContent={
                    <Form.Check
                        type="checkbox"
                        label="Delete associated goal(s)"
                        checked={removeChildren}
                        onChange={(e) => setRemoveChildren(e.target.checked)}
                    />
                }
            />
            <Container fluid style={{flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", padding: 0}}>
                <Row className="row" style={{flex: "1 1 auto", minHeight: 0, height: "100%", margin: 0}}>
                    <Col md={10} className="graph-stage-column" style={{height: "100%", padding: 0}}>
                        <div id={GRAPH_DIV_ID} data-cy="graph-canvas" ref={divGraph} tabIndex={0} style={{outline: 'none', width: '100%', height: '100%'}} />
                    </Col>
                    <Col md={2} className="graph-tools-column" style={{height: "100%"}}>
                        <GraphSidebar graph={graph} recentreView={() => graph && recentreView(graph)} />
                    </Col>
                </Row>
                {(cluster.ClusterGoals.length > 0) && (!hasFunctionalGoalInCluster) && (
                    <WarningMessage message="No functional goals found" />
                )}
            </Container>
        </div>
    );
};

// ---------------------------------------------------------------------------

export default GraphWorker;
