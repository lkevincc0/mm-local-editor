import React, {useEffect, useRef} from "react";

import {
    getAvatarCell,
    loadAvatarImage
} from "./utils/avatarSprite";

interface AvatarProps {
    avatar: string;
    size: number;
    className?: string;
}

// Renders one avatar cell from the sprite sheet onto a square canvas,
// scaling up to cover the square without distorting the avatar.
const Avatar: React.FC<AvatarProps> = ({
    avatar,
    size,
    className
}) => {
    const canvasRef =
        useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas || !avatar) {
            return;
        }

        const ctx = canvas.getContext("2d");

        if (!ctx) {
            return;
        }

        let cancelled = false;

        loadAvatarImage()
            .then((img) => {
                if (cancelled) {
                    return;
                }

                const cell = getAvatarCell(avatar);
                const scale = Math.max(
                    size / cell.w,
                    size / cell.h
                );
                const dw = cell.w * scale;
                const dh = cell.h * scale;
                const dx = (size - dw) / 2;
                const dy = (size - dh) / 2;

                ctx.clearRect(0, 0, size, size);
                ctx.drawImage(
                    img,
                    cell.x,
                    cell.y,
                    cell.w,
                    cell.h,
                    dx,
                    dy,
                    dw,
                    dh
                );
            })
            .catch(() => {
                // Sprite not available; leave the canvas blank.
            });

        return () => {
            cancelled = true;
        };
    }, [avatar, size]);

    return (
        <canvas
            ref={canvasRef}
            width={size}
            height={size}
            className={className}
            style={{display: "block"}}
        />
    );
};

export default Avatar;
