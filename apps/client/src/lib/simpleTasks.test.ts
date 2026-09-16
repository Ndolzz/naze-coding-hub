import { describe, it, expect } from "vitest";
import { matchSimpleTask } from "./simpleTasks";

describe("matchSimpleTask", () => {
  it("mendeteksi 'hapus file X'", () => {
    const result = matchSimpleTask("hapus file src/old.ts");
    expect(result).toEqual({ kind: "delete_file", groups: ["src/old.ts"] });
  });

  it("mendeteksi 'buat folder X'", () => {
    const result = matchSimpleTask("buat folder src/utils");
    expect(result).toEqual({ kind: "create_folder", groups: ["src/utils"] });
  });

  it("mendeteksi 'rename X jadi Y'", () => {
    const result = matchSimpleTask("rename old.ts jadi new.ts");
    expect(result).toEqual({ kind: "rename", groups: ["old.ts", "new.ts"] });
  });

  it("mendukung sinonim 'menjadi' dan 'ke' untuk rename", () => {
    expect(matchSimpleTask("rename a.ts menjadi b.ts")?.kind).toBe("rename");
    expect(matchSimpleTask("rename a.ts ke b.ts")?.kind).toBe("rename");
  });

  it("case-insensitive", () => {
    expect(matchSimpleTask("HAPUS FILE foo.ts")?.kind).toBe("delete_file");
  });

  it("mengembalikan null untuk request kompleks (harus lewat AI, bukan bypass)", () => {
    expect(matchSimpleTask("Jelaskan struktur project ini")).toBeNull();
    expect(matchSimpleTask("Buatkan halaman login dengan validasi")).toBeNull();
    expect(matchSimpleTask("Kenapa build gagal?")).toBeNull();
  });

  it("trim whitespace di kedua ujung request", () => {
    expect(matchSimpleTask("   hapus file a.ts   ")).toEqual({ kind: "delete_file", groups: ["a.ts"] });
  });
});
