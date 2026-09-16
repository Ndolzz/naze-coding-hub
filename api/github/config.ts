/**
 * Baca/tulis .naze/config.json — sumber kebenaran daftar project (Phase 8).
 * Disimpan di repo terpisah (NAZE_CONFIG_REPO), bukan database, sesuai
 * keputusan Phase 1. Single-user, jadi cukup satu file.
 */
import { getFile, upsertFile } from "./contents";

export interface NazeProjectEntry {
  id: string;
  name: string;
  repoFullName: string;
  defaultBranch: string;
  activeBranch?: string; // branch kerja Naze saat ini — bisa beda dari defaultBranch repo
  vercelProjectId?: string; // dipakai Preview (Phase 13) — kosong = belum terhubung ke Vercel
  createdAt: string;
}

export interface NazeConfig {
  version: number;
  projects: NazeProjectEntry[];
  settings: Record<string, unknown>;
  memory: Record<string, unknown>;
}

const CONFIG_PATH = ".naze/config.json";

function configRepo(): string {
  const repo = process.env.NAZE_CONFIG_REPO;
  if (!repo) throw new Error("NAZE_CONFIG_REPO belum dikonfigurasi di Vercel.");
  return repo;
}

export async function readConfig(): Promise<{ config: NazeConfig; sha: string }> {
  const file = await getFile(configRepo(), CONFIG_PATH);
  const content = Buffer.from(file.content, "base64").toString("utf-8");
  return { config: JSON.parse(content) as NazeConfig, sha: file.sha };
}

export async function writeConfig(config: NazeConfig, sha: string, message: string) {
  await upsertFile(configRepo(), CONFIG_PATH, JSON.stringify(config, null, 2), message, "main", sha);
}
