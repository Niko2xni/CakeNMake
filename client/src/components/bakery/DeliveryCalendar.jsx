import React, { useState } from 'react';
import { addDays, addMonths, subMonths, format, isSameDay, startOfToday, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, isAfter, isSameMonth } from 'date-fns';
import { CalendarDays, Info, ChevronLeft, ChevronRight } from 'lucide-react';

function calcComplexityDays(config) {
  const { layers = 1, toppings = [], placedItems = [] } = config;
  let days = layers; // 1–3 base days
  days += Math.ceil(toppings.length / 2);
  days += Math.ceil((placedItems || []).length / 3);
  return Math.max(1, Math.min(7, days)); // clamp 1–7
}

export default function DeliveryCalendar({ config, selectedDate, onSelect }) {
  const complexityDays = calcComplexityDays(config);
  const prepDays = 3;
  const totalBuffer = complexityDays + prepDays;

  const today = startOfToday();
  const earliest = addDays(today, totalBuffer);
  const maxDate = addMonths(today, 4); // 4 months in advance

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(earliest));

  const goToPreviousMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    // Don't allow going before the earliest month
    if (!isBefore(newMonth, startOfMonth(earliest))) {
      setCurrentMonth(newMonth);
    }
  };

  const goToNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    // Don't allow going beyond 4 months in advance
    if (!isAfter(newMonth, startOfMonth(maxDate))) {
      setCurrentMonth(newMonth);
    }
  };

  // Generate all days for the current month with padding for complete weeks
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = addDays(monthStart, -monthStart.getDay()); // Start from Sunday of first week
  const calendarEnd = addDays(monthEnd, 6 - monthEnd.getDay()); // End on Saturday of last week

  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group into weeks
  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  return (
    <div>
      <p className="font-heading font-bold text-base mb-1">Choose day of delivery</p>
      <p className="text-xs text-muted-foreground mb-4">
        Time, transportation, and full-payment will be discussed with the bakery.
      </p>

      <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5 mb-4">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/70">
          Your cake requires <span className="font-semibold text-foreground">{complexityDays} day{complexityDays > 1 ? 's' : ''}</span> to bake + <span className="font-semibold text-foreground">3 days</span> preparation &amp; payment. Earliest delivery: <span className="font-semibold text-foreground">{format(earliest, 'MMM d, yyyy')}</span>.
        </p>
      </div>

      {/* Month Header with Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          disabled={isSameMonth(currentMonth, startOfMonth(earliest))}
          className="p-2 rounded-lg hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={goToNextMonth}
          disabled={isSameMonth(currentMonth, startOfMonth(maxDate))}
          className="p-2 rounded-lg hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {week.map((day) => {
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const dayOfWeek = day.getDay();
            const isSunday = dayOfWeek === 0;
            const isBeforeEarliest = isBefore(day, earliest);
            const isAfterMax = isAfter(day, maxDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDisabled = isSunday || isBeforeEarliest || isAfterMax;

            return (
              <button
                key={day.toISOString()}
                onClick={() => !isDisabled && onSelect(day)}
                disabled={isDisabled}
                className={`
                  rounded-lg py-2 text-xs font-medium transition-all
                  ${isSelected ? 'bg-primary text-primary-foreground shadow-md' : ''}
                  ${!isSelected && !isDisabled ? 'hover:bg-primary/10 text-foreground' : ''}
                  ${isDisabled ? 'text-muted-foreground/40 cursor-not-allowed' : ''}
                  ${!isCurrentMonth ? 'text-muted-foreground/60' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      ))}

      {selectedDate && (
        <p className="text-xs text-center text-primary font-semibold mt-3">
          📅 Selected: {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </p>
      )}
    </div>
  );
}