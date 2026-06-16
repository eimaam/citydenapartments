import { useState, useMemo, useCallback } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { BookingCalendar, Button, Select, Option, BookingStatus } from '@citydenapartments/shared';
import { Users, Clock, Check, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/Toast';
import { bookingsApi, type CalendarData } from '../api/bookings.api';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const STATUS_LABELS: Record<string, string> = {
  [BookingStatus.Reserved]: 'Reserved',
  [BookingStatus.Confirmed]: 'Confirmed',
  [BookingStatus.Checked_In]: 'Checked In',
  [BookingStatus.Checked_Out]: 'Checked Out',
};

const STATUS_COLORS: Record<string, string> = {
  [BookingStatus.Reserved]: '#e0ba4d',
  [BookingStatus.Confirmed]: '#e0ba4d',
  [BookingStatus.Checked_In]: '#5c4c23',
  [BookingStatus.Checked_Out]: '#a6a6a6',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  [BookingStatus.Reserved]: Clock,
  [BookingStatus.Confirmed]: Clock,
  [BookingStatus.Checked_In]: Check,
  [BookingStatus.Checked_Out]: User,
};

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(today);
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchCalendar = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      setData(await bookingsApi.calendar(y, m));
    } catch {
      toast('error', 'Failed to load calendar.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useState(() => { fetchCalendar(year, month); });

  const goToMonth = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
    fetchCalendar(y, m);
  };

  const onPrevMonth = () => {
    const d = subMonths(new Date(year, month - 1), 1);
    goToMonth(d.getFullYear(), d.getMonth() + 1);
  };

  const onNextMonth = () => {
    const d = addMonths(new Date(year, month - 1), 1);
    goToMonth(d.getFullYear(), d.getMonth() + 1);
  };

  const onToday = () => {
    goToMonth(today.getFullYear(), today.getMonth() + 1);
    setSelectedDate(today);
  };

  const onCellClick = (date: Date, _room: any, booking?: any) => {
    if (booking) {
      navigate(`/bookings?search=${booking.guestDetails.name}`);
    } else {
      navigate(`/bookings?checkIn=${format(date, 'yyyy-MM-dd')}`);
    }
  };

  const stats = useMemo(() => {
    if (!data) return [];
    const counts: Record<string, number> = {};
    for (const b of data.bookings) {
      counts[b.bookingStatus] = (counts[b.bookingStatus] || 0) + 1;
    }
    return [
      { label: 'Total Bookings', value: data.bookings.length, icon: Users, color: '#3b82f6' },
      { label: 'Reserved', value: counts[BookingStatus.Reserved] || 0, icon: STATUS_ICONS[BookingStatus.Reserved], color: STATUS_COLORS[BookingStatus.Reserved] },
      { label: 'Checked In', value: counts[BookingStatus.Checked_In] || 0, icon: STATUS_ICONS[BookingStatus.Checked_In], color: STATUS_COLORS[BookingStatus.Checked_In] },
      { label: 'Checked Out', value: counts[BookingStatus.Checked_Out] || 0, icon: STATUS_ICONS[BookingStatus.Checked_Out], color: STATUS_COLORS[BookingStatus.Checked_Out] },
    ];
  }, [data]);

  const years = useMemo(() => {
    const y = today.getFullYear();
    return Array.from({ length: 7 }, (_, i) => y - 2 + i);
  }, []);

  return (
    <div className="p-6 md:p-8">
      {/* Section bar */}
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Calendar</span>
      </div>

      {/* Title row with month/year Select */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Booking Calendar</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onPrevMonth}>&larr;</Button>
          <Select size="sm" className="!w-28" value={String(month)} onChange={(v) => goToMonth(year, Number(v))}>
            {MONTHS.map((label, i) => <Option key={i + 1} value={String(i + 1)}>{label}</Option>)}
          </Select>
          <Select size="sm" className="!w-24" value={String(year)} onChange={(v) => goToMonth(Number(v), month)}>
            {years.map((y) => <Option key={y} value={String(y)}>{y}</Option>)}
          </Select>
          <Button size="sm" onClick={onNextMonth}>&rarr;</Button>
          <Button size="sm" onClick={onToday}>Today</Button>
        </div>
      </div>

      {/* Metric cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 hover:border-outline transition-all">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                  <Icon size={13} style={{ color }} />
                </div>
                <span className="text-[10px] font-semibold tracking-wide uppercase text-outline">{label}</span>
              </div>
              <p className="text-2xl font-bold text-on-surface pl-9">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      ) : data ? (
        <BookingCalendar
          year={year}
          month={month}
          rooms={data.rooms}
          bookings={data.bookings}
          selectedDate={selectedDate}
          onCellClick={onCellClick}
          onSelectDate={setSelectedDate}
        />
      ) : (
        <p className="text-outline py-8 text-center">No data available.</p>
      )}

      {/* Status legend */}
      {data && data.bookings.length > 0 && (
        <div className="flex gap-5 mt-4 text-[10px] text-outline items-center flex-wrap">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <span key={status} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="font-medium">{STATUS_LABELS[status]}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
