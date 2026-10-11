export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  minimap: boolean;
  wordWrap: 'on' | 'off';
  lineNumbers: 'on' | 'off' | 'relative';
  tabSize: number;
  insertSpaces: boolean;
  bracketPairColorization: boolean;
  smoothScrolling: boolean;
  cursorStyle: 'line' | 'block' | 'underline';
  autoSave: boolean;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 13,
  fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Menlo, monospace",
  minimap: true,
  wordWrap: 'on',
  lineNumbers: 'on',
  tabSize: 2,
  insertSpaces: true,
  bracketPairColorization: true,
  smoothScrolling: true,
  cursorStyle: 'line',
  autoSave: true
};

const STORAGE_KEY = 'devforge_editor_settings_v2';

export function loadEditorSettings(): EditorSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EDITOR_SETTINGS;
    return { ...DEFAULT_EDITOR_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_EDITOR_SETTINGS;
  }
}

export function saveEditorSettings(settings: Partial<EditorSettings>): EditorSettings {
  try {
    const current = loadEditorSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_EDITOR_SETTINGS;
  }
}
