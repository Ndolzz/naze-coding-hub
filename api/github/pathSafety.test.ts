import { describe, it, expect } from "vitest";
import { assertSafePath, assertSafeContentSize } from "./pathSafety";

describe("assertSafePath", () => {
  it("menerima path relatif biasa", () => {
    expect(() => assertSafePath("src/components/Button.tsx")).not.toThrow();
    expect(() => assertSafePath("README.md")).not.toThrow();
  });

  it("menolak path traversal (..)", () => {
    expect(() => assertSafePath("../secrets.env")).toThrow(/traversal/i);
    expect(() => assertSafePath("src/../../etc/passwd")).toThrow(/traversal/i);
  });

  it("menolak absolute path", () => {
    expect(() => assertSafePath("/etc/passwd")).toThrow(/absolute/i);
    expect(() => assertSafePath("C:\\Windows\\system32")).toThrow(/absolute/i);
  });

  it("menolak path kosong atau bukan string", () => {
    expect(() => assertSafePath("")).toThrow();
    expect(() => assertSafePath(undefined)).toThrow();
    expect(() => assertSafePath(123)).toThrow();
  });

  it("menolak segmen path kosong", () => {
    expect(() => assertSafePath("src//Button.tsx")).toThrow(/kosong/i);
  });

  it("menolak karakter kontrol", () => {
    expect(() => assertSafePath("src/evil\x00.ts")).toThrow();
    expect(() => assertSafePath("src/evil\x01name.ts")).toThrow(/kontrol/i);
  });

  it("menolak path yang menyentuh .git", () => {
    expect(() => assertSafePath(".git/config")).toThrow(/\.git/);
  });

  it("menolak path yang terlalu panjang", () => {
    const longPath = "a/".repeat(600) + "file.ts";
    expect(() => assertSafePath(longPath)).toThrow(/panjang/i);
  });
});

describe("assertSafeContentSize", () => {
  it("menerima konten di bawah 5MB", () => {
    expect(() => assertSafeContentSize("x".repeat(1000))).not.toThrow();
  });

  it("menolak konten di atas 5MB", () => {
    const big = "x".repeat(6 * 1024 * 1024);
    expect(() => assertSafeContentSize(big)).toThrow(/melebihi batas/i);
  });
});
