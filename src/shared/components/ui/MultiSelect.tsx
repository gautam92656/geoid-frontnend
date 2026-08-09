"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Checkbox } from "./Checkbox";
import type { SelectOption } from "./Select";

type MultiSelectProps = Readonly<{
  value: string[];
  onChange: (value: string[]) => void;
  options: readonly SelectOption[] | readonly string[];
  placeholder?: string;
  search?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  floatingMenu?: boolean;
}>;

const MENU_GAP = 4;
const MENU_ESTIMATED_HEIGHT = 120;
const MENU_MAX_HEIGHT = 280;
const VIEWPORT_PADDING = 8;

function getFloatingMenuPosition(trigger: HTMLElement, menuHeight: number): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const openAbove = spaceBelow < menuHeight + MENU_GAP && rect.top > spaceBelow;

  let top = openAbove ? rect.top - menuHeight - MENU_GAP : rect.bottom + MENU_GAP;
  let left = rect.left;
  const width = rect.width;

  if (left + width > window.innerWidth - VIEWPORT_PADDING) {
    left = window.innerWidth - width - VIEWPORT_PADDING;
  }

  left = Math.max(VIEWPORT_PADDING, left);
  top = Math.max(VIEWPORT_PADDING, Math.min(top, window.innerHeight - menuHeight - VIEWPORT_PADDING));

  return {
    position: "fixed",
    top,
    left,
    width,
    zIndex: "var(--z-floating-menu)",
  };
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="ui-select__chevron">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function normalizeOptions(options: readonly SelectOption[] | readonly string[]): SelectOption[] {
  return options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );
}

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = "Select options",
  search = false,
  searchPlaceholder = "Search…",
  disabled = false,
  id,
  className = "",
  floatingMenu = true,
}: MultiSelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);

  const filteredOptions = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!search || !trimmedQuery) return normalizedOptions;

    return normalizedOptions.filter((option) =>
      option.label.toLowerCase().includes(trimmedQuery)
    );
  }, [normalizedOptions, query, search]);

  const selectedLabels = useMemo(() => {
    const labelByValue = new Map(normalizedOptions.map((option) => [option.value, option.label]));
    return value.map((item) => labelByValue.get(item) ?? item);
  }, [normalizedOptions, value]);

  const displayValue = selectedLabels.length > 0 ? selectedLabels.join(", ") : placeholder;
  const hasSelection = selectedLabels.length > 0;

  const updateMenuPosition = useCallback(() => {
    if (!floatingMenu || !triggerRef.current) return;

    const measuredHeight = Math.min(
      menuRef.current?.offsetHeight ?? MENU_ESTIMATED_HEIGHT,
      MENU_MAX_HEIGHT
    );
    setMenuStyle(getFloatingMenuPosition(triggerRef.current, measuredHeight));
  }, [floatingMenu]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    const handleReposition = () => updateMenuPosition();

    if (floatingMenu) {
      updateMenuPosition();
      window.addEventListener("resize", handleReposition);
      window.addEventListener("scroll", handleReposition, true);
    }

    if (search) {
      window.setTimeout(() => searchRef.current?.focus(), 0);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [floatingMenu, isOpen, search, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen || !floatingMenu) return;
    updateMenuPosition();
  }, [filteredOptions.length, floatingMenu, isOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  const toggleOption = (optionValue: string) => {
    onChange(
      value.includes(optionValue)
        ? value.filter((item) => item !== optionValue)
        : [...value, optionValue]
    );
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen((open) => !open);
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const menu = isOpen ? (
    <div
      ref={menuRef}
      className={[
        "ui-select__menu",
        floatingMenu ? "ui-select__menu--floating" : "",
        search ? "ui-select__menu--searchable" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={floatingMenu ? menuStyle : undefined}
      role="listbox"
      aria-labelledby={selectId}
      aria-multiselectable="true"
    >
      {search ? (
        <div className="ui-select__search">
          <SearchIcon />
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder={searchPlaceholder}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={searchPlaceholder}
          />
        </div>
      ) : null}

      <div className="ui-select__options ui-scrollbar">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option) => {
            const isSelected = value.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={[
                  "ui-select__option",
                  "ui-select__option--multi",
                  isSelected ? "is-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => toggleOption(option.value)}
              >
                <Checkbox checked={isSelected} readOnly tabIndex={-1} aria-hidden="true" />
                <span>{option.label}</span>
              </button>
            );
          })
        ) : (
          <div className="ui-select__empty">No options found.</div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={rootRef}
      className={["ui-select", isOpen ? "is-open" : "", className].filter(Boolean).join(" ")}
    >
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        className="ui-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={`ui-select__value${hasSelection ? "" : " is-placeholder"}`}>
          {displayValue}
        </span>
        <ChevronDownIcon />
      </button>

      {floatingMenu
        ? mounted && menu
          ? createPortal(menu, document.body)
          : null
        : menu}
    </div>
  );
}
