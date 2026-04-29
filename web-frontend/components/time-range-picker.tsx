"use client";

import { useState, useRef, useEffect } from "react";

interface TimeRangePickerProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  label?: string;
}

const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${period}`;
});

export default function TimeRangePicker({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  label = "Time Range",
}: TimeRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const displayValue =
    startTime && endTime ? `${startTime} - ${endTime}` : startTime ? startTime : label;

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="h-10 w-full min-w-72 rounded-sm border border-white/30 bg-[#0f4b2b]/60 px-4 py-2 text-left text-sm text-white outline-none focus:border-[#e2c15d] focus:bg-[#0f4b2b]/80"
      >
        <div className="flex items-center justify-between">
          <span>{displayValue}</span>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-md rounded-lg border border-[#2f8e4c]/60 bg-[#0f4b2b] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.5)]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/70">Start Time</p>
              <div className="max-h-64 overflow-y-auto rounded-md border border-white/15 bg-black/10">
                {timeOptions.map((time) => (
                  <button
                    key={`start-${time}`}
                    type="button"
                    onClick={() => onStartTimeChange(time)}
                    className={`w-full px-3 py-2 text-left text-sm transition ${
                      startTime === time
                        ? "bg-[#2f8e4c] text-white font-semibold"
                        : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/70">End Time</p>
              <div className="max-h-64 overflow-y-auto rounded-md border border-white/15 bg-black/10">
                {timeOptions.map((time) => (
                  <button
                    key={`end-${time}`}
                    type="button"
                    onClick={() => onEndTimeChange(time)}
                    className={`w-full px-3 py-2 text-left text-sm transition ${
                      endTime === time
                        ? "bg-[#2f8e4c] text-white font-semibold"
                        : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-sm border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/20"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
