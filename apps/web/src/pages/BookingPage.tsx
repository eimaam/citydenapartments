import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  MapPin, 
  ChevronRight, 
  Star, 
  X, 
  Check, 
  ShieldCheck, 
  Printer, 
  Phone, 
  Mail, 
  MessageSquare, 
  ChevronRight as ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@citydenapartments/shared';
import { SectionReveal } from '../components/marketing/motionSection';
import { getRoomTypes } from '../lib/api';
import type { PublicRoomType } from '../lib/api';

// Suite data interface
interface Suite {
  id: string;
  title: string;
  city: 'abuja' | 'kaduna' | 'maiduguri';
  cityName: string;
  priceNaira: number;
  imageUrl: string;
  tags: string[];
  description: string;
  amenities: string[];
  reviews: { author: string; rating: number; text: string; date: string }[];
  address: string;
  contactPhone: string;
  contactEmail: string;
}

const BRANCH_CITY_MAP: Record<string, 'abuja' | 'kaduna' | 'maiduguri'> = {
  ABJ: 'abuja',
  KAD: 'kaduna',
  MAI: 'maiduguri',
};

const toSuite = (rt: PublicRoomType): Suite => ({
  id: rt.id,
  title: rt.name,
  city: BRANCH_CITY_MAP[rt.branch.code] || 'abuja',
  cityName: `${rt.branch.name}, Nigeria`,
  priceNaira: rt.basePrice,
  imageUrl: rt.images[0] || '',
  tags: [],
  description: rt.description,
  amenities: rt.amenities,
  reviews: [],
  address: rt.branch.address,
  contactPhone: rt.branch.contactPhone,
  contactEmail: rt.branch.contactEmail,
});

