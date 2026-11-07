export interface NativePickerResult {
  readonly path?: string;
  readonly cancelled: boolean;
  readonly error?: string;
}

/**
 * Invokes directory picker dialog:
 * In browser environment: Uses window.showDirectoryPicker or simulated prototype selection.
 * In Node/Electron environment: Falls back gracefully.
 */
export async function pickNativeDirectory(options: { prompt?: string; defaultPath?: string } = {}): Promise<NativePickerResult> {
  const prompt = options.prompt ?? "Select Project Folder";

  if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
    try {
      const handle = await (window as any).showDirectoryPicker();
      return { path: handle.name || options.defaultPath || "/workspace/project", cancelled: false };
    } catch (err: any) {
      if (err.name === "AbortError") {
        return { cancelled: true };
      }
    }
  }

  // Simulated browser fallback for prototyping
  const simulatedPath = options.defaultPath || "/workspace/mediobot-prototype";
  return { path: simulatedPath, cancelled: false };
}
