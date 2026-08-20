// Calibrated sprite sheet boundaries (px in the 1254x1254 source image).
const X_LINES = [0, 250.8, 490.4, 727.8, 978.6, 1254];
const Y_LINES = [0, 269.8, 536.3, 789.3, 1024.5, 1254];

export const AVATAR_COUNT = 25;
export const AVATAR_COLS = 5;

export type AvatarCell = {
    x: number;
    y: number;
    w: number;
    h: number;
};

// The source rectangle for the 1-indexed avatar cell.
export const getAvatarCell = (
    avatar: string
): AvatarCell => {
    const index = Number(avatar) - 1;
    const col = index % AVATAR_COLS;
    const row = Math.floor(index / AVATAR_COLS);

    return {
        x: X_LINES[col],
        y: Y_LINES[row],
        w: X_LINES[col + 1] - X_LINES[col],
        h: Y_LINES[row + 1] - Y_LINES[row]
    };
};

// Shared, cached image loader for the sprite sheet.
let imagePromise: Promise<HTMLImageElement> | null =
    null;

export const loadAvatarImage =
    (): Promise<HTMLImageElement> => {
        if (!imagePromise) {
            imagePromise = new Promise(
                (resolve, reject) => {
                    const img = new Image();
                    img.src = "/img/avatar-1.png";
                    img.onload = () => resolve(img);
                    img.onerror = () =>
                        reject(
                            new Error(
                                "Failed to load avatar sprite"
                            )
                        );
                }
            );
        }

        return imagePromise;
    };
