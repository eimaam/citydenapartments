import { useMemo } from 'react';
import { format, eachDayOfInterval, isSameDay, isToday, isPast, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { Clock, CalendarCheck, UserCheck, CheckCheck } from 'lucide-react';
import { BookingStatus } from '../../types';

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
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onCellClick?: (date: Date, room: CalendarRoom, booking?: CalendarBooking) => void;
}

const STATUS_COLORS: Record<string, string> = {
  [BookingStatus.Reserved]: '#f59e0b',
  [BookingStatus.Confirmed]: '#3b82f6',
  [BookingStatus.Checked_In]: '#10b981',
  [BookingStatus.Checked_Out]: '#6b7280',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  [BookingStatus.Reserved]: Clock,
  [BookingStatus.Confirmed]: CalendarCheck,
  [BookingStatus.Checked_In]: UserCheck,
  [BookingStatus.Checked_Out]: CheckCheck,
};

export function BookingCalendar({
  year, month, rooms, bookings,
  onPrevMonth, onNextMonth, onToday, onCellClick,
}: BookingCalendarProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(monthStart);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [year, month]);

  const roomRowIndex = (ri: number) => ri + 2;
  const colForDay = (day: Date) => {
    const idx = days.findIndex(d => isSameDay(d, day));
    return idx !== -1 ? idx + 2 : null;
  };

  const dayCount = days.length;
  const roomColWidth = 130;
  const dayColMinWidth = 32;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onPrevMonth} className="px-3 py-1.5 text-sm rounded border border-outline-variant bg-surface-container-lowest hover:bg-surface-container cursor-pointer">&larr;</button>
          <h2 className="font-serif text-xl">{format(new Date(year, month - 1), 'MMMM yyyy')}</h2>
          <button type="button" onClick={onNextMonth} className="px-3 py-1.5 text-sm rounded border border-outline-variant bg-surface-container-lowest hover:bg-surface-container cursor-pointer">&rarr;</button>
        </div>
        <button type="button" onClick={onToday} className="px-3 py-1.5 text-xs font-medium rounded border border-outline-variant bg-surface-container-lowest hover:bg-surface-container cursor-pointer">Today</button>
      </div>

      {/* ── Scrollable grid ── */}
      <div
        className="overflow-auto border border-outline-variant rounded-lg"
        style={{ maxHeight: 'calc(100vh - 210px)' }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${roomColWidth}px repeat(${dayCount}, minmax(${dayColMinWidth}px, 1fr))`,
            minWidth: roomColWidth + dayCount * dayColMinWidth,
          }}
        >
          {/* ── Header row ── */}
          <div
            className="sticky top-0 z-20 bg-surface-container-lowest border-r border-b border-outline-variant px-2 py-2 text-[10px] uppercase tracking-wide text-outline font-medium flex items-center"
            style={{ gridRow: 1, gridColumn: 1 }}
          >
            Room
          </div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`sticky top-0 z-20 border-b border-outline-variant px-1 py-1.5 text-center font-medium text-[10px] ${
                isToday(day) ? 'bg-primary/10 text-primary' : 'bg-surface-container-lowest text-outline'
              }`}
              style={{ gridRow: 1, gridColumn: colForDay(day)! }}
            >
              <div>{format(day, 'EEE')}</div>
              <div className={`text-xs ${isToday(day) ? 'font-bold' : ''}`}>{format(day, 'd')}</div>
            </div>
          ))}

          {/* ── Room rows ── */}
          {rooms.flatMap((room, ri) => {
            const row = roomRowIndex(ri);
            const roomBookings = bookings.filter(b => b.roomId._id === room._id);
            const cells: React.ReactNode[] = [];

            cells.push(
              <div
                key={`room-${room._id}`}
                className="sticky left-0 z-10 bg-surface-container-lowest border-r border-b border-outline-variant px-2 py-1.5 flex flex-col justify-center"
                style={{ gridRow: row, gridColumn: 1 }}
              >
                <div className="font-medium text-xs">{room.roomNumber}</div>
                {room.roomTypeId && <div className="text-[9px] text-outline">{room.roomTypeId.name}</div>}
              </div>
            );

            days.forEach((day) => {
              const inMonth = day.getMonth() === month - 1;
              const dayPast = isPast(day) && !isSameDay(day, new Date());
              cells.push(
                <div
                  key={`bg-${room._id}-${day.toISOString()}`}
                  className={`border-r border-b border-outline-variant/50 ${
                    !inMonth ? 'opacity-30' : ''
                  } ${dayPast ? 'bg-surface-container/30' : ''}`}
                  style={{ gridRow: row, gridColumn: colForDay(day)! }}
                />
              );
            });

            roomBookings.forEach((booking) => {
              const checkIn = new Date(booking.checkInDate);
              const checkOut = new Date(booking.checkOutDate);
              const startCol = colForDay(checkIn) ?? 2;
              const endCol = colForDay(checkOut);

              const startsBefore = !colForDay(checkIn);
              const endsAfter = !endCol;
              const color = STATUS_COLORS[booking.bookingStatus] || '#6b7280';
              const StatusIcon = STATUS_ICONS[booking.bookingStatus] || Clock;

              cells.push(
                <div
                  key={`bk-${booking._id}`}
                  onClick={() => onCellClick?.(checkIn, room, booking)}
                  className="relative cursor-pointer group"
                  style={{
                    gridRow: row,
                    gridColumn: `${startCol} / ${endCol ? endCol : dayCount + 2}`,
                    zIndex: 5,
                  }}
                >
                  <div className="absolute inset-0 flex items-center pointer-events-none">
                    <div
                      className="flex-1 flex items-center gap-1 h-5 mx-1 rounded-md shadow-sm transition-shadow group-hover:shadow-md overflow-hidden"
                      style={{ background: color }}
                    >
                      {startsBefore && <span className="text-[8px] text-white/60 shrink-0 leading-none ml-0.5">↤</span>}
                      <StatusIcon size={10} className="text-white/90 shrink-0 ml-1" />
                      <span className="text-[10px] font-medium text-white truncate leading-tight">
                        {booking.guestDetails.name}
                      </span>
                      {booking.bookingStatus === BookingStatus.Checked_In && (
                        <span className="text-[8px] font-bold text-white/80 uppercase shrink-0 mr-1">(IN)</span>
                      )}
                      {booking.bookingStatus === BookingStatus.Checked_Out && (
                        <span className="text-[8px] font-bold text-white/60 uppercase shrink-0 mr-1">(OUT)</span>
                      )}
                      {endsAfter && <span className="text-[8px] text-white/60 shrink-0 leading-none mr-0.5">↦</span>}
                      {!endsAfter && booking.bookingStatus !== BookingStatus.Checked_In && booking.bookingStatus !== BookingStatus.Checked_Out && (
                        <span className="text-[8px] text-white/60 shrink-0 mr-1">→</span>
                      )}
                    </div>
                  </div>

                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 hidden group-hover:block">
                    <div className="bg-[#1e1e2e] text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap border border-white/10">
                      <div className="font-semibold text-sm">{booking.guestDetails.name}</div>
                      <div className="text-white/60 mt-0.5">Room {booking.roomId.roomNumber}</div>
                      <div className="flex items-center gap-2 mt-1 text-white/70">
                        <span>{format(checkIn, 'MMM d')}</span>
                        <span>→</span>
                        <span>{format(checkOut, 'MMM d')}</span>
                      </div>
                      <div className="mt-1">
                        <span
                          className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                          style={{ background: color, color: '#fff' }}
                        >
                          {booking.bookingStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#1e1e2e]" />
                  </div>
                </div>
              );
            });

            return cells;
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex gap-4 text-[10px] text-outline items-center flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[BookingStatus.Reserved] }} /> Reserved</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[BookingStatus.Confirmed] }} /> Confirmed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[BookingStatus.Checked_In] }} /> Checked In</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[BookingStatus.Checked_Out] }} /> Checked Out</span>
      </div>
    </div>
  );
}
