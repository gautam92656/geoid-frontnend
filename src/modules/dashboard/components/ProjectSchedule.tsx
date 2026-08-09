"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageLoader } from "@/shared/components/ui";
import type { Project } from "../types/project";
import { buildProjectScheduleEvents } from "../utils/projectScheduleUtils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type CalendarCell = {
  date: Date;
  inMonth: boolean;
};

type ProjectScheduleProps = Readonly<{
  projects: readonly Project[];
  loading?: boolean;
}>;

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCalendarCells(year: number, month: number): CalendarCell[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      inMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month, day), inMonth: true });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 35) {
    cells.push({ date: new Date(year, month + 1, nextDay), inMonth: false });
    nextDay += 1;
  }

  return cells;
}

export function ProjectSchedule({ projects, loading = false }: ProjectScheduleProps) {
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const cells = useMemo(() => buildCalendarCells(year, month), [year, month]);
  const eventsByDay = useMemo(
    () => buildProjectScheduleEvents(projects, year, month),
    [projects, year, month]
  );

  const monthLabel = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const goToToday = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  const goToPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  if (loading) {
    return <PageLoader label="Loading project schedule…" variant="section" />;
  }

  return (
    <div className="dashboard-schedule">
      <p className="dashboard-schedule__hint">
        Projects appear on their scheduled start date. Projects without a start or end date are
        not shown on the calendar.
      </p>

      <div className="dashboard-schedule__header">
        <h2 className="dashboard-schedule__month">{monthLabel}</h2>
        <div className="dashboard-schedule__nav">
          <button type="button" className="dashboard-schedule__today-btn" onClick={goToToday}>
            Today
          </button>
          <button
            type="button"
            className="dashboard-schedule__nav-btn"
            onClick={goToPrevMonth}
            aria-label="Previous month"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            className="dashboard-schedule__nav-btn"
            onClick={goToNextMonth}
            aria-label="Next month"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div className="dashboard-schedule__calendar">
        <div className="dashboard-schedule__weekdays">
          {WEEKDAYS.map((day) => (
            <span key={day} className="dashboard-schedule__weekday">
              {day}
            </span>
          ))}
        </div>

        <div className="dashboard-schedule__grid" role="grid" aria-label={`${monthLabel} schedule`}>
          {cells.map((cell) => {
            const key = dateKey(cell.date);
            const dayEvents = cell.inMonth ? (eventsByDay[key] ?? []) : [];
            const isToday = isSameDay(cell.date, today);

            return (
              <div
                key={key + (cell.inMonth ? "" : "-out")}
                role="gridcell"
                className={[
                  "dashboard-schedule__day",
                  !cell.inMonth ? "is-outside" : "",
                  isToday ? "is-today" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="dashboard-schedule__date">{cell.date.getDate()}</span>

                {cell.inMonth && dayEvents.length > 0 ? (
                  <div className="dashboard-schedule__events">
                    {dayEvents.map((event) => (
                      <Link
                        key={event.id}
                        href={event.href}
                        className="dashboard-schedule__event"
                        title={`${event.projectNo} — ${event.title}`}
                      >
                        {event.title}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
