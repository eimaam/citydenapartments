import { useState, useCallback } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { BookingCalendar, BookingStatus } from '@citydenapartments/shared';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/Toast';
import { bookingsApi, type CalendarData } from '../api/bookings.api';

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
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

  const onPrevMonth = () => {
    const d = subMonths(new Date(year, month - 1), 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    fetchCalendar(d.getFullYear(), d.getMonth() + 1);
  };

  const onNextMonth = () => {
    const d = addMonths(new Date(year, month - 1), 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    fetchCalendar(d.getFullYear(), d.getMonth() + 1);
  };

  const onToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
    fetchCalendar(today.getFullYear(), today.getMonth() + 1);
  };

  const onCellClick = (date: Date, room: any, booking?: any) => {
    if (booking) {
      navigate(`/bookings?search=${booking.guestDetails.name}`);
    } else {
      navigate(`/bookings?checkIn=${format(date, 'yyyy-MM-dd')}`);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Calendar</span>
      </div>
      <h1 className="font-serif text-2xl sm:text-3xl text-on-surface mb-6">Booking Calendar</h1>
      {loading && !data ? (
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      ) : data ? (
        <BookingCalendar
          year={year}
          month={month}
          rooms={data.rooms}
          bookings={data.bookings}
          onPrevMonth={onPrevMonth}
          onNextMonth={onNextMonth}
          onToday={onToday}
          onCellClick={onCellClick}
        />
      ) : (
        <p className="text-outline py-8 text-center">No data available.</p>
      )}
    </div>
  );
}
