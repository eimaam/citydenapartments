import { useMemo, useRef, useEffect } from 'react';
import { format, isSameDay, isPast, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Clock, CalendarCheck, Check, User } from 'lucide-react';
import { BookingStatus } from '../../types';

function parseDateIgnoreTimezone(dateStr: string): Date {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const day = parseInt(match[3], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

interface CalendarRoom {
  _id: string;
  roomNumber: string;
  roomTypeId?: { _id: string; name: string };
}

interface CalendarBooking {
  _id: string;
  roomId: { _id: string; roomNumber: string };
  guestDetails: { name: string };
  checkInDate: string;
  checkOutDate: string;
  bookingStatus: string;
}

interface BookingCalendarProps {
  year: number;
  month: number;
  rooms: CalendarRoom[];
  bookings: CalendarBooking[];
  selectedDate: Date;
  searchQuery?: string;
  onCellClick?: (date: Date, room: CalendarRoom, booking?: CalendarBooking) => void;
  onSelectDate?: (date: Date) => void;
}

// Curated colors matching the screenshot:
// IN: olive green/brown, CONFIRMED: gold/yellow, OUT: grey
const STATUS_COLORS: Record<string, string> = {
  [BookingStatus.Reserved]: '#e0ba4d',    // gold
  [BookingStatus.Confirmed]: '#e0ba4d',   // gold
  [BookingStatus.Checked_In]: '#5c4c23',  // olive brown
  [BookingStatus.Checked_Out]: '#a6a6a6', // neutral grey
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  [BookingStatus.Reserved]: Clock,
  [BookingStatus.Confirmed]: CalendarCheck,
  [BookingStatus.Checked_In]: Check,
  [BookingStatus.Checked_Out]: User,
};

export function BookingCalendar({
  year, month, rooms, bookings,
  selectedDate, searchQuery = '',
  onCellClick, onSelectDate,
}: BookingCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Use exactly the days of the current month
  const days = useMemo(() => {
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(monthStart);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [year, month]);

  const roomRowIndex = (ri: number) => ri + 2;
  const colForDay = (day: Date) => {
    const idx = days.findIndex(d => isSameDay(d, day));
    return idx !== -1 ? idx + 2 : null;
  };

  const dayCount = days.length;
  const roomColWidth = 180;
  const dayColMinWidth = 60;
  const rowHeight = 68;

  // Auto-scroll to center the selected date when it, year, or month changes
  useEffect(() => {
    if (!selectedDate || !containerRef.current) return;
    const targetId = `day-header-${format(selectedDate, 'yyyy-MM-dd')}`;
    const targetElement = containerRef.current.querySelector(`#${targetId}`);
    if (targetElement) {
      const container = containerRef.current;
      const element = targetElement as HTMLElement;
      
      const containerWidth = container.clientWidth;
      const elementLeft = element.offsetLeft;
      const elementWidth = element.clientWidth;
      
      // Center the element relative to scrollable area (excluding rooms column)
      const scrollTarget = elementLeft - (containerWidth - roomColWidth) / 2 - roomColWidth / 2;
      
      container.scrollTo({
        left: Math.max(0, scrollTarget),
        behavior: 'smooth',
      });
    }
  }, [selectedDate, year, month]);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Timeline Grid Container ── */}
      <div
        ref={containerRef}
        className="overflow-auto border border-outline-variant/60 rounded-xl bg-surface-container-lowest shadow-sm"
        style={{ maxHeight: 'calc(100vh - 270px)' }}
      >
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: `${roomColWidth}px repeat(${dayCount}, minmax(${dayColMinWidth}px, 1fr))`,
            gridAutoRows: `${rowHeight}px`,
            minWidth: roomColWidth + dayCount * dayColMinWidth,
          }}
        >
          {/* ── Top-Left Header Box ── */}
          <div
            className="sticky top-0 left-0 z-30 bg-surface-container border-r border-b border-outline-variant/70 px-4 text-[10px] uppercase tracking-wider text-outline font-bold flex items-center shadow-[2px_2px_5px_rgba(0,0,0,0.02)]"
            style={{ gridRow: 1, gridColumn: 1 }}
          >
            Room
          </div>

          {/* ── Day Headers Row ── */}
          {days.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDay = isSameDay(day, new Date());
            
            return (
              <div
                key={day.toISOString()}
                id={`day-header-${format(day, 'yyyy-MM-dd')}`}
                onClick={() => onSelectDate?.(day)}
                className={`sticky top-0 z-20 border-b border-outline-variant/70 px-1 py-2 text-center font-medium text-[10px] transition-all cursor-pointer flex flex-col justify-center select-none ${
                  isSelected
                    ? 'bg-[#5c4c23]/10 text-[#5c4c23]'
                    : isTodayDay
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface-container text-outline hover:bg-surface-container-high'
                }`}
                style={{ gridRow: 1, gridColumn: colForDay(day)! }}
              >
                <div className="uppercase tracking-wider font-semibold text-[9px] opacity-80">{format(day, 'EEE')}</div>
                <div className={`text-sm mt-0.5 ${isSelected || isTodayDay ? 'font-bold' : 'font-medium'}`}>{format(day, 'd')}</div>
                
                {/* Gold pin indicator for selected day */}
                {isSelected && (
                  <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 flex flex-col items-center z-40">
                    <span className="w-2 h-2 rounded-full bg-[#5c4c23] border border-white" />
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Room rows ── */}
          {rooms.flatMap((room, ri) => {
            const row = roomRowIndex(ri);
            const roomBookings = bookings.filter(b => b.roomId._id === room._id);
            const cells: React.ReactNode[] = [];

            // 1. Room label cell
            cells.push(
              <div
                key={`room-${room._id}`}
                className="sticky left-0 z-10 bg-surface-container-lowest border-r border-b border-outline-variant/70 px-4 flex flex-col justify-center shadow-[2px_0_5px_rgba(0,0,0,0.02)]"
                style={{ gridRow: row, gridColumn: 1 }}
              >
                <div className="font-bold text-xs text-on-surface leading-tight">{room.roomNumber}</div>
                {room.roomTypeId && (
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-primary mt-0.5">
                    {room.roomTypeId.name}
                  </div>
                )}
              </div>
            );

            // 2. Background cells for days
            days.forEach((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const dayPast = isPast(day) && !isSameDay(day, new Date());
              
              cells.push(
                <div
                  key={`bg-${room._id}-${day.toISOString()}`}
                  onClick={() => !dayPast && onCellClick?.(day, room)}
                  className={`border-r border-b border-outline-variant/30 transition-colors ${
                    dayPast ? 'bg-surface-container-low/10 cursor-default' : 'hover:bg-surface-container/30 cursor-pointer'
                  } ${
                    isSelected ? 'bg-[#5c4c23]/[0.03] border-l border-r border-[#5c4c23]/25' : ''
                  }`}
                  style={{ gridRow: row, gridColumn: colForDay(day)! }}
                />
              );
            });

            // 3. Booking capsules
            roomBookings.forEach((booking) => {
              const checkIn = parseDateIgnoreTimezone(booking.checkInDate);
              const checkOut = parseDateIgnoreTimezone(booking.checkOutDate);
              const startCol = colForDay(checkIn) ?? 2;
              const endCol = colForDay(checkOut);

              const startsBefore = !colForDay(checkIn);
              const endsAfter = !endCol;
              const color = STATUS_COLORS[booking.bookingStatus] || '#a6a6a6';
              const StatusIcon = STATUS_ICONS[booking.bookingStatus] || Clock;
              const isCheckedIn = booking.bookingStatus === BookingStatus.Checked_In;
              const isCheckedOut = booking.bookingStatus === BookingStatus.Checked_Out;

              // Check client-side search query
              const matchesSearch = !searchQuery || 
                booking.guestDetails.name.toLowerCase().includes(searchQuery.toLowerCase());

              // Dynamic label to match the screenshot (Lady Alakija (IN))
              let guestLabel = booking.guestDetails.name;
              if (isCheckedIn) guestLabel += ' (IN)';
              else if (isCheckedOut) guestLabel += ' (OUT)';

              cells.push(
                <div
                  key={`bk-${booking._id}`}
                  onClick={() => onCellClick?.(checkIn, room, booking)}
                  className={`relative cursor-pointer group select-none transition-all duration-200 hover:z-40 ${
                    matchesSearch ? 'opacity-100 scale-100 z-10' : 'opacity-20 scale-[0.98] z-0 hover:opacity-50'
                  }`}
                  style={{
                    gridRow: row,
                    gridColumn: `${startCol} / ${endCol ? endCol : dayCount + 2}`,
                  }}
                >
                  <div className="absolute inset-y-[10px] inset-x-[4px] flex items-center pointer-events-none">
                    <div
                      className="flex-1 flex items-center gap-2 h-full px-3 rounded-lg border border-white/20 shadow-sm transition-all duration-200 group-hover:brightness-105 group-hover:shadow-md"
                      style={{ background: color }}
                    >
                      {startsBefore && <span className="text-[10px] text-white/50 shrink-0 mr-0.5">◀</span>}
                      
                      <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center shrink-0">
                        <StatusIcon size={11} className="text-white" strokeWidth={3} />
                      </div>
                      
                      <span className="text-xs font-bold text-white truncate leading-tight tracking-wide">
                        {guestLabel}
                      </span>

                      {endsAfter && <span className="text-[10px] text-white/50 shrink-0 ml-auto">▶</span>}
                    </div>
                  </div>

                  {/* Premium Hover Card */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover:block pointer-events-none">
                    <div className="bg-[#1e1e2e] text-white text-[11px] rounded-lg px-4 py-3 shadow-xl whitespace-nowrap border border-white/10">
                      <div className="font-bold text-sm">{booking.guestDetails.name}</div>
                      <div className="text-white/60 mt-0.5 flex items-center gap-1">
                        <span>Room {booking.roomId.roomNumber}</span>
                        <span>•</span>
                        <span className="uppercase tracking-wider text-[9px] font-semibold text-primary">
                          {room.roomTypeId?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-white/50 font-medium">
                        <span>{format(checkIn, 'MMM d')}</span>
                        <span>→</span>
                        <span>{format(checkOut, 'MMM d')}</span>
                      </div>
                      <div className="mt-2.5">
                        <span
                          className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-[4px]"
                          style={{ background: color, color: '#fff' }}
                        >
                          {booking.bookingStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-[#1e1e2e]" />
                  </div>
                </div>
              );
            });

            return cells;
          })}
        </div>
      </div>
    </div>
  );
}

