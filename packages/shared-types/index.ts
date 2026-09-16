export interface NazeProject {
  id: string;
  name: string;
  repoFullName: string; // "owner/repo"
  defaultBranch: string;
  createdAt: string;
}

export interface NazeFileNode {
  path: string;
  type: "file" | "folder";
  children?: NazeFileNode[];
}

export type NazeAiRole = "architect" | "implementer";

export interface NazeProposedChange {
  action: "create" | "modify" | "delete";
  path: string;
  reason?: string;
}

export interface NazeBuildRun {
  id: string;
  status: "queued" | "in_progress" | "success" | "failure";
  conclusion?: string;
  htmlUrl: string;
}
