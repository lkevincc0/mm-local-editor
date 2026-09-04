import {useState} from "react";
import {Graph} from "@maxgraph/core";
import {ColorResult} from "react-color";

import ButtonGroup from "react-bootstrap/ButtonGroup";
import Button from "react-bootstrap/Button";
import ColorPicker from "./ColorPicker.tsx";
import {useFileContext} from "../../context/FileProvider.tsx";
import {useTheme} from "../../context/ThemeContext";
import {themeTokens} from "../../utils/themeTokens";
import {parseFuncGoalRefId, parseGoalRefId} from "../../utils/GraphUtils.tsx";
import {updateColorForInstanceId} from "../../context/treeDataSlice.ts";

type ColorButtonsProps = {
    graph: Graph;
};

const ColorButtons = ({graph}: ColorButtonsProps) => {
    const [selectedColor, setSelectedColor] = useState<string>("#ffffff");
    const {dispatch} = useFileContext();
    const {theme} = useTheme();
    const [dangerPreset, warningPreset, successPreset] = themeTokens[theme].colorButtons.presets;
    const setColor = (color: string) => {
        graph.getDataModel().beginUpdate();
        try {
            graph.getSelectionCells().forEach((cell) => {           
                const id = cell.getId();
                const instanceId = parseGoalRefId(id!)?.[0].instanceId;
                if (instanceId) {
                    dispatch(updateColorForInstanceId({instanceId, color}));
                }
            });
        } finally {
            graph.getDataModel().endUpdate();
        }
    };

    const updateSelectedColor = (color: ColorResult) => {
        setSelectedColor(color.hex);
        setColor(color.hex)
    };

    // Note that the colours are copies from the bootstrap variants and won't track changes there
    return (
        <>
            <ButtonGroup vertical className="w-100">
                <Button variant="danger"
                        onClick={() => setColor(dangerPreset)}>
                    High
                </Button>
                <Button variant="warning"
                        onClick={() => setColor(warningPreset)}>
                    Medium
                </Button>
                <Button variant="success"
                        onClick={() => setColor(successPreset)}>
                    Low
                </Button>
            </ButtonGroup>
            <ColorPicker selectedColor={selectedColor}
                         onColorChange={updateSelectedColor}
                         className="pt-1"/>
        </>
    )
};

export default ColorButtons;