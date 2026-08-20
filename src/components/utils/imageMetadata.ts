const MAGIC_MARKER = "MMEDITOR_PROJECT_DATA::";

/** ---------- PNG ---------- */

export async function embedJsonInPng(pngBlob: Blob, projectData: unknown): Promise<Blob> {
    const pngBuffer = await pngBlob.arrayBuffer();
    const jsonStr = MAGIC_MARKER + JSON.stringify(projectData);
    const jsonBytes = new TextEncoder().encode(jsonStr);

    const combined = new Uint8Array(pngBuffer.byteLength + jsonBytes.byteLength);
    combined.set(new Uint8Array(pngBuffer), 0);
    combined.set(jsonBytes, pngBuffer.byteLength);

    return new Blob([combined], {type: "image/png"});
}

export async function extractJsonFromPng(file: File | Blob): Promise<unknown | null> {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder("utf-8", {fatal: false}).decode(buffer);
    const idx = text.lastIndexOf(MAGIC_MARKER);
    if (idx === -1) return null;

    try {
        return JSON.parse(text.slice(idx + MAGIC_MARKER.length));
    } catch {
        return null;
    }
}

/** ---------- SVG ---------- */

export function embedJsonInSvg(svgString: string, projectData: unknown): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svgEl = doc.documentElement;

    const metadataEl = doc.createElementNS("http://www.w3.org/2000/svg", "metadata");
    metadataEl.setAttribute("id", "mm-editor-project-data");
    metadataEl.textContent = btoa(unescape(encodeURIComponent(JSON.stringify(projectData))));
    svgEl.insertBefore(metadataEl, svgEl.firstChild);

    return new XMLSerializer().serializeToString(doc);
}

export async function extractJsonFromSvg(file: File | Blob): Promise<unknown | null> {
    const text = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "image/svg+xml");
    const metadataEl = doc.getElementById("mm-editor-project-data");
    if (!metadataEl?.textContent) return null;

    try {
        return JSON.parse(decodeURIComponent(escape(atob(metadataEl.textContent))));
    } catch {
        return null;
    }
}