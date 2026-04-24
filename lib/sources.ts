export type SourceType = "CCTV" | "YouTube" | "File";

export type SourceItem = {
  id: number;
  name: string;
  type: SourceType;
  url: string;
  frameRate: string;
  resolution: string;
  status: "Active" | "Inactive";
};

export const sourceStorageKey = "caps08-sources";

export const initialSources: SourceItem[] = [
  {
    id: 1,
    name: "Gate Utama",
    type: "CCTV",
    url: "rtsp://10.1.0.10/live",
    frameRate: "30 FPS",
    resolution: "1920x1080",
    status: "Active",
  },
  {
    id: 2,
    name: "Warehouse North",
    type: "CCTV",
    url: "rtsp://10.1.0.11/live",
    frameRate: "24 FPS",
    resolution: "1280x720",
    status: "Active",
  },
  {
    id: 3,
    name: "Pintu Belakang",
    type: "CCTV",
    url: "rtsp://10.1.0.12/live",
    frameRate: "24 FPS",
    resolution: "1280x720",
    status: "Inactive",
  },
];

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
