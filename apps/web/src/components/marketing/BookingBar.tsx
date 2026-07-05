import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, MapPin } from 'lucide-react';
import { Button } from '@citydenapartments/shared';

interface BookingBarProps {
  currentCity?: 'abuja' | 'kaduna' | 'maiduguri';
}

export const BookingBar: React.FC<BookingBarProps> = ({ currentCity = 'abuja' }) => {
  const navigate = useNavigate();
  
  // Format date utility (YYYY-MM-DD)
  const formatDate = (date: Date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  };

  // Default dates: checkin tomorrow, checkout in 4 days
  const getTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  };

  const getFourDaysLater = () => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d;
  };

  const [city, setCity] = useState(currentCity);
  const [checkIn, setCheckIn] = useState(formatDate(getTomorrow()));
  const [checkOut, setCheckOut] = useState(formatDate(getFourDaysLater()));
  const [guests, setGuests] = useState('2');

  useEffect(() => {
    setCity(currentCity);
  }, [currentCity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/book?city=${city}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`);
  };

  // Get current date for min-date constraint
  const todayStr = formatDate(new Date());

  return (
    <div className="absolute bottom-0 left-1/2 z-20 w-[92%] max-w-[1140px] -translate-x-1/2 translate-y-1/2 rounded-sm border border-outline-variant/60 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:p-6 transition-all duration-300">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end">
        {/* Destination Selection */}
        <div className="lg:col-span-3 flex flex-col border-b border-outline-variant/40 pb-2 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
          <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest text-[#7F7663] uppercase">
            <MapPin className="size-3 text-[#735c00]" /> DESTINATION
          </span>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value as any)}
            className="mt-2 w-full font-sans text-sm font-semibold text-on-surface bg-transparent outline-none cursor-pointer border-0 p-0 focus:ring-0 focus:outline-none"
          >
            <option value="abuja">Abuja, Nigeria</option>
            <option value="kaduna">Kaduna, Nigeria</option>
            <option value="maiduguri">Maiduguri, Nigeria</option>
          </select>
        </div>

        {/* Check In Date */}
        <div className="lg:col-span-3 flex flex-col border-b border-outline-variant/40 pb-2 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
          <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest text-[#7F7663] uppercase">
            <Calendar className="size-3 text-[#735c00]" /> CHECK IN
          </span>
          <input
            type="date"
            min={todayStr}
            value={checkIn}
            onChange={(e) => {
              setCheckIn(e.target.value);
              // Auto-advance checkout if checkout is before new checkin
              if (new Date(e.target.value) >= new Date(checkOut)) {
                const newCheckout = new Date(e.target.value);
                newCheckout.setDate(newCheckout.getDate() + 3);
                setCheckOut(formatDate(newCheckout));
              }
            }}
            className="mt-1.5 w-full font-sans text-sm font-semibold text-on-surface bg-transparent outline-none border-0 p-0 focus:ring-0 focus:outline-none cursor-pointer"
          />
        </div>

        {/* Check Out Date */}
        <div className="lg:col-span-3 flex flex-col border-b border-outline-variant/40 pb-2 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
          <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest text-[#7F7663] uppercase">
            <Calendar className="size-3 text-[#735c00]" /> CHECK OUT
          </span>
          <input
            type="date"
            min={checkIn}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="mt-1.5 w-full font-sans text-sm font-semibold text-on-surface bg-transparent outline-none border-0 p-0 focus:ring-0 focus:outline-none cursor-pointer"
          />
        </div>

        {/* Guests Selection */}
        <div className="lg:col-span-2 flex flex-col border-b border-outline-variant/40 pb-2 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
          <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest text-[#7F7663] uppercase">
            <Users className="size-3 text-[#735c00]" /> GUESTS
          </span>
          <select
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="mt-2 w-full font-sans text-sm font-semibold text-on-surface bg-transparent outline-none cursor-pointer border-0 p-0 focus:ring-0 focus:outline-none"
          >
            <option value="1">1 Adult</option>
            <option value="2">2 Adults</option>
            <option value="3">3 Adults</option>
            <option value="4">4 Adults</option>
            <option value="5">5+ Adults</option>
          </select>
        </div>

        {/* Button */}
        <div className="lg:col-span-1 w-full">
          <Button
            htmlType="submit"
            size="lg"
            className="w-full !bg-[#735c00] hover:!bg-[#554300] !text-white !rounded-none !py-4 font-bold tracking-widest text-xs border-0 outline-none flex items-center justify-center"
          >
            SEARCH
          </Button>
        </div>
      </form>
    </div>
  );
};
