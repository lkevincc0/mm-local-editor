import React, {useState} from "react";
import Card from "react-bootstrap/Card";
import {BsCaretDownFill, BsCaretRightFill} from "react-icons/bs";
import Collapse from "react-bootstrap/Collapse";

interface Props {
    title: string
    isOpen?: boolean
    children: React.ReactNode
}

export const CollapsibleSidebarCard = ({title, isOpen=false, children}: Props) => {
    const [showCardContent, setShowCardContent] = useState(isOpen);

    return (
        <Card className="graph-tool-card">
            <Card.Body>
                <Card.Subtitle className="graph-tool-title" onClick={() => setShowCardContent(!showCardContent)}
                               style={{cursor: "pointer"}}>
                    {showCardContent ? <BsCaretDownFill/> : <BsCaretRightFill/>}
                    {title}
                </Card.Subtitle>
                <Collapse in={showCardContent}>
                    <Card.Text className="graph-tool-content">
                        {children}
                    </Card.Text>
                </Collapse>
            </Card.Body>
        </Card>
    );
};
