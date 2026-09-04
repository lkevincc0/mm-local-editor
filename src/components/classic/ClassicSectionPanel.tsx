import {Resizable, ResizeCallback} from "re-resizable";
import React, {useEffect, useRef, useState} from "react";

import ErrorModal from "../ErrorModal";
import GoalList from "../GoalList";
import Tree from "../Tree";
import {useFileContext} from "../context/FileProvider";
import {useGraph} from "../context/GraphContext";

import GraphWorker from "../Graphs/GraphWorker";
import {addGoalToTree, updateTextForGoalId} from "../context/treeDataSlice.ts";
import {isEmptyGoal} from "../utils/GoalHint.tsx";
import {TreeGoal, InstanceId} from "../types.ts";

import FeedbackPanel from "../Feedback/FeedbackPanel";

import "../SectionPanel.css";
import "./ClassicSectionPanel.css";

const defaultStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  borderStyle: "solid",
  borderColor: "var(--goal-panel-border, lightgrey)",
  borderWidth: "1px",
  borderRadius: "3px",
};

const DEFINED_PROPORTIONS = {
  maxWidth: "80%",
  minWidth: "10%",
};

const INITIAL_PROPORTIONS = {
  sectionOne: 0.5,
  sectionThree: 0.63,
  sectionsCombine: {
    sectionOne: 0.2,
    sectionThree: 0.5,
  },
};

const DEFAULT_HEIGHT = "800px";

type ClassicSectionPanelProps = {
  showGoalSection: boolean;
  showGraphSection: boolean;
  showFeedbackSection: boolean;
  onCloseFeedback: () => void;
  paddingX: number;
};

