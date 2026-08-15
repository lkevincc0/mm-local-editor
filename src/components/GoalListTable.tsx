import React, {RefObject, useState} from "react";
import {Label, newTreeGoal, TreeGoal} from "./types.ts";
import {handleGoalBlur, isEmptyGoal, isGoalDraggable} from "./utils/GoalHint.tsx";
import {
    addGoalToTab,
    deleteGoalFromGoalList,
    selectGoalsForLabel,
    updateTextForGoalId
} from "./context/treeDataSlice.ts";
import {useFileContext} from "./context/FileProvider.tsx";
import {BsFillTrash3Fill, BsGripVertical} from "react-icons/bs";
import styles from "./GoalListTable.module.css";

const goalDescriptionForLabel = (label: Label): string => {
    const goalNames: Partial<Record<Label, string>> = {
        "Who": "Stakeholder name"
    };
    return goalNames[label] ?? "Goal name";
};

interface Props {
	label: Label
	goals: TreeGoal[]
    setDraggedItem: (item: TreeGoal | null) => void;
	groupSelected: TreeGoal[]
	setGroupSelected: (groupSelected: TreeGoal[]) => void
	handleSynTableTree: (treeItem: TreeGoal, editedText: string) => void
    inputRef: RefObject<HTMLInputElement>
}

