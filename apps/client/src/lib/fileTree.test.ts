import { describe, it, expect } from "vitest";
import { buildTree, formatSize } from "./fileTree";

describe("buildTree", () => {
  it("membangun tree nested dari flat path list", () => {
    const tree = buildTree([
      { path: "README.md", size: 10 },
      { path: "src/App.tsx", size: 20 },
      { path: "src/components/Button.tsx", size: 30 }
    ]);

    expect(tree.map((n) => n.name)).toEqual(["src", "README.md"]); // folder duluan (sorted)
    const src = tree.find((n) => n.name === "src")!;
    expect(src.type).toBe("folder");
    expect(src.children.map((n) => n.name)).toEqual(["components", "App.tsx"]);
  });

  it("mengabaikan file .gitkeep (placeholder folder kosong)", () => {
    const tree = buildTree([{ path: "empty-folder/.gitkeep" }]);
    // folder tetap muncul (dari path parsing) tapi .gitkeep sendiri tidak jadi file
    const folder = tree.find((n) => n.name === "empty-folder");
    expect(folder?.children).toEqual([]);
  });

  it("mengurutkan folder sebelum file, lalu alfabetis", () => {
    const tree = buildTree([
      { path: "zebra.ts" },
      { path: "apple/index.ts" },
      { path: "banana.ts" }
    ]);
    expect(tree.map((n) => n.name)).toEqual(["apple", "banana.ts", "zebra.ts"]);
  });

  it("menyimpan size cuma di file, bukan folder", () => {
    const tree = buildTree([{ path: "src/index.ts", size: 123 }]);
    const src = tree.find((n) => n.name === "src")!;
    expect(src.size).toBeUndefined();
    expect(src.children[0].size).toBe(123);
  });
});

describe("formatSize", () => {
  it("format bytes di bawah 1KB", () => {
    expect(formatSize(500)).toBe("500 B");
  });

  it("format KB dengan 1 desimal", () => {
    expect(formatSize(2048)).toBe("2.0 KB");
  });

  it("string kosong kalau size undefined", () => {
    expect(formatSize(undefined)).toBe("");
  });
});
