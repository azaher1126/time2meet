"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { format, addDays, parseISO } from "date-fns";

interface Slot {
  date: string;
  startTime: string;
  endTime: string;
}

interface AvailabilityGridProps {
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  selectedSlots: Slot[];
  onSlotsChange: (slots: Slot[]) => void;
  readOnly?: boolean;
  responses?: Array<{
    name: string;
    slots: Slot[];
  }>;
  showResults?: boolean;
}

function generateTimeSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  let [startHour, startMin] = start.split(":").map(Number);
  let [endHour, endMin] = end.split(":").map(Number);

  // Handle edge case where no time window is set (full day)
  if (start === "00:00" && end === "23:30") {
    endHour = 24;
    endMin = 0;
  }

  let currentHour = startHour;
  let currentMin = startMin;

  while (
    currentHour < endHour ||
    (currentHour === endHour && currentMin < endMin)
  ) {
    const timeStr = `${currentHour.toString().padStart(2, "0")}:${currentMin
      .toString()
      .padStart(2, "0")}`;
    slots.push(timeStr);

    currentMin += 30;
    if (currentMin >= 60) {
      currentMin = 0;
      currentHour += 1;
    }
  }

  return slots;
}

function generateDates(start: string, end: string): Date[] {
  const dates: Date[] = [];
  const startDate = parseISO(start);
  const endDate = parseISO(end);

  let current = startDate;
  while (current <= endDate) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

function getEndTime(startTime: string): string {
  const [hour, min] = startTime.split(":").map(Number);
  let newMin = min + 30;
  let newHour = hour;

  if (newMin >= 60) {
    newMin = 0;
    newHour += 1;
  }

  return `${newHour.toString().padStart(2, "0")}:${newMin
    .toString()
    .padStart(2, "0")}`;
}

function formatTime12Hour(time: string): string {
  const [hour, min] = time.split(":").map(Number);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${min.toString().padStart(2, "0")} ${ampm}`;
}

function formatTimeCompact(time: string): string {
  const [hour, min] = time.split(":").map(Number);
  const ampm = hour >= 12 ? "p" : "a";
  const hour12 = hour % 12 || 12;
  if (min === 0) {
    return `${hour12}${ampm}`;
  }
  return `${hour12}:${min.toString().padStart(2, "0")}${ampm}`;
}

export default function AvailabilityGrid({
  startDate,
  endDate,
  startTime = "09:00",
  endTime = "17:00",
  selectedSlots,
  onSlotsChange,
  readOnly = false,
  responses = [],
  showResults = false,
}: AvailabilityGridProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect">("select");
  const [hoveredSlot, setHoveredSlot] = useState<{
    date: string;
    time: string;
  } | null>(null);
  const [selectedResultSlot, setSelectedResultSlot] = useState<{
    date: string;
    time: string;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const processedSlotsRef = useRef<Set<string>>(new Set());
  const touchHandledRef = useRef(false);

  const dates = generateDates(startDate, endDate);
  const timeSlots = generateTimeSlots(startTime, endTime);

  // Detect mobile/touch device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    const checkTouch = () => {
      setIsTouchDevice(
        "ontouchstart" in window || navigator.maxTouchPoints > 0,
      );
    };
    checkMobile();
    checkTouch();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isSlotSelected = useCallback(
    (date: string, time: string) => {
      return selectedSlots.some(
        (slot) => slot.date === date && slot.startTime === time,
      );
    },
    [selectedSlots],
  );

  const getSlotAvailability = useCallback(
    (date: string, time: string) => {
      if (!showResults || responses.length === 0) return 0;

      const count = responses.filter((response) =>
        response.slots.some(
          (slot) => slot.date === date && slot.startTime === time,
        ),
      ).length;

      return count / responses.length;
    },
    [responses, showResults],
  );

  const getAvailableNames = useCallback(
    (date: string, time: string) => {
      if (!showResults || responses.length === 0) return [];

      return responses
        .filter((response) =>
          response.slots.some(
            (slot) => slot.date === date && slot.startTime === time,
          ),
        )
        .map((r) => r.name);
    },
    [responses, showResults],
  );

  const getAvailabilityCount = useCallback(
    (date: string, time: string) => {
      if (!showResults || responses.length === 0) return 0;

      return responses.filter((response) =>
        response.slots.some(
          (slot) => slot.date === date && slot.startTime === time,
        ),
      ).length;
    },
    [responses, showResults],
  );

  const toggleSlot = useCallback(
    (date: string, time: string, forceMode?: "select" | "deselect") => {
      if (readOnly) return;

      const isSelected = isSlotSelected(date, time);
      const mode = forceMode || (isSelected ? "deselect" : "select");

      if (mode === "select" && !isSelected) {
        onSlotsChange([
          ...selectedSlots,
          { date, startTime: time, endTime: getEndTime(time) },
        ]);
      } else if (mode === "deselect" && isSelected) {
        onSlotsChange(
          selectedSlots.filter(
            (slot) => !(slot.date === date && slot.startTime === time),
          ),
        );
      }
    },
    [readOnly, isSlotSelected, selectedSlots, onSlotsChange],
  );

  const handleMouseDown = (date: string, time: string) => {
    if (readOnly || showResults) return;
    // Skip if this was already handled by touch event
    if (touchHandledRef.current) {
      touchHandledRef.current = false;
      return;
    }
    setIsDragging(true);
    const isSelected = isSlotSelected(date, time);
    setDragMode(isSelected ? "deselect" : "select");
    processedSlotsRef.current = new Set([`${date}-${time}`]);
    toggleSlot(date, time);
  };

  const handleMouseEnter = (date: string, time: string) => {
    setHoveredSlot({ date, time });
    if (isDragging && !readOnly && !showResults) {
      const key = `${date}-${time}`;
      if (!processedSlotsRef.current.has(key)) {
        processedSlotsRef.current.add(key);
        toggleSlot(date, time, dragMode);
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredSlot(null);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    processedSlotsRef.current = new Set();
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      processedSlotsRef.current = new Set();
    };

    const handleGlobalTouchEnd = () => {
      setIsDragging(false);
      processedSlotsRef.current = new Set();
      // Reset touch handled flag after a short delay to allow mouse events to be blocked
      setTimeout(() => {
        touchHandledRef.current = false;
      }, 100);
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchend", handleGlobalTouchEnd);
    window.addEventListener("touchcancel", handleGlobalTouchEnd);

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchend", handleGlobalTouchEnd);
      window.removeEventListener("touchcancel", handleGlobalTouchEnd);
    };
  }, []);

  const handleTouchStart = (
    e: React.TouchEvent,
    date: string,
    time: string,
  ) => {
    if (readOnly || showResults) return;
    e.preventDefault();
    // Mark that we handled this via touch to prevent duplicate handling by mouse events
    touchHandledRef.current = true;
    setIsDragging(true);
    const isSelected = isSlotSelected(date, time);
    setDragMode(isSelected ? "deselect" : "select");
    processedSlotsRef.current = new Set([`${date}-${time}`]);
    toggleSlot(date, time);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || readOnly || showResults) return;
    e.preventDefault();

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);

    if (
      element?.hasAttribute("data-date") &&
      element?.hasAttribute("data-time")
    ) {
      const date = element.getAttribute("data-date")!;
      const time = element.getAttribute("data-time")!;
      const key = `${date}-${time}`;

      setHoveredSlot({ date, time });

      if (!processedSlotsRef.current.has(key)) {
        processedSlotsRef.current.add(key);
        toggleSlot(date, time, dragMode);
      }
    }
  };

  // Select/deselect all slots for a specific day
  const toggleDay = (dateStr: string) => {
    if (readOnly || showResults) return;

    const daySlots = timeSlots.map((time) => ({
      date: dateStr,
      startTime: time,
      endTime: getEndTime(time),
    }));

    const allSelected = daySlots.every((slot) =>
      isSlotSelected(slot.date, slot.startTime),
    );

    if (allSelected) {
      // Deselect all slots for this day
      onSlotsChange(selectedSlots.filter((slot) => slot.date !== dateStr));
    } else {
      // Select all slots for this day
      const newSlots = daySlots.filter(
        (slot) => !isSlotSelected(slot.date, slot.startTime),
      );
      onSlotsChange([...selectedSlots, ...newSlots]);
    }
  };

  // Select/deselect all slots for a specific time across all days
  const toggleTime = (time: string) => {
    if (readOnly || showResults) return;

    const timeSlotAcrossDays = dates.map((date) => ({
      date: format(date, "yyyy-MM-dd"),
      startTime: time,
      endTime: getEndTime(time),
    }));

    const allSelected = timeSlotAcrossDays.every((slot) =>
      isSlotSelected(slot.date, slot.startTime),
    );

    if (allSelected) {
      // Deselect all slots for this time
      onSlotsChange(selectedSlots.filter((slot) => slot.startTime !== time));
    } else {
      // Select all slots for this time
      const newSlots = timeSlotAcrossDays.filter(
        (slot) => !isSlotSelected(slot.date, slot.startTime),
      );
      onSlotsChange([...selectedSlots, ...newSlots]);
    }
  };

  // Calculate best time slots (where everyone is available)
  const getBestSlots = useCallback(() => {
    if (!showResults || responses.length === 0) return [];

    const bestSlots: { date: string; time: string; count: number }[] = [];

    dates.forEach((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      timeSlots.forEach((time) => {
        const count = getAvailabilityCount(dateStr, time);
        if (count === responses.length) {
          bestSlots.push({ date: dateStr, time, count });
        }
      });
    });

    return bestSlots;
  }, [dates, timeSlots, responses, showResults, getAvailabilityCount]);

  const bestSlots = getBestSlots();

  // Get the active slot (either hovered on desktop or tapped on mobile)
  const activeSlot = isTouchDevice ? selectedResultSlot : hoveredSlot;

  // Get available names for current active slot
  const currentAvailableNames = activeSlot
    ? getAvailableNames(activeSlot.date, activeSlot.time)
    : [];
  const currentAvailabilityCount = activeSlot
    ? getAvailabilityCount(activeSlot.date, activeSlot.time)
    : 0;

  return (
    <div className="w-full">
      {/* Tooltip for hovered/tapped slot in results view - min height with auto expand */}
      {showResults && responses.length > 0 && (
        <div className="mb-4 min-h-[72px]">
          {activeSlot ? (
            <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl text-sm border border-gray-200 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-gray-900">
                  {format(parseISO(activeSlot.date), "EEE, MMM d")} at{" "}
                  {formatTime12Hour(activeSlot.time)}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                      currentAvailabilityCount === responses.length
                        ? "bg-emerald-100 text-emerald-700"
                        : currentAvailabilityCount > 0
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {currentAvailabilityCount} of {responses.length} available
                  </div>
                  {isTouchDevice && selectedResultSlot && (
                    <button
                      onClick={() => setSelectedResultSlot(null)}
                      className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                      aria-label="Close"
                    >
                      <svg
                        className="w-4 h-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              {currentAvailableNames.length > 0 ? (
                <div className="mt-2 text-xs text-gray-600">
                  <span className="font-medium">Available: </span>
                  {currentAvailableNames.join(", ")}
                </div>
              ) : (
                <div className="mt-2 text-xs text-gray-400">
                  No one available at this time
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded-xl text-sm border border-gray-100 flex items-center justify-center text-gray-400 min-h-[72px]">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
              {isTouchDevice
                ? "Tap a time slot to see details"
                : "Hover over a time slot to see availability details"}
            </div>
          )}
        </div>
      )}

      {/* Best times indicator */}
      {showResults && bestSlots.length > 0 && (
        <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-semibold text-emerald-800">
              {bestSlots.length} time slot{bestSlots.length !== 1 ? "s" : ""}{" "}
              where everyone is available!
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {bestSlots.slice(0, 6).map((slot) => (
              <span
                key={`${slot.date}-${slot.time}`}
                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-emerald-200 text-emerald-700"
              >
                {format(parseISO(slot.date), "EEE, MMM d")} @{" "}
                {formatTime12Hour(slot.time)}
              </span>
            ))}
            {bestSlots.length > 6 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700">
                +{bestSlots.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
        <div
          ref={gridRef}
          className="min-w-fit select-none touch-none"
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            handleMouseUp();
            handleMouseLeave();
          }}
          onTouchEnd={handleMouseUp}
          onTouchMove={handleTouchMove}
        >
          {/* Header row with dates */}
          <div className="flex sticky top-0 bg-gray-50 z-10 pb-2">
            <div className="w-16 sm:w-20 flex-shrink-0" />
            {dates.map((date) => {
              const dateStr = format(date, "yyyy-MM-dd");
              const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;
              return (
                <div
                  key={date.toISOString()}
                  className={`flex-1 min-w-[44px] sm:min-w-[64px] text-center px-0.5 ${
                    !readOnly && !showResults
                      ? "cursor-pointer hover:bg-gray-100 rounded-lg py-1 -my-1 transition-colors"
                      : ""
                  }`}
                  onClick={() => !showResults && toggleDay(dateStr)}
                  title={
                    !readOnly && !showResults
                      ? "Click to select/deselect entire day"
                      : undefined
                  }
                >
                  <div
                    className={`text-[10px] sm:text-xs font-semibold uppercase ${
                      isToday ? "text-indigo-600" : "text-gray-700"
                    }`}
                  >
                    {format(date, "EEE")}
                  </div>
                  <div
                    className={`text-[10px] sm:text-xs ${
                      isToday
                        ? "bg-indigo-600 text-white rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center mx-auto font-medium"
                        : "text-gray-500"
                    }`}
                  >
                    {format(date, "d")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time slots grid */}
          <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
            {timeSlots.map((time, timeIndex) => (
              <div key={time} className="flex border-b last:border-b-0">
                <div
                  className={`w-16 sm:w-20 flex-shrink-0 text-[9px] sm:text-xs text-gray-500 pr-1 sm:pr-2 py-1 sm:py-1.5 text-right bg-gray-50 border-r flex items-center justify-end ${
                    !readOnly && !showResults
                      ? "cursor-pointer hover:bg-gray-100 transition-colors"
                      : ""
                  }`}
                  onClick={() => !showResults && toggleTime(time)}
                  title={
                    !readOnly && !showResults
                      ? "Click to select/deselect entire row"
                      : undefined
                  }
                >
                  {isMobile ? formatTimeCompact(time) : formatTime12Hour(time)}
                </div>
                {dates.map((date) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  const isSelected = isSlotSelected(dateStr, time);
                  const availability = getSlotAvailability(dateStr, time);
                  const isHovered =
                    hoveredSlot?.date === dateStr && hoveredSlot?.time === time;
                  const isSelectedResult =
                    selectedResultSlot?.date === dateStr &&
                    selectedResultSlot?.time === time;
                  const isBestSlot =
                    showResults && availability === 1 && responses.length > 0;

                  let bgColor = "bg-white";
                  let hoverClass =
                    !readOnly && !showResults ? "hover:bg-indigo-100" : "";

                  if (showResults && responses.length > 0) {
                    if (availability === 1) {
                      bgColor = "bg-emerald-500";
                    } else if (availability >= 0.75) {
                      bgColor = "bg-emerald-400";
                    } else if (availability >= 0.5) {
                      bgColor = "bg-emerald-300";
                    } else if (availability >= 0.25) {
                      bgColor = "bg-emerald-200";
                    } else if (availability > 0) {
                      bgColor = "bg-emerald-100";
                    }
                    hoverClass =
                      "hover:ring-2 hover:ring-inset hover:ring-gray-400";
                  } else if (isSelected) {
                    bgColor = "bg-indigo-500";
                  }

                  // Handle click/tap on results view for touch devices
                  const handleResultsTap = () => {
                    if (showResults && isTouchDevice) {
                      if (isSelectedResult) {
                        setSelectedResultSlot(null);
                      } else {
                        setSelectedResultSlot({ date: dateStr, time });
                      }
                    }
                  };

                  return (
                    <div
                      key={`${dateStr}-${time}`}
                      data-date={dateStr}
                      data-time={time}
                      className={`flex-1 min-w-[44px] sm:min-w-[64px] h-6 sm:h-8 border-r last:border-r-0 cursor-pointer transition-all duration-75 ${bgColor} ${hoverClass} ${
                        !readOnly && !showResults ? "active:bg-indigo-400" : ""
                      } ${(isHovered || isSelectedResult) && showResults ? "ring-2 ring-inset ring-gray-500" : ""} ${
                        isBestSlot && !isSelectedResult
                          ? "ring-1 ring-inset ring-emerald-600"
                          : ""
                      }`}
                      onMouseDown={() => handleMouseDown(dateStr, time)}
                      onMouseEnter={() => handleMouseEnter(dateStr, time)}
                      onTouchStart={(e) => handleTouchStart(e, dateStr, time)}
                      onClick={() => handleResultsTap()}
                      role="button"
                      aria-label={`${format(date, "EEEE, MMMM d")} at ${formatTime12Hour(time)}${
                        showResults
                          ? `, ${getAvailabilityCount(dateStr, time)} of ${responses.length} available`
                          : isSelected
                            ? ", selected"
                            : ", not selected"
                      }`}
                      aria-pressed={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (showResults) {
                            handleResultsTap();
                          } else {
                            toggleSlot(dateStr, time);
                          }
                        }
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend for results view */}
          {showResults && responses.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <span className="font-medium">Availability:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded border border-gray-300" />
                <span>None</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-emerald-200 rounded" />
                <span>Some</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-emerald-500 rounded ring-1 ring-emerald-600" />
                <span>All</span>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500 font-medium">
                {responses.length} response{responses.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Selection summary */}
          {!showResults && !readOnly && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              {selectedSlots.length > 0 ? (
                <div className="flex-1 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      <span className="font-semibold">
                        {selectedSlots.length}
                      </span>{" "}
                      time slot{selectedSlots.length !== 1 ? "s" : ""} selected
                    </span>
                  </div>
                  <button
                    onClick={() => onSlotsChange([])}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Clear
                  </button>
                </div>
              ) : (
                <div className="flex-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Click or drag to select your available times</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
