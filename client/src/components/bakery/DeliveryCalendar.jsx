import React, { useState, useEffect } from 'react';
import { addDays, addMonths, subMonths, format, isSameDay, startOfToday, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, isAfter, isSameMonth } from 'date-fns';
import { CalendarDays, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { reservationApi } from '@/services/api';

export function countUsedTabs(config = {}) {
  let tabsCount = 1; // Fundamentals is always used (+1 day)

  // Side tab:
  const hasSide = Boolean(
    config.side?.mode ||
    config.sideDecorationSetId ||
    config.sideCheckeredPatternSetId ||
    config.sideTrianglePatternSetId ||
    config.sideStripedPatternSetId ||
    config.sideVictorianLambethSetId ||
    config.sideChevronPatternSetId ||
    config.sideNoNameSetId ||
    (config.side?.items && config.side.items.length > 0)
  );
  if (hasSide) tabsCount += 1;

  // Center tab:
  const hasCenter = Boolean(
    (Array.isArray(config.placedItems) && config.placedItems.length > 0) ||
    (Array.isArray(config.place?.items) && config.place.items.length > 0) ||
    (Array.isArray(config.center?.items) && config.center.items.length > 0) ||
    (config.center?.text && (config.center.text.top?.trim() || config.center.text.middle?.trim() || config.center.text.bottom?.trim())) ||
    config.centerButtercreamText
  );
  if (hasCenter) tabsCount += 1;

  // Edge tab:
  const hasEdge = Boolean(
    config.edge?.top?.piping?.tip ||
    config.edge?.bottom?.piping?.tip ||
    config.edge?.both?.piping?.tip ||
    config.edge?.middle?.piping?.tip ||
    config.edge?.top?.decorations?.setId ||
    config.edge?.bottom?.decorations?.setId ||
    config.edge?.both?.decorations?.setId ||
    config.edgeTopDesign ||
    config.edgeBottomDesign ||
    config.edgeBothDesign ||
    config.edgeMiddleDesign
  );
  if (hasEdge) tabsCount += 1;

  return tabsCount;
}

export function calcComplexityDays(config) {
  return countUsedTabs(config);
}

export default function DeliveryCalendar({ config, selectedDate, onSelect, bookedDates: externalBookedDates }) {
  const [bookedDates, setBookedDates] = useState(externalBookedDates || []);

  useEffect(() => {
    if (externalBookedDates) {
      setBookedDates(externalBookedDates);
      return;
    }
    let active = true;
    reservationApi?.getBookedDates?.().then((res) => {
      if (active && Array.isArray(res?.bookedDates)) {
        setBookedDates(res.bookedDates);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [externalBookedDates]);

  const complexityDays = calcComplexityDays(config);
  const prepDays = 3;
  const totalBuffer = complexityDays + prepDays;

  const today = startOfToday();
  const earliest = addDays(today, totalBuffer);
  let earliestDeliverable = earliest;
  while (earliestDeliverable.getDay() === 0 || earliestDeliverable.getDay() === 6) {
    earliestDeliverable = addDays(earliestDeliverable, 1);
  }
  const maxDate = addMonths(today, 4); // 4 months in advance

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(earliestDeliverable));

  const goToPreviousMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    // Don't allow going before the earliest month
    if (!isBefore(newMonth, startOfMonth(earliestDeliverable))) {
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
      <p className="font-heading font-bold text-base mb-1">Select cake needed date</p>
      <p className="text-xs text-muted-foreground mb-4">
        Choose when you need your cake ready. Fulfillment details will be coordinated in chat after checkout.
      </p>

      <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5 mb-2">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/70">
          Your custom cake requires <span className="font-semibold text-foreground">{totalBuffer} days</span> lead time. Earliest date ready: <span className="font-semibold text-foreground">{format(earliestDeliverable, 'MMM d, yyyy')}</span>.
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3 px-1">
        <span className="inline-block w-2 h-2 rounded-full bg-rose-500 shrink-0" />
        <span>Dates marked <strong className="text-rose-600 dark:text-rose-400">Booked</strong> have reached daily capacity (1 custom cake/day for quality craft).</span>
      </div>

      {/* Month Header with Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          disabled={isSameMonth(currentMonth, startOfMonth(earliestDeliverable))}
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
            const isSaturday = dayOfWeek === 6;
            const isBeforeEarliest = isBefore(day, earliest);
            const isAfterMax = isAfter(day, maxDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);

            const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
            const isBooked = bookedDates.includes(dayKey);
            const isDisabled = isSunday || isSaturday || isBeforeEarliest || isAfterMax || isBooked;

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => !isDisabled && onSelect(day)}
                disabled={isDisabled}
                title={isBooked ? 'Fully booked (1 cake per day limit)' : undefined}
                className={`
                  relative rounded-lg py-2 text-xs font-medium transition-all flex flex-col items-center justify-center min-h-[38px]
                  ${isSelected ? 'bg-primary text-primary-foreground shadow-md' : ''}
                  ${!isSelected && !isDisabled ? 'hover:bg-primary/10 text-foreground' : ''}
                  ${isBooked ? 'bg-rose-50 text-rose-300 dark:bg-rose-950/20 dark:text-rose-400/50 cursor-not-allowed line-through' : ''}
                  ${isDisabled && !isBooked ? 'text-muted-foreground/40 cursor-not-allowed' : ''}
                  ${!isCurrentMonth ? 'text-muted-foreground/60' : ''}
                `}
              >
                <span>{format(day, 'd')}</span>
                {isBooked && (
                  <span className="text-[8px] font-semibold tracking-tighter text-rose-500 block leading-none no-underline">
                    Booked
                  </span>
                )}
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
