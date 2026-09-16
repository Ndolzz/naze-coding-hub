import { useState } from "react";
import NazeBoot from "./screens/NazeBoot";
import NazeApiSetup from "./screens/NazeApiSetup";
import NazeProjects from "./screens/NazeProjects";
import NazeFileExplorer from "./screens/NazeFileExplorer";
import NazeEditor from "./screens/NazeEditor";
import NazeBuildLogs from "./screens/NazeBuildLogs";
import NazeGitPanel from "./screens/NazeGitPanel";
import NazePreview from "./screens/NazePreview";
import NazeAiPanel from "./screens/NazeAiPanel";
import NazeToastStack, { ToastMessage } from "./components/NazeToast";

type Phase = "boot" | "apiSetup" | "projects" | "workspace";

interface Project {
  id: string;
  name: string;
  repoFullName: string;
  defaultBranch: string;
  activeBranch?: string;
  vercelProjectId?: string;
  createdAt: string;
}

/**
 * Phase 21: setiap perpindahan phase dibungkus `.naze-page-transition`
 * (key={phase} supaya animasi retrigger tiap pindah layar), dan toast
 * stack dirender sekali di root supaya notifikasi konsisten di semua phase.
 */
export default function App() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [openFilePath, setOpenFilePath] = useState<string | null>(null);
  const [workspacePanel, setWorkspacePanel] = useState<"files" | "build" | "git" | "preview" | "ai">("files");
  const [aiPrefill, setAiPrefill] = useState<{ request: string; buildLogs?: string } | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function notify(text: string, tone: ToastMessage["tone"] = "default") {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, text, tone }]);
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const workingBranch = activeProject?.activeBranch ?? activeProject?.defaultBranch ?? "main";

  async function switchBranch(branch: string) {
    if (!activeProject) return;
    setActiveProject({ ...activeProject, activeBranch: branch });
    await fetch("/api/projects/switch-branch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: activeProject.id, branch })
    }).catch(() => undefined);
  }

  let content: JSX.Element;

  if (phase === "boot") {
    content = <NazeBoot onComplete={() => setPhase("apiSetup")} />;
  } else if (phase === "apiSetup") {
    content = <NazeApiSetup onComplete={() => setPhase("projects")} />;
  } else if (phase === "projects") {
    content = (
      <NazeProjects
        onOpenProject={(p) => {
          setActiveProject(p);
          setPhase("workspace");
        }}
        onNotify={notify}
      />
    );
  } else {
    content = (
      <main className="naze-shell" style={{ justifyContent: "flex-start", paddingTop: "2.5rem", gap: "1rem" }}>
        <h1 className="naze-title" style={{ fontSize: "var(--text-2xl)" }}>{activeProject?.name ?? "WORKSPACE"}</h1>
        <p className="naze-tagline">
          {activeProject?.repoFullName} · {workingBranch}
        </p>

        {activeProject && (
          <>
            <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.5rem", overflowX: "auto", flexWrap: "nowrap", width: "100%" }}>
              <button className="naze-tab" data-active={workspacePanel === "files"} onClick={() => setWorkspacePanel("files")}>
                Files
              </button>
              <button className="naze-tab" data-active={workspacePanel === "build"} onClick={() => setWorkspacePanel("build")}>
                Build
              </button>
              <button className="naze-tab" data-active={workspacePanel === "git"} onClick={() => setWorkspacePanel("git")}>
                Git
              </button>
              <button className="naze-tab" data-active={workspacePanel === "preview"} onClick={() => setWorkspacePanel("preview")}>
                Preview
              </button>
              <button className="naze-tab" data-active={workspacePanel === "ai"} onClick={() => setWorkspacePanel("ai")}>
                AI
              </button>
            </div>

            {workspacePanel === "files" && (
              <>
                <NazeFileExplorer repoFullName={activeProject.repoFullName} branch={workingBranch} onOpenFile={setOpenFilePath} />
                {openFilePath && (
                  <NazeEditor repoFullName={activeProject.repoFullName} branch={workingBranch} initialPath={openFilePath} />
                )}
              </>
            )}

            {workspacePanel === "build" && (
              <NazeBuildLogs
                repoFullName={activeProject.repoFullName}
                onAskAi={(buildLogs) => {
                  setAiPrefill({ request: "Kenapa build ini gagal?", buildLogs });
                  setWorkspacePanel("ai");
                }}
              />
            )}

            {workspacePanel === "git" && (
              <NazeGitPanel repoFullName={activeProject.repoFullName} branch={workingBranch} onBranchSwitched={switchBranch} />
            )}

            {workspacePanel === "preview" && (
              <NazePreview
                projectId={activeProject.id}
                vercelProjectId={activeProject.vercelProjectId}
                onLinked={(vercelProjectId) => setActiveProject({ ...activeProject, vercelProjectId })}
              />
            )}

            {workspacePanel === "ai" && (
              <NazeAiPanel
                repoFullName={activeProject.repoFullName}
                branch={workingBranch}
                openFilePath={openFilePath}
                prefill={aiPrefill}
                onNotify={notify}
              />
            )}
          </>
        )}

        <button className="naze-btn" onClick={() => setPhase("projects")}>
          Back to Projects
        </button>
      </main>
    );
  }

  return (
    <>
      <div className="naze-page-transition" key={phase}>
        {content}
      </div>
      <NazeToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
