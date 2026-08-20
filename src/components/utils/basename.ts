// The app is deployed to GitHub Pages under the /mm-local-editor/ subpath, but
// may also be opened directly at the root (e.g. http://localhost:5173/ or
// http://<ip>:<port>/). React Router renders nothing when the URL does not start
// with the basename, so only apply it when the current path actually needs it.
export const getBasename = (pathname: string = window.location.pathname): string =>
	pathname.startsWith("/mm-local-editor") ? "/mm-local-editor" : "/";

// Static assets in public/ must be prefixed with the deploy basename, otherwise
// absolute paths like "/papers/x.pdf" resolve against the domain root and break
// when the app is served from a subpath (e.g. GitHub Pages).
export const assetUrl = (path: string): string => {
	// Guard for non-browser environments (e.g. Vitest running in node).
	const basename = typeof window === "undefined" ? "/" : getBasename();
	const base = basename === "/" ? "" : basename;
	return `${base}/${path.replace(/^\/+/, "")}`;
};
