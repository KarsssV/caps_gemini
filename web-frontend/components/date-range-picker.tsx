"use client";

import { useState, useRef, useEffect } from "react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  label?: string;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label = "Date Range",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(new Date(2024, 3)); // April 2024
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

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${displayMonth.getFullYear()}-${String(displayMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (!startDate || (startDate && endDate)) {
      onStartDateChange(dateStr);
      onEndDateChange("");
    } else if (dateStr < startDate) {
      onStartDateChange(dateStr);
      onEndDateChange("");
    } else {
      onEndDateChange(dateStr);
    }
  };

  const isDateInRange = (day: number) => {
    if (!startDate) return false;
    const dateStr = `${displayMonth.getFullYear()}-${String(displayMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    
    if (!endDate) return dateStr === startDate;
    return dateStr >= startDate && dateStr <= endDate;
  };

  const isDateStart = (day: number) => {
    if (!startDate) return false;
    const dateStr = `${displayMonth.getFullYear()}-${String(displayMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dateStr === startDate;
  };

  const isDateEnd = (day: number) => {
    if (!endDate) return false;
    const dateStr = `${displayMonth.getFullYear()}-${String(displayMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dateStr === endDate;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];


  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handlePrevMonth = () => {
    setDisplayMonth(new Date(year, month - 1));
  };

  const handleNextMonth = () => {
    setDisplayMonth(new Date(year, month + 1));
  };

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 w-full min-w-72 rounded-sm border border-[#2f8e4c] bg-[#0f4b2b]/60 px-4 py-2 text-left text-sm text-white outline-none focus:border-[#e2c15d] focus:bg-[#0f4b2b]/80"
      >
        <div className="flex items-center justify-between">
          <span>
            {startDate && endDate
              ? `${formatDate(startDate)} - ${formatDate(endDate)}`
              : startDate
                ? formatDate(startDate)
                : label}
          </span>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </button>


      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 rounded-lg border border-[#2f8e4c]/60 bg-[#0f4b2b] p-6 shadow-[0_18px_42px_rgba(0,0,0,0.5)] w-96">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="text-white/70 hover:text-white text-xl"
            >
              ←
            </button>
            <h3 className="text-sm font-semibold text-white">
              {monthNames[month]} {year}
            </h3>
            <button
              type="button"
              onClick={handleNextMonth}
              className="text-white/70 hover:text-white text-xl"
            >
              →
            </button>
          </div>

          <div className="mb-4 grid grid-cols-7 gap-2 text-center text-xs text-white/70">
            {dayNames.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => day && handleDateClick(day)}
                disabled={!day}
                className={`h-8 w-8 text-sm rounded transition ${
                  !day
                    ? ""
                    : isDateStart(day) || isDateEnd(day)
                      ? "bg-[#2f8e4c] text-white font-semibold"
                      : isDateInRange(day)
                        ? "bg-[#2f8e4c]/50 text-white"
                        : "text-white/80 hover:bg-white/10"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
