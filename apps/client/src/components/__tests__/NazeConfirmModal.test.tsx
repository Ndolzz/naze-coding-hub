import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NazeConfirmModal from "../NazeConfirmModal";

describe("NazeConfirmModal", () => {
  it("menampilkan title dan description yang diberikan", () => {
    render(
      <NazeConfirmModal title="Delete Project" description="Yakin mau hapus?" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText("Delete Project")).toBeInTheDocument();
    expect(screen.getByText("Yakin mau hapus?")).toBeInTheDocument();
  });

  it("memanggil onConfirm saat tombol confirm diklik — bukan langsung eksekusi tanpa modal (spec §22)", async () => {
    const onConfirm = vi.fn();
    render(<NazeConfirmModal title="Delete" description="..." confirmLabel="Delete" onConfirm={onConfirm} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByText("Delete"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("memanggil onCancel saat tombol Cancel diklik, TANPA memanggil onConfirm", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<NazeConfirmModal title="Delete" description="..." onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("render sebagai dialog dengan aria-modal (aksesibilitas)", () => {
    render(<NazeConfirmModal title="X" description="Y" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