export const BookingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Wizard state: 1 (Suite select), 2 (Details & Payment), 3 (Confirmation)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Fetch suites from API
  const [suitesDb, setSuitesDb] = useState<Suite[]>([]);
  useEffect(() => {
    getRoomTypes().then((items) => setSuitesDb(items.map(toSuite))).catch(() => {});
  }, []);

  // Search parameters state
  const [cityFilter, setCityFilter] = useState<string>(searchParams.get('city') || 'all');
  const [suiteTypeFilter, setSuiteTypeFilter] = useState<string>('all');
  const [checkIn, setCheckIn] = useState<string>(searchParams.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState<string>(searchParams.get('checkOut') || '');
  const [guestsCount, setGuestsCount] = useState<string>(searchParams.get('guests') || '2');

  // Booking details state
  const [selectedSuite, setSelectedSuite] = useState<Suite | null>(null);
  const [detailedSuiteView, setDetailedSuiteView] = useState<Suite | null>(null);

  // Guest details form state
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Payment details form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Confirmation state
  const [bookingReference, setBookingReference] = useState('');
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [isPreStocked, setIsPreStocked] = useState(false);

  // Set default dates if empty
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const fourDaysLater = new Date(today);
    fourDaysLater.setDate(today.getDate() + 5);

    const formatDateStr = (d: Date) => {
      const year = d.getFullYear();
      let month = '' + (d.getMonth() + 1);
      let day = '' + d.getDate();
      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;
      return [year, month, day].join('-');
    };

    if (!checkIn) setCheckIn(formatDateStr(tomorrow));
    if (!checkOut) setCheckOut(formatDateStr(fourDaysLater));
  }, [checkIn, checkOut]);

  // Handle back-and-forward history using state
  const handleGoBack = () => {
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    } else {
      navigate(-1);
    }
    window.scrollTo(0, 0);
  };

  // Helper: format Naira
  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate booking metrics
  const calculateNights = () => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const nights = calculateNights();
  const basePrice = selectedSuite ? selectedSuite.priceNaira * nights : 0;
  const serviceFee = selectedSuite ? Math.round(basePrice * 0.05) : 0; // 5% fee
  const tourismTax = selectedSuite ? 15000 * nights : 0; // Fixed tax per night
  const preStockCost = isPreStocked ? 45000 : 0;
  const grandTotal = basePrice + serviceFee + tourismTax + preStockCost;

  // Format dates for display
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Filtered Suites list
  const filteredSuites = suitesDb.filter(suite => {
    const matchesCity = cityFilter === 'all' || suite.city === cityFilter;
    const matchesType = suiteTypeFilter === 'all' || 
      (suiteTypeFilter === 'studio' && suite.title.toLowerCase().includes('studio')) ||
      (suiteTypeFilter === 'suite' && suite.title.toLowerCase().includes('suite')) ||
      (suiteTypeFilter === 'penthouse' && suite.title.toLowerCase().includes('penthouse'));
    return matchesCity && matchesType;
  });

  // Handle Suite Selection
  const handleSelectSuite = (suite: Suite) => {
    setSelectedSuite(suite);
    setStep(2);
    window.scrollTo(0, 0);
  };

  // Input formatting
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    const formatted = val.substring(0, 16).replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    let formatted = val;
    if (val.length > 2) {
      formatted = val.substring(0, 2) + '/' + val.substring(2, 4);
    }
    setExpiryDate(formatted);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setCvv(val.substring(0, 3));
  };

  // Confirm booking submit
  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!guestName.trim()) errors.guestName = 'Full name is required';
    if (!guestEmail.trim() || !/\S+@\S+\.\S+/.test(guestEmail)) errors.guestEmail = 'A valid email is required';
    if (!guestPhone.trim()) errors.guestPhone = 'Phone number is required';
    if (cardNumber.replace(/\s/g, '').length < 16) errors.cardNumber = 'Card number must be 16 digits';
    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) errors.expiryDate = 'Expiry date must be MM/YY';
    if (cvv.length < 3) errors.cvv = 'CVV must be 3 digits';
    if (!agreedToTerms) errors.agreedToTerms = 'You must agree to the Terms of Service';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    
    // Simulate generation of booking ref
    const randomRef = 'CD-' + Math.floor(1000 + Math.random() * 9000) + '-' + new Date().getFullYear();
    setBookingReference(randomRef);
    setStep(3);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6] pt-[5.85rem] md:pt-[6.25rem] pb-24 text-on-surface">
      {/* Step Indicator Header */}
      <div className="sticky top-[5.85rem] md:top-[6.25rem] z-30 flex justify-center items-center gap-4 md:gap-8 py-5 border-b border-outline-variant/30 bg-white shadow-sm px-4">
        <button 
          onClick={handleGoBack}
          className="mr-auto absolute left-4 md:left-8 flex items-center gap-1.5 text-xs font-bold tracking-widest text-[#7F7663] hover:text-primary transition-colors uppercase"
        >
          <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Back</span>
        </button>

        <div className="flex items-center gap-2">
          <div className={`size-6 rounded-full flex items-center justify-center font-bold text-[10px] ${step >= 1 ? 'bg-[#735c00] text-white' : 'bg-surface-container-high text-secondary'}`}>1</div>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${step === 1 ? 'text-[#735c00]' : 'text-secondary/70'}`}>Select Suite</span>
        </div>
        <div className="h-[1px] w-6 md:w-12 bg-outline-variant/50" />
        <div className="flex items-center gap-2">
          <div className={`size-6 rounded-full flex items-center justify-center font-bold text-[10px] ${step >= 2 ? 'bg-[#735c00] text-white' : 'bg-surface-container-high text-secondary'}`}>2</div>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${step === 2 ? 'text-[#735c00]' : 'text-secondary/70'}`}>Guest Details</span>
        </div>
        <div className="h-[1px] w-6 md:w-12 bg-outline-variant/50" />
        <div className="flex items-center gap-2">
          <div className={`size-6 rounded-full flex items-center justify-center font-bold text-[10px] ${step >= 3 ? 'bg-[#735c00] text-white' : 'bg-surface-container-high text-secondary'}`}>3</div>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${step === 3 ? 'text-[#735c00]' : 'text-secondary/70'}`}>Confirmation</span>
        </div>
        <div className="ml-auto w-10 hidden sm:block" /> {/* layout spacer */}
      </div>

      {/* Step 1: Select Suite View */}
      {step === 1 && (
        <main className="mx-auto w-full max-w-[1240px] px-6 py-12 md:py-16">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[11px] font-bold tracking-widest text-[#735c00] uppercase">UNPARALLELED COMFORT</span>
            <h1 className="mt-4 font-serif text-4xl md:text-5xl lg:text-6xl font-normal leading-tight">
              Tailored Sanctuaries
            </h1>
            <p className="mt-6 text-base text-secondary leading-relaxed font-serif italic">
              Discover our collection of curated suites across Nigeria's most vibrant cities, designed for the discerning traveler.
            </p>
          </div>

          {/* Filters and Search Info Bar */}
          <div className="bg-white border border-outline-variant/35 p-6 rounded-sm mb-12 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              {/* City filter */}
              <div className="flex flex-col">
                <label className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase mb-2">LOCATION</label>
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-full bg-[#FAF8F6] border border-outline-variant/50 rounded-none py-3 px-4 font-sans text-sm focus:border-[#735c00] focus:ring-0 outline-none cursor-pointer"
                >
                  <option value="all">All Locations</option>
                  <option value="abuja">Abuja</option>
                  <option value="kaduna">Kaduna</option>
                  <option value="maiduguri">Maiduguri</option>
                </select>
              </div>

              {/* Suite Type filter */}
              <div className="flex flex-col">
                <label className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase mb-2">SUITE TYPE</label>
                <select
                  value={suiteTypeFilter}
                  onChange={(e) => setSuiteTypeFilter(e.target.value)}
                  className="w-full bg-[#FAF8F6] border border-outline-variant/50 rounded-none py-3 px-4 font-sans text-sm focus:border-[#735c00] focus:ring-0 outline-none cursor-pointer"
                >
                  <option value="all">All Suites</option>
                  <option value="studio">Studios</option>
                  <option value="suite">Suites</option>
                  <option value="penthouse">Penthouses</option>
                </select>
              </div>

              {/* Date preview / edit */}
              <div className="flex flex-col">
                <label className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase mb-2">DATES</label>
                <div className="w-full bg-[#FAF8F6] border border-outline-variant/50 py-3 px-4 font-sans text-sm text-secondary flex justify-between items-center gap-2">
                  <span className="truncate">{formatDateDisplay(checkIn)} - {formatDateDisplay(checkOut)}</span>
                  <span className="shrink-0 text-xs font-bold bg-[#735c00]/10 text-[#735c00] px-2 py-0.5 rounded-full">{nights} {nights === 1 ? 'Night' : 'Nights'}</span>
                </div>
              </div>

              {/* Guests Count preview */}
              <div className="flex flex-col">
                <label className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase mb-2">TRAVELERS</label>
                <div className="w-full bg-[#FAF8F6] border border-outline-variant/50 py-3 px-4 font-sans text-sm text-secondary flex items-center justify-between">
                  <span>{guestsCount} {parseInt(guestsCount) === 1 ? 'Adult' : 'Adults'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Suites Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredSuites.map((suite, idx) => (
              <SectionReveal key={suite.id} delay={idx * 0.05} className="group bg-white border border-outline-variant/35 p-3 rounded-sm shadow-card hover:shadow-ambient transition-all duration-500 flex flex-col justify-between">
                <div>
                  <div 
                    onClick={() => setDetailedSuiteView(suite)}
                    className="overflow-hidden rounded-sm relative aspect-[4/3] w-full bg-surface-container-low cursor-pointer"
                  >
                    <img
                      src={suite.imageUrl}
                      alt={suite.title}
                      className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute top-4 right-4 bg-black/65 text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-sm backdrop-blur-xs">
                      {suite.cityName.split(',')[0]}
                    </div>
                  </div>
                  
                  <div className="mt-6 px-2">
                    <div className="flex justify-between items-start">
                      <h3 
                        onClick={() => setDetailedSuiteView(suite)}
                        className="font-serif text-2xl font-normal text-on-surface hover:text-[#735c00] transition-colors cursor-pointer"
                      >
                        {suite.title}
                      </h3>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-[9px] text-[#735c00] font-bold uppercase tracking-widest leading-none">FROM</span>
                        <span className="font-serif text-lg font-bold text-on-surface mt-1">{formatNaira(suite.priceNaira)}</span>
                        <span className="text-[10px] text-secondary leading-none">/ NIGHT</span>
                      </div>
                    </div>
                    
                    <p className="mt-3 text-sm text-secondary line-clamp-2 leading-relaxed">
                      {suite.description}
                    </p>

                    {/* tags */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(suite.tags || []).map(t => (
                        <span key={t} className="text-[10px] font-medium text-secondary/80 bg-[#FAF8F6] border border-outline-variant/40 px-2 py-0.5 rounded-sm">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-outline-variant/30 pt-4 px-2">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setDetailedSuiteView(suite)}
                      className="text-xs font-bold tracking-widest text-[#7F7663] hover:text-on-surface py-3 border border-outline-variant/60 hover:border-on-surface text-center transition-all uppercase"
                    >
                      VIEW DETAILS
                    </button>
                    <button
                      onClick={() => handleSelectSuite(suite)}
                      className="text-xs font-bold tracking-widest bg-on-surface hover:bg-[#735c00] text-white py-3 text-center transition-all uppercase"
                    >
                      SELECT SUITE
                    </button>
                  </div>
                </div>
              </SectionReveal>
            ))}

            {filteredSuites.length === 0 && (
              <div className="col-span-full text-center py-20 bg-white border border-dashed border-outline-variant/60">
                <p className="font-serif text-xl italic text-secondary">No suites match your filter preferences.</p>
                <button 
                  onClick={() => { setCityFilter('all'); setSuiteTypeFilter('all'); }}
                  className="mt-4 text-xs font-bold tracking-widest text-[#735c00] underline uppercase"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Step 2: Guest Details and Payment */}
      {step === 2 && selectedSuite && (
        <main className="mx-auto w-full max-w-[1240px] px-6 py-12 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Form Column */}
            <div className="lg:col-span-7">
              <h1 className="font-serif text-4xl font-normal leading-tight text-on-surface mb-2">
                Secure Your Sanctuary
              </h1>
              <p className="text-secondary text-sm leading-relaxed mb-10">
                Complete your booking for an unparalleled urban escape. Your details are protected by our advanced encryption.
              </p>

              <form onSubmit={handleConfirmBooking} className="flex flex-col gap-10">
                {/* 01 Guest Information */}
                <div>
                  <h3 className="text-xs font-bold tracking-widest text-primary uppercase border-b border-outline-variant/30 pb-3 mb-6 flex items-center gap-2">
                    <span className="text-[#735c00] font-serif font-light text-base">01</span> Guest Information
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase mb-2">FULL NAME</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className={`bg-[#FAF8F6] border-b ${formErrors.guestName ? 'border-red-500' : 'border-outline-variant/60'} py-3 text-sm focus:border-[#735c00] outline-none transition-colors`}
                      />
                      {formErrors.guestName && <span className="text-red-500 text-xs mt-1">{formErrors.guestName}</span>}
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase mb-2">EMAIL ADDRESS</label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className={`bg-[#FAF8F6] border-b ${formErrors.guestEmail ? 'border-red-500' : 'border-outline-variant/60'} py-3 text-sm focus:border-[#735c00] outline-none transition-colors`}
                      />
                      {formErrors.guestEmail && <span className="text-red-500 text-xs mt-1">{formErrors.guestEmail}</span>}
                    </div>

                    <div className="flex flex-col sm:col-span-2">
                      <label className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase mb-2">PHONE NUMBER</label>
                      <input
                        type="text"
                        placeholder="+234 000 000 0000"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className={`bg-[#FAF8F6] border-b ${formErrors.guestPhone ? 'border-red-500' : 'border-outline-variant/60'} py-3 text-sm focus:border-[#735c00] outline-none transition-colors`}
                      />
                      {formErrors.guestPhone && <span className="text-red-500 text-xs mt-1">{formErrors.guestPhone}</span>}
                    </div>
                  </div>
                </div>

                {/* 02 Special Requests */}
                <div>
                  <h3 className="text-xs font-bold tracking-widest text-primary uppercase border-b border-outline-variant/30 pb-3 mb-6 flex items-center gap-2">
                    <span className="text-[#735c00] font-serif font-light text-base">02</span> Special Requests
                  </h3>
                  
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase mb-2">ANY SPECIFIC REQUIREMENTS? (OPTIONAL)</label>
                    <textarea
                      placeholder="Early check-in, dietary preferences, or accessibility needs..."
                      rows={3}
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      className="bg-[#FAF8F6] border border-outline-variant/60 p-4 text-sm focus:border-[#735c00] outline-none rounded-none transition-colors resize-none"
                    />
                  </div>
                </div>

                {/* 03 Payment Details */}
                <div>
                  <h3 className="text-xs font-bold tracking-widest text-primary uppercase border-b border-outline-variant/30 pb-3 mb-6 flex items-center gap-2">
                    <span className="text-[#735c00] font-serif font-light text-base">03</span> Payment Details
                  </h3>
                  
                  <div className="bg-white border border-outline-variant/35 p-6 md:p-8 rounded-sm shadow-sm">
                    {/* Encrypted payment banner */}
                    <div className="flex justify-between items-center bg-[#FAF8F6] border border-outline-variant/40 px-4 py-3 mb-6 rounded-xs">
                      <span className="text-xs font-semibold text-secondary flex items-center gap-2">
                        <ShieldCheck className="size-4 text-[#735c00]" /> Encrypted Secure Payment
                      </span>
                      <span className="text-[9px] text-[#7F7663] font-bold uppercase tracking-widest">Naira Gateway</span>
                    </div>

                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase mb-2">CARD NUMBER</label>
                        <input
                          type="text"
                          placeholder="0000 0000 0000 0000"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          className={`bg-transparent border-b ${formErrors.cardNumber ? 'border-red-500' : 'border-outline-variant/60'} py-3 text-sm focus:border-[#735c00] outline-none transition-colors font-mono`}
                        />
                        {formErrors.cardNumber && <span className="text-red-500 text-xs mt-1">{formErrors.cardNumber}</span>}
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase mb-2">EXPIRY DATE</label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={expiryDate}
                            onChange={handleExpiryChange}
                            className={`bg-transparent border-b ${formErrors.expiryDate ? 'border-red-500' : 'border-outline-variant/60'} py-3 text-sm focus:border-[#735c00] outline-none transition-colors font-mono`}
                          />
                          {formErrors.expiryDate && <span className="text-red-500 text-xs mt-1">{formErrors.expiryDate}</span>}
                        </div>

                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase mb-2">CVV</label>
                          <input
                            type="password"
                            placeholder="123"
                            value={cvv}
                            onChange={handleCvvChange}
                            className={`bg-transparent border-b ${formErrors.cvv ? 'border-red-500' : 'border-outline-variant/60'} py-3 text-sm focus:border-[#735c00] outline-none transition-colors font-mono`}
                          />
                          {formErrors.cvv && <span className="text-red-500 text-xs mt-1">{formErrors.cvv}</span>}
                        </div>
                      </div>

                      <div className="mt-4 flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="terms"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-1 cursor-pointer accent-[#735c00]"
                        />
                        <label htmlFor="terms" className="text-xs text-secondary leading-relaxed cursor-pointer select-none">
                          I agree to the <span className="underline hover:text-on-surface">Terms of Service</span> and <span className="underline hover:text-on-surface">Cancellation Policy</span> of City Den Apartments.
                        </label>
                      </div>
                      {formErrors.agreedToTerms && <span className="text-red-500 text-xs">{formErrors.agreedToTerms}</span>}
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="mt-4 flex flex-col items-center">
                  <Button
                    htmlType="submit"
                    size="lg"
                    className="w-full !bg-[#735c00] hover:!bg-[#554300] !text-white !rounded-none !py-4 font-bold tracking-widest text-xs uppercase"
                  >
                    CONFIRM BOOKING & PAY {formatNaira(grandTotal)}
                  </Button>
                  <span className="text-[10px] font-bold tracking-wider text-[#7F7663]/60 uppercase mt-4 flex items-center gap-1.5">
                    🛡️ SECURE TRANSACTION
                  </span>
                </div>
              </form>
            </div>

            {/* Sidebar Column */}
            <div className="lg:col-span-5 bg-white border border-outline-variant/35 rounded-sm p-6 md:p-8 shadow-sm">
              <div className="overflow-hidden rounded-sm relative aspect-[16/10] w-full bg-surface-container-low mb-6">
                <img
                  src={selectedSuite.imageUrl}
                  alt={selectedSuite.title}
                  className="size-full object-cover"
                />
              </div>

              <div>
                <span className="text-[9px] text-[#735c00] font-bold uppercase tracking-widest">SELECTED SANCTUARY</span>
                <h3 className="font-serif text-3xl font-normal text-on-surface mt-1">{selectedSuite.title}</h3>
                <p className="text-[#7F7663] text-xs font-semibold uppercase tracking-wider mt-1">{selectedSuite.cityName}</p>
              </div>

              <div className="mt-8 border-t border-outline-variant/30 pt-6">
                <h4 className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase mb-4">STAY DETAILS</h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div>
                    <span className="text-[10px] text-secondary/60 uppercase font-semibold">CHECK-IN</span>
                    <p className="font-sans font-bold text-on-surface mt-1">{formatDateDisplay(checkIn)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-secondary/60 uppercase font-semibold">CHECK-OUT</span>
                    <p className="font-sans font-bold text-on-surface mt-1">{formatDateDisplay(checkOut)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-secondary/60 uppercase font-semibold">GUESTS</span>
                    <p className="font-sans font-bold text-on-surface mt-1">{guestsCount} {parseInt(guestsCount) === 1 ? 'Adult' : 'Adults'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-secondary/60 uppercase font-semibold">DURATION</span>
                    <p className="font-sans font-bold text-on-surface mt-1">{nights} {nights === 1 ? 'Night' : 'Nights'}</p>
                  </div>
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="mt-8 border-t border-outline-variant/30 pt-6">
                <h4 className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase mb-4">PRICE BREAKDOWN</h4>
                <div className="flex flex-col gap-3.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary">{formatNaira(selectedSuite.priceNaira)} x {nights} nights</span>
                    <span className="font-medium text-on-surface">{formatNaira(basePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Service Fee (5%)</span>
                    <span className="font-medium text-on-surface">{formatNaira(serviceFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Tourism Tax</span>
                    <span className="font-medium text-on-surface">{formatNaira(tourismTax)}</span>
                  </div>

                  {/* Prestock item */}
                  {isPreStocked && (
                    <div className="flex justify-between items-center text-sm text-[#735c00] bg-[#735c00]/5 px-2 py-1 rounded-xs">
                      <span>✓ Pre-stocked Fridge Addon</span>
                      <span className="font-bold">{formatNaira(preStockCost)}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-outline-variant/30 pt-4 text-base font-bold text-on-surface">
                    <span>Total (Naira)</span>
                    <span className="text-[#735c00] font-serif text-lg">{formatNaira(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Editorial quote */}
              <div className="mt-8 border-t border-[#735c00]/10 pt-6 italic text-center text-xs text-[#7F7663]/90 bg-[#735c00]/5 p-4 rounded-xs">
                "Experience the pinnacle of urban living where every detail is choreographed for your peace of mind."
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Step 3: Confirmation View */}
      {step === 3 && selectedSuite && (
        <main className="mx-auto w-full max-w-[1040px] px-6 py-12 md:py-16">
          {/* Confirmed Top Board */}
          <div className="relative overflow-hidden bg-[#1A1815] p-8 md:p-12 text-center text-white rounded-sm mb-12 shadow-ambient">
            {/* Watermark logo overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
              <span className="font-serif text-[180px] font-bold">CDA</span>
            </div>
            
            <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
              <span className="bg-[#735c00] text-white text-[9px] font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-6">
                CONFIRMED
              </span>
              <h1 className="font-serif text-3xl md:text-5xl font-normal leading-tight">
                Thank you for choosing City Den.
              </h1>
              <p className="mt-4 text-sm md:text-base text-white/70 leading-relaxed font-serif max-w-lg mx-auto italic">
                Your sanctuary awaits. We are delighted to host you for your upcoming stay in the heart of the city.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Reference & Details Info */}
            <div className="md:col-span-7 flex flex-col gap-8">
              {/* Reference Card */}
              <div className="bg-white border border-outline-variant/35 p-6 md:p-8 rounded-sm shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant/30 pb-6 gap-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase">BOOKING REFERENCE</span>
                    <h3 className="font-mono text-3xl font-bold text-on-surface mt-1">{bookingReference}</h3>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => alert("Added to calendar successfully.")}
                      className="text-[10px] font-bold tracking-widest bg-[#735c00] text-white py-3.5 px-5 hover:bg-[#554300] transition-colors uppercase rounded-none"
                    >
                      ADD TO CALENDAR
                    </button>
                    <button 
                      onClick={() => setReceiptOpen(true)}
                      className="text-[10px] font-bold tracking-widest border border-outline-variant/65 text-on-surface py-3.5 px-5 hover:bg-on-surface hover:text-white transition-all uppercase rounded-none flex items-center gap-1.5"
                    >
                      <Printer className="size-3.5" /> RECEIPT
                    </button>
                  </div>
                </div>

                {/* Stay Details Summary */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase mb-3">STAY DETAILS</h4>
                    <div className="flex flex-col gap-2.5 text-sm">
                      <div className="flex items-start gap-2.5">
                        <MapPin className="size-4 text-[#735c00] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-on-surface block">Destination</span>
                          <span className="text-secondary text-xs">{selectedSuite.title}, City Den {selectedSuite.cityName.split(',')[0]}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Calendar className="size-4 text-[#735c00] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-on-surface block">Check-in / Check-out</span>
                          <span className="text-secondary text-xs">{formatDateDisplay(checkIn)} — {formatDateDisplay(checkOut)} ({nights} Nights)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase mb-3">GUESTS & OCCUPANCY</h4>
                    <div className="flex flex-col gap-2.5 text-sm">
                      <div className="flex items-start gap-2.5">
                        <Users className="size-4 text-[#735c00] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-on-surface block">Travelers</span>
                          <span className="text-secondary text-xs">{guestsCount} {parseInt(guestsCount) === 1 ? 'Adult' : 'Adults'}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="size-4 text-[#735c00] shrink-0 flex items-center justify-center font-bold text-xs">🏨</div>
                        <div>
                          <span className="font-semibold text-on-surface block">Room Type</span>
                          <span className="text-secondary text-xs">{selectedSuite.title}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Check-in Instructions */}
              <div className="bg-white border border-outline-variant/35 p-6 md:p-8 rounded-sm shadow-sm">
                <h3 className="font-serif text-2xl font-normal text-on-surface mb-6 pb-4 border-b border-outline-variant/30">
                  Check-in Instructions
                </h3>
                
                <div className="flex flex-col gap-8">
                  <div className="flex gap-4">
                    <span className="font-serif text-xl font-light text-[#735c00] shrink-0">01</span>
                    <div>
                      <h4 className="font-bold text-sm text-on-surface uppercase tracking-wider">Digital Key Access</h4>
                      <p className="mt-1.5 text-xs text-secondary leading-relaxed">
                        Your secure digital key will be activated in the City Den app 2 hours before your arrival. Use this for contactless entry to the building and your suite.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <span className="font-serif text-xl font-light text-[#735c00] shrink-0">02</span>
                    <div>
                      <h4 className="font-bold text-sm text-on-surface uppercase tracking-wider">Concierge Greeting</h4>
                      <p className="mt-1.5 text-xs text-secondary leading-relaxed">
                        Our concierge is available 24/7. Upon arrival, please proceed to the ground floor lounge for a brief orientation and refreshment.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <span className="font-serif text-xl font-light text-[#735c00] shrink-0">03</span>
                    <div>
                      <h4 className="font-bold text-sm text-on-surface uppercase tracking-wider">Parking</h4>
                      <p className="mt-1.5 text-xs text-secondary leading-relaxed">
                        Reserved parking is available in Level B1, Slot 42. Please use your reference code for gate access.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Assistance, Maps & Enhancements */}
            <div className="md:col-span-5 flex flex-col gap-8">
              {/* Map Layout */}
              <div className="bg-white border border-outline-variant/35 p-4 rounded-sm shadow-sm">
                <div className="overflow-hidden rounded-sm relative aspect-[16/9] w-full bg-surface-container-low mb-4">
                  <iframe
                    src={
                      selectedSuite.city === 'abuja'
                        ? 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3939.940917111082!2d7.426410000000002!3d9.0691474!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x104e74d813aa5555%3A0x9dde89910b8c07ca!2s5%20Audu%20Ogbe%20St%2C%20Jabi%2C%20Abuja%20900108%2C%20Federal%20Capital%20Territory!5e0!3m2!1sen!2sng!4v1783096157239!5m2!1sen!2sng'
                        : selectedSuite.city === 'kaduna'
                        ? 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3922.436011058829!2d7.456493775717975!3d10.545013363418246!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x11b2b50047b0b985%3A0xbb0c01b2e4bb4ec6!2sCITY%20DEN%20APARTMENT!5e0!3m2!1sen!2sng!4v1783096211779!5m2!1sen!2sng'
                        : 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3905.4395400736767!2d13.150351275728267!3d11.804458439389704!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x11049f00722ef797%3A0x7d09be4ee458df8c!2sCITY%20DEN%20APARTMENTS%20MAIDUGURI!5e0!3m2!1sen!2sng!4v1783096250430!5m2!1sen!2sng'
                    }
                    width="100%"
                    height="100%"
                    style={{ border: 0, position: 'absolute', inset: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    title={`City Den ${selectedSuite.cityName.split(',')[0]} location`}
                  />
                </div>
                <p className="text-xs font-semibold text-on-surface font-sans">{selectedSuite.address}</p>
                <p className="text-xs text-secondary/80 font-sans mt-1">{selectedSuite.contactPhone}</p>
              </div>

              {/* Need Assistance Card */}
              <div className="bg-[#59491A] p-6 text-white rounded-sm shadow-sm">
                <h4 className="font-serif text-2xl font-normal leading-tight">Need Assistance?</h4>
                <p className="mt-3 text-xs text-white/80 leading-relaxed">
                  Our dedicated guest relations team is available around the clock to ensure your stay is perfect before you even arrive.
                </p>
                <div className="mt-6 flex flex-col gap-4 text-xs font-semibold">
                  <a href={`tel:${selectedSuite.contactPhone.replace(/\s/g, '')}`} className="flex items-center gap-3 text-white hover:text-white/85 transition-colors">
                    <Phone className="size-4 text-[#C9A23E]" /> {selectedSuite.contactPhone}
                  </a>
                  <a href={`mailto:${selectedSuite.contactEmail}`} className="flex items-center gap-3 text-white hover:text-white/85 transition-colors">
                    <Mail className="size-4 text-[#C9A23E]" /> {selectedSuite.contactEmail}
                  </a>
                  <span className="flex items-center gap-3 text-white/95">
                    <MessageSquare className="size-4 text-[#C9A23E]" /> Live Chat via Member App
                  </span>
                </div>
              </div>

              {/* Enhance Stay Pre-Stock Fridge Widget */}
              <div className="bg-white border border-outline-variant/35 p-6 rounded-sm shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-[#735c00] tracking-widest uppercase">ENHANCE YOUR STAY</span>
                  <h4 className="font-serif text-xl font-normal text-on-surface mt-1">Pre-stock your fridge</h4>
                  <p className="text-secondary text-xs mt-2 leading-relaxed">
                    Have local cold beverages, organic fruits, cheeses, and artisanal chocolates waiting in your suite's private fridge on arrival.
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-outline-variant/30 pt-4">
                  <span className="text-xs font-bold text-on-surface">{formatNaira(45000)} <span className="font-normal text-secondary">one-time</span></span>
                  {isPreStocked ? (
                    <span className="text-xs font-bold text-[#735c00] flex items-center gap-1">
                      ✓ Added to Stay
                    </span>
                  ) : (
                    <button 
                      onClick={() => setIsPreStocked(true)}
                      className="text-xs font-bold tracking-widest text-[#735c00] hover:text-[#554300] uppercase underline"
                    >
                      Pre-order
                    </button>
                  )}
                </div>
              </div>

              {/* Return Home Button */}
              <Button
                onClick={() => navigate('/')}
                size="lg"
                className="w-full !bg-on-surface hover:!bg-on-surface/90 !text-white !rounded-none !py-4 font-bold tracking-widest text-xs uppercase"
              >
                Return to Destinations
              </Button>
            </div>
          </div>
        </main>
      )}

      {/* DETAILED SUITE VIEW MODAL */}
      {detailedSuiteView && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-[760px] max-h-[90vh] bg-white border border-outline-variant p-6 md:p-8 rounded-sm shadow-2xl overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setDetailedSuiteView(null)}
              className="absolute top-4 right-4 text-[#7F7663] hover:text-on-surface transition-colors p-1.5"
            >
              <X className="size-6" />
            </button>

            {/* Content layout */}
            <div className="flex flex-col gap-6">
              <div className="overflow-hidden rounded-sm relative aspect-[16/9] w-full bg-surface-container-low">
                <img
                  src={detailedSuiteView.imageUrl}
                  alt={detailedSuiteView.title}
                  className="size-full object-cover"
                />
              </div>

              <div>
                <div className="flex justify-between items-baseline flex-wrap gap-4">
                  <div>
                    <h2 className="font-serif text-3xl font-normal text-on-surface">{detailedSuiteView.title}</h2>
                    <p className="text-[#735c00] text-xs font-bold uppercase tracking-widest mt-1">{detailedSuiteView.cityName}</p>
                  </div>
                  <div className="flex items-center gap-1 font-serif text-2xl font-bold text-on-surface">
                    <span>{formatNaira(detailedSuiteView.priceNaira)}</span>
                    <span className="text-xs text-secondary font-normal">/ Night</span>
                  </div>
                </div>
                
                <p className="text-secondary text-sm mt-4 leading-relaxed font-serif italic">
                  {detailedSuiteView.description}
                </p>
              </div>

              {/* Amenities */}
              <div>
                <h4 className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase border-b border-outline-variant/30 pb-2 mb-3">AMENITIES</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-secondary">
                  {(detailedSuiteView.amenities || []).map(a => (
                    <div key={a} className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-[#735c00] shrink-0" />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews */}
              <div>
                <h4 className="text-[10px] font-bold tracking-widest text-[#7F7663] uppercase border-b border-outline-variant/30 pb-2 mb-4">GUEST REVIEWS</h4>
                <div className="flex flex-col gap-4">
                  {(detailedSuiteView.reviews || []).map((r, i) => (
                    <div key={i} className="bg-[#FAF8F6] border border-outline-variant/40 p-4 rounded-xs">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-on-surface">{r.author}</span>
                        <div className="flex gap-1 items-center">
                          {[...Array(r.rating)].map((_, idx) => (
                            <Star key={idx} className="size-3 fill-[#735c00] text-[#735c00]" />
                          ))}
                          <span className="text-[10px] text-secondary/60 ml-2">{r.date}</span>
                        </div>
                      </div>
                      <p className="text-xs text-secondary leading-relaxed font-serif italic">
                        "{r.text}"
                      </p>
                    </div>
                  ))}
                  {detailedSuiteView.reviews.length === 0 && (
                    <p className="text-xs text-secondary/60 italic">Opening soon. No reviews yet.</p>
                  )}
                </div>
              </div>

              {/* Modal Select Suite CTA */}
              <div className="mt-4 border-t border-outline-variant/30 pt-6 flex justify-end gap-4">
                <button
                  onClick={() => setDetailedSuiteView(null)}
                  className="text-xs font-bold tracking-widest text-[#7F7663] hover:text-on-surface py-3 px-6 border border-outline-variant/60 hover:border-on-surface transition-all uppercase rounded-none"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleSelectSuite(detailedSuiteView);
                    setDetailedSuiteView(null);
                  }}
                  className="text-xs font-bold tracking-widest bg-[#735c00] hover:bg-[#554300] text-white py-3 px-6 transition-all uppercase rounded-none"
                >
                  Book Suite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {receiptOpen && selectedSuite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-[560px] bg-white border border-outline-variant p-6 md:p-8 rounded-sm shadow-2xl">
            {/* Close Button */}
            <button
              onClick={() => setReceiptOpen(false)}
              className="absolute top-4 right-4 text-[#7F7663] hover:text-on-surface transition-colors p-1.5"
            >
              <X className="size-6" />
            </button>

            {/* Receipt Content */}
            <div className="flex flex-col text-on-surface font-sans" id="printable-receipt">
              <div className="text-center mb-8">
                <span className="font-serif text-2xl font-bold tracking-widest">CITY DEN</span>
                <p className="text-[9px] text-[#7F7663] font-bold tracking-widest uppercase mt-1">OFFICIAL TRANSACTION RECEIPT</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs border-b border-outline-variant/30 pb-4 mb-4">
                <div>
                  <span className="text-secondary/70 font-semibold uppercase">Booking Ref:</span>
                  <p className="font-bold text-sm mt-0.5">{bookingReference}</p>
                </div>
                <div>
                  <span className="text-secondary/70 font-semibold uppercase">Payment Status:</span>
                  <p className="font-bold text-sm text-[#735c00] mt-0.5">PAID (CARD)</p>
                </div>
                <div>
                  <span className="text-secondary/70 font-semibold uppercase">Billing Name:</span>
                  <p className="font-bold mt-0.5">{guestName}</p>
                </div>
                <div>
                  <span className="text-secondary/70 font-semibold uppercase">Billing Email:</span>
                  <p className="font-bold mt-0.5">{guestEmail}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="flex flex-col gap-3 text-xs mb-8">
                <div className="flex justify-between border-b border-outline-variant/30 pb-2 font-bold uppercase text-[9px] text-secondary">
                  <span>Description</span>
                  <span className="text-right">Amount</span>
                </div>
                <div className="flex justify-between">
                  <span>{selectedSuite.title} ({nights} Nights stay)</span>
                  <span>{formatNaira(basePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee (5%)</span>
                  <span>{formatNaira(serviceFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tourism Tax</span>
                  <span>{formatNaira(tourismTax)}</span>
                </div>
                {isPreStocked && (
                  <div className="flex justify-between text-[#735c00]">
                    <span>✓ Fridge Pre-stocking Package</span>
                    <span>{formatNaira(preStockCost)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-outline-variant/30 pt-4 font-bold text-sm text-on-surface">
                  <span>Grand Total Paid</span>
                  <span className="text-[#735c00]">{formatNaira(grandTotal)}</span>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="text-center text-[10px] text-secondary/70 leading-relaxed italic border-t border-outline-variant/20 pt-4">
                Thank you for your business. For refunds or change request policies, please review your booking details or contact {selectedSuite.contactEmail}.
              </div>

              <div className="mt-8 flex justify-end gap-3 no-print">
                <button
                  onClick={() => window.print()}
                  className="text-xs font-bold tracking-widest bg-on-surface text-white py-3 px-6 hover:bg-[#735c00] transition-colors uppercase rounded-none flex items-center gap-1.5"
                >
                  <Printer className="size-4" /> Print Receipt
                </button>
                <button
                  onClick={() => setReceiptOpen(false)}
                  className="text-xs font-bold tracking-widest text-[#7F7663] hover:text-on-surface py-3 px-6 border border-outline-variant/60 hover:border-on-surface transition-all uppercase rounded-none"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
