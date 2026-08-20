import {defineConfig} from "vitest/config";
import react from "@vitejs/plugin-react";

// animal-avatar-generator ships `type: "module"` dist code that imports its
// own submodules without a `.js` extension (e.g. `./utils/array`). Vite's
// bundler resolver accepts that, but Vitest externalizes node_modules to
// Node's native ESM loader, which requires explicit extensions. Inlining the
// package routes it through Vite's transform pipeline instead.
export default defineConfig({
    plugins: [react()],
    test: {
        server: {
            deps: {
                inline: ["animal-avatar-generator"]
            }
        }
    }
});
