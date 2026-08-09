"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildCalendarCells,
  type DateDisplayFormat,
  formatPickerDate,
  isSameDay,
  parseIsoDate,
  toIsoDate,
} from "@/shared/utils/dateUtils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MENU_WIDTH = 280;
const MENU_HEIGHT = 320;
const MENU_GAP = 4;
const VIEWPORT_PADDING = 8;
const YEAR_RANGE = 12;

type DatePickerView = "days" | "month-year" | "years";

type DatePickerProps = Readonly<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  className?: string;
  min?: string;
  max?: string;
  /** When set, formats the trigger value using the log configuration date format. */
  displayFormat?: DateDisplayFormat;
}>;

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="ui-date-picker__icon">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function isDateDisabled(date: Date, min?: string, max?: string): boolean {
  const iso = toIsoDate(date);
  if (min && iso < min) return true;
  if (max && iso > max) return true;
  return false;
}

function getMenuPosition(trigger: HTMLElement, menuHeight: number): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const openAbove = spaceBelow < menuHeight + MENU_GAP && rect.top > spaceBelow;

  let top = openAbove ? rect.top - menuHeight - MENU_GAP : rect.bottom + MENU_GAP;
  let left = rect.left;

  if (left + MENU_WIDTH > window.innerWidth - VIEWPORT_PADDING) {
    left = window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING;
  }

  left = Math.max(VIEWPORT_PADDING, left);
  top = Math.max(VIEWPORT_PADDING, Math.min(top, window.innerHeight - menuHeight - VIEWPORT_PADDING));

  return {
    position: "fixed",
    top,
    left,
    width: MENU_WIDTH,
    zIndex: "var(--z-floating-menu)",
  };
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  required = false,
  id,
  name,
  className = "",
  min,
  max,
  displayFormat,
}: DatePickerProps) {
  const generatedId = useId();
  const pickerId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date(), []);

  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const initialView = selectedDate ?? today;

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<DatePickerView>("days");
  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());
  const [yearRangeStart, setYearRangeStart] = useState(
    Math.floor(initialView.getFullYear() / YEAR_RANGE) * YEAR_RANGE
  );
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const displayValue = formatPickerDate(value, displayFormat);
  const cells = useMemo(() => buildCalendarCells(viewYear, viewMonth), [viewMonth, viewYear]);

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const measuredHeight = menuRef.current?.offsetHeight ?? MENU_HEIGHT;
    setMenuStyle(getMenuPosition(triggerRef.current, measuredHeight));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    const handleReposition = () => updateMenuPosition();

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen) return;
    const nextView = selectedDate ?? today;
    setViewYear(nextView.getFullYear());
    setViewMonth(nextView.getMonth());
    setYearRangeStart(Math.floor(nextView.getFullYear() / YEAR_RANGE) * YEAR_RANGE);
    setViewMode("days");
  }, [isOpen, selectedDate, today]);

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
  }, [isOpen, viewMode, viewMonth, viewYear, yearRangeStart, updateMenuPosition]);

  const yearOptions = useMemo(
    () => Array.from({ length: YEAR_RANGE }, (_, index) => yearRangeStart + index),
    [yearRangeStart]
  );

  const selectDate = (date: Date) => {
    if (isDateDisabled(date, min, max)) return;
    onChange(toIsoDate(date));
    setIsOpen(false);
  };

  const selectMonth = (month: number) => {
    setViewMonth(month);
    setViewMode("days");
  };

  const selectYear = (year: number) => {
    setViewYear(year);
    setViewMode("month-year");
  };

  const goToPreviousMonth = () => {
    if (viewMode === "years") {
      setYearRangeStart((start) => start - YEAR_RANGE);
      return;
    }

    if (viewMode === "month-year") {
      setViewYear((year) => year - 1);
      return;
    }

    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((year) => year - 1);
      return;
    }
    setViewMonth((month) => month - 1);
  };

  const goToNextMonth = () => {
    if (viewMode === "years") {
      setYearRangeStart((start) => start + YEAR_RANGE);
      return;
    }

    if (viewMode === "month-year") {
      setViewYear((year) => year + 1);
      return;
    }

    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((year) => year + 1);
      return;
    }
    setViewMonth((month) => month + 1);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen((open) => !open);
    }
  };

  const menu = isOpen ? (
    <div
      ref={menuRef}
      className="ui-date-picker__menu ui-date-picker__menu--floating"
      style={menuStyle}
      role="dialog"
      aria-label="Choose date"
    >
      <div className="ui-date-picker__header">
        <button
          type="button"
          className="ui-date-picker__nav"
          aria-label={
            viewMode === "years"
              ? "Previous years"
              : viewMode === "month-year"
                ? "Previous year"
                : "Previous month"
          }
          onClick={goToPreviousMonth}
        >
          <ChevronLeftIcon />
        </button>

        {viewMode === "days" ? (
          <button
            type="button"
            className="ui-date-picker__month"
            onClick={() => setViewMode("month-year")}
          >
            {MONTHS[viewMonth]} {viewYear}
          </button>
        ) : null}

        {viewMode === "month-year" ? (
          <button
            type="button"
            className="ui-date-picker__month"
            onClick={() => setViewMode("years")}
          >
            {viewYear}
          </button>
        ) : null}

        {viewMode === "years" ? (
          <span className="ui-date-picker__month">
            {yearRangeStart} – {yearRangeStart + YEAR_RANGE - 1}
          </span>
        ) : null}

        <button
          type="button"
          className="ui-date-picker__nav"
          aria-label={
            viewMode === "years" ? "Next years" : viewMode === "month-year" ? "Next year" : "Next month"
          }
          onClick={goToNextMonth}
        >
          <ChevronRightIcon />
        </button>
      </div>

      {viewMode === "days" ? (
        <>
          <div className="ui-date-picker__weekdays" aria-hidden="true">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className="ui-date-picker__weekday">
                {weekday}
              </span>
            ))}
          </div>

          <div className="ui-date-picker__grid">
            {cells.map((cell) => {
              const iso = toIsoDate(cell.date);
              const isSelected = selectedDate ? isSameDay(cell.date, selectedDate) : false;
              const isToday = isSameDay(cell.date, today);
              const isDisabled = isDateDisabled(cell.date, min, max);

              return (
                <button
                  key={iso}
                  type="button"
                  className={[
                    "ui-date-picker__day",
                    !cell.inMonth ? "is-outside" : "",
                    isToday ? "is-today" : "",
                    isSelected ? "is-selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={isDisabled}
                  aria-label={iso}
                  aria-pressed={isSelected}
                  onClick={() => selectDate(cell.date)}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      {viewMode === "month-year" ? (
        <div className="ui-date-picker__month-grid">
          {MONTHS.map((month, index) => (
            <button
              key={month}
              type="button"
              className={[
                "ui-date-picker__month-option",
                index === viewMonth ? "is-selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => selectMonth(index)}
            >
              {month.slice(0, 3)}
            </button>
          ))}
        </div>
      ) : null}

      {viewMode === "years" ? (
        <div className="ui-date-picker__year-grid">
          {yearOptions.map((year) => (
            <button
              key={year}
              type="button"
              className={[
                "ui-date-picker__year-option",
                year === viewYear ? "is-selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => selectYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
      ) : null}

      <div className="ui-date-picker__footer">
        {viewMode !== "days" ? (
          <button
            type="button"
            className="ui-date-picker__action ui-date-picker__action--muted"
            onClick={() => setViewMode("days")}
          >
            Back
          </button>
        ) : (
          <button type="button" className="ui-date-picker__action" onClick={() => selectDate(today)}>
            Today
          </button>
        )}
        <button
          type="button"
          className="ui-date-picker__action ui-date-picker__action--muted"
          onClick={() => {
            onChange("");
            setIsOpen(false);
          }}
        >
          Clear
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={rootRef}
      className={["ui-date-picker", isOpen ? "is-open" : "", className].filter(Boolean).join(" ")}
    >
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}

      <button
        ref={triggerRef}
        id={pickerId}
        type="button"
        className="ui-date-picker__trigger"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={`ui-date-picker__value${displayValue ? "" : " is-placeholder"}`}>
          {displayValue || placeholder}
        </span>
        <CalendarIcon />
      </button>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