const GoalListTable: React.FC<Props> = ({label, goals, setDraggedItem, groupSelected, setGroupSelected, handleSynTableTree, inputRef}) => {
	const treeData = useFileContext();
	const {dispatch} = treeData;
	const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
	const [editedText, setEditedText] = useState<string>("");
	const [invalidGoalId, setInvalidGoalId] = useState<number | null>(null);

	// Function to update tree data while user finish input changes
	const handleSave = (treeItem: TreeGoal, text: string) => {
		handleSynTableTree(treeItem, text);
	};

	const handleTableKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, row: TreeGoal) => {
		if (event.key === "Escape") {
			event.preventDefault();
			setEditedText(row.content);
			setEditingGoalId(null);
			setInvalidGoalId(null);
			event.currentTarget.blur();
			return;
		}

		if (event.key !== "Enter") return;

		event.preventDefault();
		const content = editedText.trim();
		if (!content) {
			setInvalidGoalId(row.id);
			return;
		}

		dispatch(updateTextForGoalId({id: row.id, text: content}));
		handleSave(row, content);
		setEditingGoalId(null);
		setInvalidGoalId(null);
		dispatch(addGoalToTab(newTreeGoal({type: label})));

		requestAnimationFrame(() => inputRef.current?.focus());
	};

	// Handle blur with GoalHint functions
	const handleTableBlur = (row: TreeGoal) => {
		if (editingGoalId === row.id) {
			handleGoalBlur(
				row.content, // original content
				editedText, // current content
				(content) => {
					// On save callback
					dispatch(updateTextForGoalId({id: row.id, text: content}));
					handleSave(row, content);
					setEditingGoalId(null);
				},
				() => {
					// On cancel callback
					setEditingGoalId(null);
					setEditedText(row.content);
				}
			);
		} else {
			// Fallback to original save behaviour
			handleSave(row, row.content);
		}
	};

	const handleDeleteRow = (row: TreeGoal) => {
		dispatch(deleteGoalFromGoalList(row));
		const filteredGroupSelected = groupSelected.filter(
			(item) => item.id !== row.id
		);

		setGroupSelected(filteredGroupSelected);
	};


	const handleDragStart = (row: TreeGoal) => {
		setDraggedItem(row);
	};

	const handleCheckboxToggle = (row: TreeGoal) => {
		// Ignore the item if the content is empty
		if (isEmptyGoal(row)) {
			return;
		}
		const isRowSelected = groupSelected.some((item) => item.id === row.id);

		let newGroupSelected: TreeGoal[];

		// Create a new array based on the current groupSelected state
		if (isRowSelected) {
			newGroupSelected = groupSelected.filter((item) => item.id !== row.id);
		} else {
			newGroupSelected = [...groupSelected, row];
		}

		setGroupSelected(newGroupSelected);
	};
	const isChecked = (row: TreeGoal): boolean | undefined => {
		return groupSelected.some((item) => item.id === row.id);
	};

	// Check whether all goals are selected in the table (excluding undefined ones)
	const isAllSelected = () => {
		const allItemsInTab = selectGoalsForLabel({treeData}, label);
		// Return true if all items in goal list are selected and list is not empty
		const nonEmptyItems = allItemsInTab.filter(row => !isEmptyGoal(row));

		return (
			nonEmptyItems.length > 0 &&
			groupSelected.length === nonEmptyItems.length
		);
	};

	// Select all items in the goals tab
	const handleSelectAll = () => {
		const allItemsInTab = selectGoalsForLabel({treeData}, label);
		if (!allItemsInTab) return;

		const nonEmptyItems = allItemsInTab.filter(row => !isEmptyGoal(row));
		if (nonEmptyItems.length === groupSelected.length) {
			setGroupSelected([]);
		} else {
			setGroupSelected(nonEmptyItems);
		}
	};

	const nonEmptyGoalCount = goals.filter((goal) => !isEmptyGoal(goal)).length;

	return (
		<div className={styles.editor}>
			<div className={styles.editorHeader}>
				<label className={styles.selectAll}>
					<input type="checkbox" onChange={handleSelectAll} checked={isAllSelected()}/>
					<span>{goalDescriptionForLabel(label)}</span>
				</label>
				<span>{nonEmptyGoalCount} {nonEmptyGoalCount === 1 ? "entry" : "entries"}</span>
			</div>

			<div className={styles.goalList}>
				{goals.map((row, index) => {
					const isEditing = editingGoalId === row.id;
					const isInvalid = invalidGoalId === row.id;

					return (
						<div className={`${styles.goalRow} ${isEditing ? styles.editing : ""}`} key={`${label}-${row.id}`}>
							<span
								className={styles.dragHandle}
								draggable={isGoalDraggable(row)}
								onDragStart={() => handleDragStart(row)}
								title={isEmptyGoal(row) ? "Name this goal before dragging" : "Drag to hierarchy"}
							>
								<BsGripVertical/>
							</span>
							<input
								className={styles.rowCheckbox}
								type="checkbox"
								onChange={() => handleCheckboxToggle(row)}
								checked={isChecked(row)}
								disabled={isEmptyGoal(row)}
								aria-label={`Select ${row.content || label} goal`}
							/>
							<div className={styles.inputArea}>
								<input
									className={`${styles.goalInput} ${isInvalid ? styles.invalid : ""}`}
									type="text"
									value={isEditing ? editedText : row.content}
									onChange={(event) => {
										if (!isEditing) return;
										setEditedText(event.target.value);
										if (event.target.value.trim()) setInvalidGoalId(null);
									}}
									onFocus={() => {
										if (!isEditing) {
											setEditingGoalId(row.id);
											setEditedText(row.content);
										}
									}}
									placeholder={`Add a ${label.toLowerCase()} goal`}
									spellCheck
									onKeyDown={(event) => handleTableKeyDown(event, row)}
									onBlur={() => handleTableBlur(row)}
									ref={index === goals.length - 1 ? inputRef : undefined}
								/>
								{isInvalid && <span className={styles.errorText}>Enter a name or press Esc</span>}
							</div>
							{goals.length > 1 && (
								<button
									type="button"
									className={styles.deleteButton}
									onClick={() => handleDeleteRow(row)}
									aria-label={`Delete ${row.content || label} goal`}
								>
									<BsFillTrash3Fill/>
								</button>
							)}
						</div>
					);
				})}
			</div>
			<p className={styles.keyboardHint}>Enter saves and starts the next goal · Esc cancels</p>
		</div>
	);
};

export default GoalListTable;
