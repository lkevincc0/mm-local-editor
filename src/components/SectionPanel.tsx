import React, {useEffect, useRef, useState} from "react";
import {BsChevronLeft, BsChevronRight, BsXLg} from "react-icons/bs";

import ErrorModal from "./ErrorModal";
import GoalList from "./GoalList";
import Tree from "./Tree";
import {useFileContext} from "./context/FileProvider";

import GraphWorker from "./Graphs/GraphWorker";
import {addGoalToTree, updateTextForGoalId} from "./context/treeDataSlice.ts";
import {isEmptyGoal} from "./utils/GoalHint.tsx";
import {TreeGoal, InstanceId} from "./types.ts";
import type {PanelDock} from "./ProjectEdit.tsx";

type SectionPanelProps = {
  showGoalSection: boolean;
  setShowGoalSection: (show: boolean) => void;
  goalDock: PanelDock;
  setGoalDock: (dock: PanelDock) => void;
  showHierarchySection: boolean;
  setShowHierarchySection: (show: boolean) => void;
  hierarchyDock: PanelDock;
  setHierarchyDock: (dock: PanelDock) => void;
  showGraphSection: boolean;
  paddingX: number;
};

type PanelControlsProps = {
  dock: PanelDock;
  label: string;
  onDock: (dock: PanelDock) => void;
  onClose: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

const PanelControls = ({dock, label, onDock, onClose}: PanelControlsProps) => (
  <div className="panel-actions" aria-label={`${label} panel controls`}>
    <button
      type="button"
      className={`panel-action ${dock === "left" ? "active" : ""}`}
      onClick={() => onDock("left")}
      title={`Dock ${label} left`}
      aria-label={`Dock ${label} left`}
    >
      <BsChevronLeft />
    </button>
    <button
      type="button"
      className={`panel-action ${dock === "right" ? "active" : ""}`}
      onClick={() => onDock("right")}
      title={`Dock ${label} right`}
      aria-label={`Dock ${label} right`}
    >
      <BsChevronRight />
    </button>
    <button
      type="button"
      className="panel-action panel-close"
      onClick={onClose}
      title={`Close ${label}`}
      aria-label={`Close ${label}`}
    >
      <BsXLg />
    </button>
  </div>
);

const SectionPanel: React.FC<SectionPanelProps> = ({
  showGoalSection,
  setShowGoalSection,
  goalDock,
  setGoalDock,
  showHierarchySection,
  setShowHierarchySection,
  hierarchyDock,
  setHierarchyDock,
  showGraphSection,
  paddingX,
}) => {
  const [draggedItem, setDraggedItem] = useState<TreeGoal | null>(null);
  // Simply store ids of all items in the tree for fast check instead of recursive search
    const {dispatch, tree} = useFileContext();

  const [groupSelected, setGroupSelected] = useState<TreeGoal[]>([]);

    const [existingGoalReferenceInstanceId, setExistingGoalReferenceInstanceId] = useState<{goalId: TreeGoal["id"]; instanceId: InstanceId}[]>([])
  const [existingError, setExistingError] = useState<boolean>(false);

  // const [isHintVisible, setIsHintVisible] = useState(true);

  const goalListRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Clear previous timeout
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setGroupSelected([]);
      setExistingError(false);
    }, delayTime);
  };

  // Handle for goals drop on the nestable section
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      // Temporary Group drop
      if (groupSelected.length > 1) {
          handleDropGroupSelected();
          return;
      }

      if (draggedItem && draggedItem.content) {
            // the first hierachy does not contain the dragged item
            if (!tree.map((item) => item.id).includes(draggedItem.id)) {
              dispatch(addGoalToTree(draggedItem));
          } else {
              setExistingError(true);
              hideErrorModalTimeout();
          }
      }
  };

  // Add selected items where they are not in the tree to the tree and reset selected items, uncheck the checkboxes
  const handleDropGroupSelected = () => {
    
    // Filter groupSelected to get only objects whose IDs are not in treeData
    const newItemsToAdd = groupSelected.filter(
            // current hierachy
            (item) => !tree.some(
                ref => ref.id === item.id
            )
    );

    // If all items are in the tree, then show the warning
    if (newItemsToAdd.length === 0) {
      setExistingError(true);
      hideErrorModalTimeout();

      return;
    }

     // Update treeData with new items, filter out the empty items
    const filteredNewItems = newItemsToAdd.filter((item) => !isEmptyGoal(item));
    filteredNewItems.forEach(item => {
      dispatch(addGoalToTree(item)); // Add each item individually
    });

    setGroupSelected([]);
  };

  const handleGroupDropModal = () => {
    setExistingError(false);
    setGroupSelected([]);
  };

  // Handle synchronize data in table data and tree data
  const handleSynTableTree = (treeItem: TreeGoal, editedText: string) => {
    dispatch(updateTextForGoalId({id: treeItem.id, text: editedText}));
  };

  const closePanel = (panel: HTMLElement | null, onClose: () => void) => {
    if (!panel || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }

    panel.classList.add("is-closing");

    window.setTimeout(onClose, 190);
  };

  const renderGoalPanel = () => (
    <section className="dock-panel goal-library-panel" aria-label="Goal library panel">
      <GoalList
        ref={goalListRef}
        setDraggedItem={setDraggedItem}
        groupSelected={groupSelected}
        setGroupSelected={setGroupSelected}
        handleSynTableTree={(treeItem: TreeGoal, text: string) => dispatch(updateTextForGoalId({id: treeItem.id, text}))}
        handleDropGroupSelected={handleDropGroupSelected}
        panelActions={
          <PanelControls
            dock={goalDock}
            label="Goal library"
            onDock={setGoalDock}
            onClose={(event) => closePanel(
              event.currentTarget.closest<HTMLElement>(".dock-panel"),
              () => setShowGoalSection(false)
            )}
          />
        }
      />
    </section>
  );

  const renderHierarchyPanel = () => (
    <section className="dock-panel hierarchy-panel" aria-label="Model hierarchy panel">
      <div
        className="hierarchy-panel-content"
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
      >
        <div className="panel-heading hierarchy-panel-heading">
          <div>
            <span className="panel-eyebrow">Structure</span>
            <strong>Model hierarchy</strong>
          </div>
          <div className="panel-heading-meta">
            <span className="panel-status">Drag to reorder</span>
            <PanelControls
              dock={hierarchyDock}
              label="Model hierarchy"
              onDock={setHierarchyDock}
              onClose={(event) => closePanel(
                event.currentTarget.closest<HTMLElement>(".dock-panel"),
                () => setShowHierarchySection(false)
              )}
            />
          </div>
        </div>
        <Tree
          handleSynTableTree={handleSynTableTree}
          existingGoalReferenceInstanceId={existingGoalReferenceInstanceId}
          setExistingGoalReferenceInstanceId={setExistingGoalReferenceInstanceId}
        />
      </div>
    </section>
  );

  return (
    <div
      className="section-panel"
      style={{padding: paddingX}}
    >
      <ErrorModal
        show={existingError}
        title="Drop Failed"
        message={`The selected ${(groupSelected.length > 1) ? "goals" : "goal"
        } already ${groupSelected.length > 1 ? "exist" : "exists"}.`}
        onHide={handleGroupDropModal}
      />

      <div className="panel-dock panel-dock-left">
        {showGoalSection && goalDock === "left" && renderGoalPanel()}
        {showHierarchySection && hierarchyDock === "left" && renderHierarchyPanel()}
      </div>

      {showGraphSection && (
        <main className="editor-canvas-panel">
          <div className="panel-heading canvas-panel-heading">
            <div>
              <span className="panel-eyebrow">Workspace</span>
              <strong>Model canvas</strong>
            </div>
            <span className="panel-status">Editable</span>
          </div>
          <div className="canvas-panel-body">
            <GraphWorker showGraphSection={showGraphSection}/>
          </div>
        </main>
      )}

      <div className="panel-dock panel-dock-right">
        {showGoalSection && goalDock === "right" && renderGoalPanel()}
        {showHierarchySection && hierarchyDock === "right" && renderHierarchyPanel()}
      </div>
    </div>
  );
};

export default SectionPanel;
