import {defineConfig} from "vitest/config";
import react from "@vitejs/plugin-react";

// These ESM packages import their own submodules without a `.js` extension.
// Vite's bundler resolver accepts that, but Vitest normally externalizes
// node_modules to Node's native ESM loader, which requires explicit
// extensions. Inlining them routes the imports through Vite instead.
export default defineConfig({
    plugins: [react()],
    test: {
        server: {
            deps: {
                inline: ["animal-avatar-generator", "@maxgraph/core"]
            }
        }
    }
});
