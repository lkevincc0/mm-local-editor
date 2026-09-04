import React from "react";
import {BsArrowRepeat} from "react-icons/bs";

import {useTheme} from "./context/ThemeContext";
import "./SettingsMenu.css";

type SettingsMenuProps = {
    className?: string;
};

// Single button that switches the whole UI between classic and modern
// (theme and interaction mode together). Used in the project edit
// header and on the Home page.
const SettingsMenu: React.FC<SettingsMenuProps> = ({className}) => {
    const {theme, setTheme, setMode} = useTheme();
    const isClassic = theme === "classic";
    const target = isClassic ? "modern" : "classic";

    const handleSwitch = () => {
        setTheme(target);
        setMode(target);
    };

    return (
        <button
            type="button"
            className={["settings-menu-button", className].filter(Boolean).join(" ")}
            onClick={handleSwitch}
            aria-label={`Switch to ${target} UI`}
            title={`Switch to ${target} UI`}
        >
            <BsArrowRepeat/>
            <span className="settings-menu-label">
                {isClassic ? "Modern" : "Classic"}
            </span>
        </button>
    );
};

export default SettingsMenu;
