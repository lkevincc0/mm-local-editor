import React from "react";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";
import {createDefaultTabData, defaultTreeData} from "../../data/initialTabs";
import {defaultFeedbacks, defaultOverallFeedback} from "../../data/defaultFeedback";
import {useFileContext} from "../context/FileProvider";
import {useFeedbackContext} from "../context/FeedbackContext";
import {reset} from "../context/treeDataSlice";

type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "light" | "dark" | "outline-primary" | "outline-secondary" | "outline-success" | "outline-danger" | "outline-warning" | "outline-info" | "outline-light" | "outline-dark" | "link";

type ResetGraphProps = {
    variant?: ButtonVariant
    className?: string
}

const ResetGraphButton: React.FC<ResetGraphProps>  = ({variant="", className=""}) => {
	const {dispatch} = useFileContext();
	const {resetFeedbacks} = useFeedbackContext();

    const resetToEmpty = () => {
        dispatch(reset());
        // Clear out feedback left over from whatever graph was open before,
        // since it no longer refers to anything on the (now empty) graph.
        resetFeedbacks();
    };

    const resetToDefault = () => {
        dispatch(reset({
            treeData: defaultTreeData,
            tabData: createDefaultTabData()
        }));
        // The default graph ships with its own example feedback, so restore
        // that template instead of leaving old feedback (or none) behind.
        resetFeedbacks(defaultFeedbacks, defaultOverallFeedback);
    };

    return (
        <DropdownButton as={ButtonGroup} title="Reset" variant={variant} className={className}>
            <Dropdown.Item onClick={resetToEmpty}>Empty</Dropdown.Item>
            <Dropdown.Item onClick={resetToDefault}>
                Default
            </Dropdown.Item>
        </DropdownButton>
    );
};

export default ResetGraphButton;