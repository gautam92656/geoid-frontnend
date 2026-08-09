"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildHourOptions,
  buildMinuteOptions,
  formatTimeDisplay,
  getCurrentTimeValue,
  parseTimeValue,
  snapMinute,
  toTimeValue,
} from "@/shared/utils/timeUtils";

const MENU_WIDTH = 220;
const MENU_HEIGHT = 260;
const MENU_GAP = 4;
const VIEWPORT_PADDING = 8;
const MINUTE_STEP = 15;

type TimePickerProps = Readonly<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  className?: string;
}>;

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="ui-time-picker__icon">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
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

export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  disabled = false,
  required = false,
  id,
  name,
  className = "",
}: TimePickerProps) {
  const generatedId = useId();
  const pickerId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

  const parsedValue = useMemo(() => parseTimeValue(value), [value]);
  const hourOptions = useMemo(() => buildHourOptions(), []);
  const minuteOptions = useMemo(() => buildMinuteOptions(MINUTE_STEP), []);

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const [selectedHour, setSelectedHour] = useState(parsedValue?.hours ?? 0);
  const [selectedMinute, setSelectedMinute] = useState(parsedValue?.minutes ?? 0);

  const displayValue = formatTimeDisplay(value);

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const measuredHeight = menuRef.current?.offsetHeight ?? MENU_HEIGHT;
    setMenuStyle(getMenuPosition(triggerRef.current, measuredHeight));
  }, []);

  const scrollToSelection = useCallback(() => {
    const scrollOptionIntoView = (container: HTMLDivElement | null, selector: string) => {
      const option = container?.querySelector<HTMLButtonElement>(selector);
      option?.scrollIntoView({ block: "center" });
    };

    scrollOptionIntoView(hourListRef.current, `[data-hour="${selectedHour}"]`);
    scrollOptionIntoView(minuteListRef.current, `[data-minute="${selectedMinute}"]`);
  }, [selectedHour, selectedMinute]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const next = parsedValue ?? parseTimeValue(getCurrentTimeValue());
    const hours = next?.hours ?? 0;
    const minutes = snapMinute(next?.minutes ?? 0, MINUTE_STEP);
    setSelectedHour(hours);
    setSelectedMinute(minutes);
  }, [isOpen, parsedValue]);

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
    updateMenuPosition();
    window.setTimeout(scrollToSelection, 0);
  }, [isOpen, selectedHour, selectedMinute, scrollToSelection, updateMenuPosition]);

  const applyTime = (hours: number, minutes: number) => {
    onChange(toTimeValue(hours, minutes));
  };

  const handleHourSelect = (hour: number) => {
    setSelectedHour(hour);
    applyTime(hour, selectedMinute);
  };

  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute);
    applyTime(selectedHour, minute);
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
      className="ui-time-picker__menu ui-time-picker__menu--floating"
      style={menuStyle}
      role="dialog"
      aria-label="Choose time"
    >
      <div className="ui-time-picker__columns">
        <div className="ui-time-picker__column">
          <span className="ui-time-picker__column-label">Hour</span>
          <div ref={hourListRef} className="ui-time-picker__options ui-scrollbar">
            {hourOptions.map((hour) => (
              <button
                key={hour}
                type="button"
                data-hour={hour}
                className={[
                  "ui-time-picker__option",
                  hour === selectedHour ? "is-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleHourSelect(hour)}
              >
                {String(hour).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>

        <div className="ui-time-picker__column">
          <span className="ui-time-picker__column-label">Minute</span>
          <div ref={minuteListRef} className="ui-time-picker__options ui-scrollbar">
            {minuteOptions.map((minute) => (
              <button
                key={minute}
                type="button"
                data-minute={minute}
                className={[
                  "ui-time-picker__option",
                  minute === selectedMinute ? "is-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleMinuteSelect(minute)}
              >
                {String(minute).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ui-time-picker__footer">
        <button
          type="button"
          className="ui-time-picker__action"
          onClick={() => {
            const now = getCurrentTimeValue();
            onChange(now);
            const parsed = parseTimeValue(now);
            if (parsed) {
              setSelectedHour(parsed.hours);
              setSelectedMinute(parsed.minutes);
            }
          }}
        >
          Now
        </button>
        <button
          type="button"
          className="ui-time-picker__action ui-time-picker__action--muted"
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
      className={["ui-time-picker", isOpen ? "is-open" : "", className].filter(Boolean).join(" ")}
    >
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}

      <button
        ref={triggerRef}
        id={pickerId}
        type="button"
        className="ui-time-picker__trigger"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={`ui-time-picker__value${displayValue ? "" : " is-placeholder"}`}>
          {displayValue || placeholder}
        </span>
        <ClockIcon />
      </button>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