// Classic 3-pane resizable layout ported from the original SectionPanel:
// Goal List (left) | Model hierarchy tree (middle) | Model canvas (right),
// plus a Feedback column when enabled. Sections stay mounted and are hidden
// with display:none so the graph instance survives step switches.
const ClassicSectionPanel: React.FC<ClassicSectionPanelProps> = ({
  showGoalSection,
  showGraphSection,
  showFeedbackSection,
  onCloseFeedback,
  paddingX,
}) => {
  const [sectionOneWidth, setSectionOneWidth] = useState(0);
  const [sectionThreeWidth, setSectionThreeWidth] = useState(0);
  const [parentWidth, setParentWidth] = useState(0);

  const {dispatch, tree} = useFileContext();
  const {graph} = useGraph();

  const [draggedItem, setDraggedItem] = useState<TreeGoal | null>(null);
  const [groupSelected, setGroupSelected] = useState<TreeGoal[]>([]);

  const [existingGoalReferenceInstanceId, setExistingGoalReferenceInstanceId] =
    useState<{goalId: TreeGoal["id"]; instanceId: InstanceId}[]>([]);
  const [existingError, setExistingError] = useState<boolean>(false);

  const sectionTwoRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const goalListRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle section one resize and section three auto resize
  const handleResizeSectionOne: ResizeCallback = (_event, _direction, ref) => {
    setSectionOneWidth(ref.offsetWidth);
    if (sectionTwoRef.current) {
      const totalWidth =
        ref.offsetWidth + sectionTwoRef.current.offsetWidth + sectionThreeWidth;

      if (totalWidth >= parentWidth) {
        setSectionThreeWidth(
          parentWidth - ref.offsetWidth - sectionTwoRef.current.offsetWidth
        );
      }
    }
  };

  // Handle section three resize and section one auto resize
  const handleResizeSectionThree: ResizeCallback = (_event, _direction, ref) => {
    setSectionThreeWidth(ref.offsetWidth);
    if (
      sectionTwoRef.current &&
      sectionOneWidth + sectionTwoRef.current.offsetWidth + ref.offsetWidth >=
        parentWidth
    ) {
      setSectionOneWidth(
        parentWidth - ref.offsetWidth - sectionTwoRef.current.offsetWidth
      );
    }
  };

  // Clear timeout when component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Hide the drop error modal automatically after a set time
  const hideErrorModalTimeout = () => {
    const delayTime = 1500;

    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setGroupSelected([]);
      setExistingError(false);
    }, delayTime);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (groupSelected.length > 1) {
      handleDropGroupSelected();
      return;
    }

    if (draggedItem && draggedItem.content) {
      if (!tree.map((item) => item.id).includes(draggedItem.id)) {
        dispatch(addGoalToTree(draggedItem));
      } else {
        setExistingError(true);
        hideErrorModalTimeout();
      }
    }
  };

  // Add selected items where they are not in the tree to the tree and reset selected items
  const handleDropGroupSelected = () => {
    const newItemsToAdd = groupSelected.filter(
      (item) => !tree.some((ref) => ref.id === item.id)
    );

    // If all items are in the tree, then show the warning
    if (newItemsToAdd.length === 0) {
      setExistingError(true);
      hideErrorModalTimeout();
      return;
    }

    const filteredNewItems = newItemsToAdd.filter((item) => !isEmptyGoal(item));
    filteredNewItems.forEach((item) => {
      dispatch(addGoalToTree(item));
    });

    setGroupSelected([]);
  };

  const handleGroupDropModal = () => {
    setExistingError(false);
    setGroupSelected([]);
  };

  const handleSynTableTree = (treeItem: TreeGoal, editedText: string) => {
    dispatch(updateTextForGoalId({id: treeItem.id, text: editedText}));
  };

  // Locate a feedback's node on the canvas: select it so it highlights and
  // scrolls into view, which also narrows the feedback list to that node.
  const handleSelectFeedbackNode = (nodeId: string) => {
    if (!graph) {
      return;
    }

    const cell = graph.getDataModel().getCell(nodeId);

    if (!cell) {
      return;
    }

    graph.setSelectionCell(cell);
    graph.scrollCellToVisible(cell, true);
  };

  // Get the parent div inner width and set starter width for section one and section three
  useEffect(() => {
    if (parentRef.current) {
      // The feedback column takes a fixed slice of the row; exclude it from
      // the width budget so the graph section fills the remaining space
      // instead of leaving a blank gap on the right.
      const feedbackWidth = showFeedbackSection
        ? Math.min(340, Math.max(280, window.innerWidth * 0.2))
        : 0;
      const newParentWidth = parentRef.current.clientWidth - paddingX * 2 - feedbackWidth;
      setParentWidth(newParentWidth);

      if (showGoalSection && showGraphSection) {
        setSectionOneWidth(
          newParentWidth * INITIAL_PROPORTIONS.sectionsCombine.sectionOne
        );
        setSectionThreeWidth(
          newParentWidth * INITIAL_PROPORTIONS.sectionsCombine.sectionThree
        );
      } else if (showGoalSection) {
        setSectionOneWidth(newParentWidth * INITIAL_PROPORTIONS.sectionOne);
      } else if (showGraphSection) {
        // Model step: goal list and hierarchy are hidden, so the graph takes
        // the full budget (already excludes the feedback column).
        setSectionThreeWidth(newParentWidth);
      } else {
        setSectionOneWidth(newParentWidth * INITIAL_PROPORTIONS.sectionOne);
        setSectionThreeWidth(newParentWidth * INITIAL_PROPORTIONS.sectionThree);
      }
    }
  }, [paddingX, showGoalSection, showGraphSection, showFeedbackSection]);

  // Model step: graph is the only visible resizable section, so let it flex
  // to fill the row (minus the feedback column) instead of trusting the
  // computed pixel budget, which goes stale when columns toggle.
  const graphOnly = showGraphSection && !showGoalSection;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        padding: paddingX,
      }}
      ref={parentRef}
    >
      {/* Additional helper components */}
      <ErrorModal
        show={existingError}
        title="Drop Failed"
        message={`The selected ${groupSelected.length > 1 ? "goals" : "goal"
        } already ${groupSelected.length > 1 ? "exist" : "exists"}.`}
        onHide={handleGroupDropModal}
      />

      {/* Goal List Section */}
      <Resizable
        handleClasses={{right: "right-handler"}}
        enable={{right: true}}
        style={{
          ...defaultStyle,
          backgroundColor: "var(--goal-panel, rgb(236, 244, 244))",
          display: showGoalSection ? "flex" : "none",
        }}
        size={{width: sectionOneWidth, height: "100%"}}
        maxWidth={DEFINED_PROPORTIONS.maxWidth}
        minWidth={DEFINED_PROPORTIONS.minWidth}
        minHeight={DEFAULT_HEIGHT}
        onResize={handleResizeSectionOne}
      >
        <GoalList
          ref={goalListRef}
          setDraggedItem={setDraggedItem}
          groupSelected={groupSelected}
          setGroupSelected={setGroupSelected}
          handleSynTableTree={handleSynTableTree}
          handleDropGroupSelected={handleDropGroupSelected}
        />
      </Resizable>

      {/* Cluster Hierarchy Section */}
      <div
        style={{
          width: "100%",
          minWidth: DEFINED_PROPORTIONS.minWidth,
          minHeight: DEFAULT_HEIGHT,
          height: DEFAULT_HEIGHT,
          padding: "10px",
          backgroundColor: "var(--hierarchy-panel, rgba(35, 144, 231, 0.1))",
          overflow: "auto",
          display: showGoalSection ? "block" : "none",
        }}
        ref={sectionTwoRef}
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
      >
        <Tree
          handleSynTableTree={handleSynTableTree}
          existingGoalReferenceInstanceId={existingGoalReferenceInstanceId}
          setExistingGoalReferenceInstanceId={setExistingGoalReferenceInstanceId}
        />
      </div>

      {/* Graph Render Section */}
      <Resizable
        handleClasses={{left: "left-handler"}}
        enable={{left: !graphOnly}}
        className={graphOnly ? "classic-graph-fill" : undefined}
        style={{
          ...defaultStyle,
          backgroundColor: "var(--goal-panel, rgb(236, 244, 244))",
          display: showGraphSection ? "flex" : "none",
        }}
        size={{
          width: graphOnly ? "auto" : sectionThreeWidth,
          height: "100%",
        }}
        maxWidth={graphOnly ? "100%" : DEFINED_PROPORTIONS.maxWidth}
        minWidth={DEFINED_PROPORTIONS.minWidth}
        minHeight={DEFAULT_HEIGHT}
        onResize={handleResizeSectionThree}
      >
        <GraphWorker showGraphSection={showGraphSection} />
      </Resizable>

      {/* Feedback Section */}
      {showFeedbackSection && (
        <section
          className="feedback-panel-column classic-feedback-column"
          aria-label="Feedback panel"
        >
          <FeedbackPanel
            onSelectNode={handleSelectFeedbackNode}
            onClose={onCloseFeedback}
          />
        </section>
      )}
    </div>
  );
};

export default ClassicSectionPanel;
