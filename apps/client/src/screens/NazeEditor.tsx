import { useEffect, useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type * as MonacoType from "monaco-editor";
import { IconFile, IconClose, IconSave, IconSearch } from "../../../../packages/design-system/icons";
import NazeTooltip from "../components/NazeTooltip";

/**
 * CODE EDITOR — Phase 10. Pakai Monaco (bukan textarea) sesuai spec §10.
 * Tab bar, unsaved state, save (Ctrl/Cmd+S), search bawaan Monaco,
 * line/column, language, code folding — semua aktif lewat opsi Monaco,
 * bukan diimplementasi ulang dari nol.
 */

interface Tab {
  path: string;
  content: string;
  originalContent: string;
  sha: string;
  language: string;
  saving: boolean;
  error: string | null;
}

const LANGUAGE_BY_EXT: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  html: "html",
  css: "css",
  md: "markdown",
  py: "python",
  sh: "shell",
  yml: "yaml",
  yaml: "yaml"
};

function languageFor(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return LANGUAGE_BY_EXT[ext] ?? "plaintext";
}

interface Props {
  repoFullName: string;
  branch: string;
  initialPath: string;
}

export default function NazeEditor({ repoFullName, branch, initialPath }: Props) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const monacoRef = useRef<typeof MonacoType | null>(null);
  const editorRef = useRef<MonacoType.editor.IStandaloneCodeEditor | null>(null);

  async function openFile(path: string) {
    if (tabs.some((t) => t.path === path)) {
      setActivePath(path);
      return;
    }
    try {
      const res = await fetch("/api/files/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName, branch, path })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTabs((prev) => [
        ...prev,
        {
          path,
          content: data.content,
          originalContent: data.content,
          sha: data.sha,
          language: languageFor(path),
          saving: false,
          error: null
        }
      ]);
      setActivePath(path);
    } catch (err) {
      // eslint-disable-next-line no-alert
      console.error("Naze: gagal buka file —", (err as Error).message);
    }
  }

  useEffect(() => {
    if (initialPath) openFile(initialPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPath]);

  const activeTab = tabs.find((t) => t.path === activePath) ?? null;

  function updateTab(path: string, patch: Partial<Tab>) {
    setTabs((prev) => prev.map((t) => (t.path === path ? { ...t, ...patch } : t)));
  }

  async function saveTab(path: string) {
    const tab = tabs.find((t) => t.path === path);
    if (!tab) return;
    updateTab(path, { saving: true, error: null });
    try {
      const res = await fetch("/api/files/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoFullName, branch, path, content: tab.content, sha: tab.sha })
      });
      const data = await res.json();
      if (!res.ok) {
        updateTab(path, { saving: false, error: data.message });
        return;
      }
      updateTab(path, { saving: false, originalContent: tab.content, sha: data.sha });
    } catch (err) {
      updateTab(path, { saving: false, error: (err as Error).message });
    }
  }

  function closeTab(path: string) {
    setTabs((prev) => prev.filter((t) => t.path !== path));
    if (activePath === path) {
      const remaining = tabs.filter((t) => t.path !== path);
      setActivePath(remaining[0]?.path ?? null);
    }
  }

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((e) => {
      setCursor({ line: e.position.lineNumber, col: e.position.column });
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (activePath) saveTab(activePath);
    });
  };

  function triggerFind() {
    editorRef.current?.getAction("actions.find")?.run();
  }

  return (
    <div style={{ width: "min(480px, 94vw)" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", overflowX: "auto", gap: "0.25rem", borderBottom: "1px solid var(--naze-black-line)" }}>
        {tabs.map((tab) => {
          const dirty = tab.content !== tab.originalContent;
          return (
            <button
              key={tab.path}
              className="naze-tab"
              data-active={tab.path === activePath}
              onClick={() => setActivePath(tab.path)}
              style={{ display: "flex", alignItems: "center", gap: "0.35rem", whiteSpace: "nowrap" }}
            >
              <IconFile size={13} />
              {tab.path.split("/").pop()}
              {dirty && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--naze-pink)" }} />}
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.path);
                }}
                style={{ marginLeft: "0.15rem", opacity: 0.6 }}
              >
                <IconClose size={11} />
              </span>
            </button>
          );
        })}
      </div>

      {activeTab ? (
        <>
          {/* File path + editor actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.4rem 0.25rem",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--naze-white-dim)"
            }}
          >
            <span>{activeTab.path}</span>
            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <NazeTooltip label="Search (Ctrl+F)">
                <button className="naze-icon-btn" aria-label="Search" onClick={triggerFind}>
                  <IconSearch size={13} />
                </button>
              </NazeTooltip>
              <NazeTooltip label="Save (Ctrl+S)">
                <button
                  className="naze-icon-btn"
                  aria-label="Save"
                  onClick={() => saveTab(activeTab.path)}
                >
                  <IconSave size={13} />
                </button>
              </NazeTooltip>
            </div>
          </div>

          <div style={{ border: "1px solid var(--naze-black-line)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            <Editor
              height="360px"
              theme="vs-dark"
              language={activeTab.language}
              value={activeTab.content}
              onMount={handleMount}
              onChange={(value) => updateTab(activeTab.path, { content: value ?? "" })}
              options={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 13,
                minimap: { enabled: false },
                folding: true,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: "on",
                tabSize: 2
              }}
            />
          </div>

          {/* Status bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "0.35rem 0.25rem",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--naze-white-faint)"
            }}
          >
            <span>
              Ln {cursor.line}, Col {cursor.col} · {activeTab.language}
            </span>
            <span style={{ color: activeTab.saving ? "var(--naze-blue)" : activeTab.content !== activeTab.originalContent ? "var(--naze-pink)" : "var(--naze-white-faint)" }}>
              {activeTab.saving ? "Saving..." : activeTab.content !== activeTab.originalContent ? "Unsaved" : "Saved"}
            </span>
          </div>

          {activeTab.error && (
            <p style={{ color: "var(--naze-pink)", fontSize: "var(--text-xs)" }}>{activeTab.error}</p>
          )}
        </>
      ) : (
        <p className="naze-status" style={{ padding: "1rem 0" }}>
          Pilih file dari File Explorer untuk mulai edit.
        </p>
      )}
    </div>
  );
}
