import React from "react";
import {BsQrCode} from "react-icons/bs";

import styles from "./Home.module.css";

type ShareButtonProps = {
    onClick: () => void;
    disabled?: boolean;
};

const ShareButton: React.FC<ShareButtonProps> = ({
    onClick,
    disabled = false,
}) => {
    return (
        <button
            type="button"
            className={`${styles.btn} ${styles.btnOutline}`}
            onClick={onClick}
            disabled={disabled}
            aria-label="Share project"
        >
            <BsQrCode aria-hidden="true"/>
            Share
        </button>
    );
};

export default ShareButton;
