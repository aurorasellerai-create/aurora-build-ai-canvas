import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { PasswordInput } from "./password-input";

describe("PasswordInput", () => {
  it("renders an input that defaults to type='password'", () => {
    render(<PasswordInput placeholder="Senha" />);
    const input = screen.getByPlaceholderText("Senha") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe("password");
  });

  it("renders a toggle button with PT-BR aria-label 'Mostrar senha' by default", () => {
    render(<PasswordInput placeholder="Senha" />);
    const toggle = screen.getByRole("button", { name: "Mostrar senha" });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("type", "button");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles to type='text' on click and updates aria-label + aria-pressed", () => {
    render(<PasswordInput placeholder="Senha" />);
    const input = screen.getByPlaceholderText("Senha") as HTMLInputElement;
    const toggle = screen.getByRole("button", { name: "Mostrar senha" });

    fireEvent.click(toggle);

    expect(input.type).toBe("text");
    const toggleAfter = screen.getByRole("button", { name: "Ocultar senha" });
    expect(toggleAfter).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(toggleAfter);
    expect(input.type).toBe("password");
    expect(screen.getByRole("button", { name: "Mostrar senha" })).toHaveAttribute("aria-pressed", "false");
  });

  it("toggle is focusable via TAB (tabIndex=0) and not -1", () => {
    render(<PasswordInput placeholder="Senha" />);
    const toggle = screen.getByRole("button", { name: "Mostrar senha" });
    expect(toggle.getAttribute("tabindex")).not.toBe("-1");
    toggle.focus();
    expect(document.activeElement).toBe(toggle);
  });

  it("activates toggle via keyboard (Enter / Space) when focused", () => {
    render(<PasswordInput placeholder="Senha" />);
    const input = screen.getByPlaceholderText("Senha") as HTMLInputElement;
    const toggle = screen.getByRole("button", { name: "Mostrar senha" });

    toggle.focus();
    // Native <button> activates on Enter and Space via click event
    fireEvent.click(toggle);
    expect(input.type).toBe("text");
  });

  it("forwards autoComplete prop (critical for password managers)", () => {
    render(<PasswordInput placeholder="Senha" autoComplete="new-password" />);
    const input = screen.getByPlaceholderText("Senha");
    expect(input).toHaveAttribute("autocomplete", "new-password");
  });

  it("defaults autoComplete to 'current-password' when not provided", () => {
    render(<PasswordInput placeholder="Senha" />);
    expect(screen.getByPlaceholderText("Senha")).toHaveAttribute("autocomplete", "current-password");
  });

  it("forwards name and id (needed for form/PM association)", () => {
    render(<PasswordInput placeholder="Senha" id="pw" name="password" />);
    const input = screen.getByPlaceholderText("Senha");
    expect(input).toHaveAttribute("id", "pw");
    expect(input).toHaveAttribute("name", "password");
  });

  it("forwards ref to the underlying input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<PasswordInput placeholder="Senha" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe("password");
  });

  it("preserves DOM node identity across toggle (no remount → PM session intact)", () => {
    render(<PasswordInput placeholder="Senha" />);
    const inputBefore = screen.getByPlaceholderText("Senha");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    const inputAfter = screen.getByPlaceholderText("Senha");
    expect(inputAfter).toBe(inputBefore);
  });

  it("calls onChange and preserves value when typing", () => {
    const handleChange = vi.fn();
    render(<PasswordInput placeholder="Senha" onChange={handleChange} />);
    const input = screen.getByPlaceholderText("Senha") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "secret123" } });
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(input.value).toBe("secret123");
  });

  it("toggle button does not submit the surrounding form", () => {
    const handleSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={handleSubmit}>
        <PasswordInput placeholder="Senha" />
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(handleSubmit).not.toHaveBeenCalled();
  });
});
