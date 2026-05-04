export type SourceType = "MP4" | "RTSP" | "Webcam" | "Youtube" | "Other";

export type SourceItem = {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  fps_target: string;
  resolution: string;
  status: boolean;
};

export const sourceStorageKey = "caps08-sources";

export function readSourcesFromStorage(): SourceItem[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedSources = window.localStorage.getItem(sourceStorageKey);
  if (!storedSources) {
    return null;
  }

  try {
    const parsedSources = JSON.parse(storedSources) as SourceItem[];
    return Array.isArray(parsedSources) ? parsedSources : null;
  } catch {
    return null;
  }
}

export function writeSourcesToStorage(sources: SourceItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(sourceStorageKey, JSON.stringify(sources));
}
