import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  UserCheck,
  LogIn,
  LogOut,
  Calendar,
  Percent,
  Shirt,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Tag,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
  Receipt,
  XCircle,
  Filter,
} from 'lucide-react';
import { Button } from '@citydenapartments/shared';
import { customersApi } from '../api/customers.api';
import type { CustomerTimelineEvent, CustomerTimelineResponse, CustomerTimelineEventType } from '@citydenapartments/shared';

interface Props {
  customerId: string;
}

type RangePreset = '3m' | '6m' | '1y' | 'all';

export default function CustomerTimelineTree({ customerId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CustomerTimelineResponse | null>(null);
  const [rangePreset, setRangePreset] = useState<RangePreset>('3m');
  const [eventCategoryFilter, setEventCategoryFilter] = useState<'all' | 'stays' | 'financials' | 'laundry'>('all');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let startDateStr: string | undefined;
      const now = new Date();
      if (rangePreset === '3m') {
        startDateStr = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      } else if (rangePreset === '6m') {
        startDateStr = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
      } else if (rangePreset === '1y') {
        startDateStr = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      } else if (rangePreset === 'all') {
        startDateStr = 'all';
      }

      const res = await customersApi.getTimeline(customerId, {
        startDate: startDateStr,
      });
      setData(res);
    } catch (e: any) {
      setError(e.message || 'Failed to load customer timeline.');
    } finally {
      setLoading(false);
    }
  }, [customerId, rangePreset]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const toggleNodeExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredEvents = (data?.events || []).filter((ev) => {
    if (eventCategoryFilter === 'all') return true;
    if (eventCategoryFilter === 'stays') {
      return ['checked_in', 'checked_out', 'booking_created', 'booking_cancelled'].includes(ev.eventType);
    }
    if (eventCategoryFilter === 'financials') {
      return ['booking_created', 'vip_discount_updated', 'laundry_bill'].includes(ev.eventType);
    }
    if (eventCategoryFilter === 'laundry') {
      return ev.eventType === 'laundry_bill';
    }
    return true;
  });

  const getNodeStyle = (eventType: CustomerTimelineEventType) => {
    switch (eventType) {
      case 'profile_created':
        return {
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          dotBg: 'bg-emerald-500',
          icon: Sparkles,
        };
      case 'checked_in':
        return {
          bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
          dotBg: 'bg-blue-500',
          icon: LogIn,
        };
      case 'checked_out':
        return {
          bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
          dotBg: 'bg-purple-500',
          icon: LogOut,
        };
      case 'booking_created':
        return {
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          dotBg: 'bg-amber-500',
          icon: Calendar,
        };
      case 'booking_cancelled':
        return {
          bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
          dotBg: 'bg-rose-500',
          icon: XCircle,
        };
      case 'vip_discount_updated':
        return {
          bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
          dotBg: 'bg-indigo-500',
          icon: Percent,
        };
      case 'laundry_bill':
        return {
          bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
          dotBg: 'bg-teal-500',
          icon: Shirt,
        };
      default:
        return {
          bg: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
          dotBg: 'bg-slate-500',
          icon: Clock,
        };
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent" />
        <p className="text-xs text-outline font-medium">Assembling Guest Ledger &amp; Timeline Tree...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-500/5 border border-rose-500/20 rounded-xl text-center space-y-3">
        <AlertCircle size={24} className="mx-auto text-rose-500" />
        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
        <Button size="sm" variant="secondary" onClick={fetchTimeline}>
          Try Again
        </Button>
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* ── Guest Ledger Summary Banner ── */}
      {summary && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/50 pb-3">
            <div>
              <h3 className="font-serif text-lg font-medium text-on-surface flex items-center gap-2">
                <Receipt size={18} className="text-primary" />
                Guest Ledger Summary
              </h3>
              <p className="text-xs text-outline">Overall stay statistics and financial totals</p>
            </div>
            {summary.activeVipDiscounts.length > 0 && (
              <div className="flex items-center gap-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-500/20">
                <ShieldCheck size={14} />
                <span>
                  VIP Discount: {summary.activeVipDiscounts.map((d) => `${d.percentage}%`).join(', ')}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/40">
              <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block mb-1">
                Total Visits
              </span>
              <span className="text-xl font-bold text-on-surface">
                {summary.totalVisits} <span className="text-xs font-normal text-outline">stay{summary.totalVisits !== 1 ? 's' : ''}</span>
              </span>
            </div>

            <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/40">
              <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block mb-1">
                Total Billed
              </span>
              <span className="text-xl font-bold text-on-surface">
                ₦{summary.totalBilled?.toLocaleString()}
              </span>
            </div>

            <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/40">
              <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block mb-1">
                Total Paid
              </span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                ₦{summary.totalPaid?.toLocaleString()}
              </span>
            </div>

            <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/40">
              <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block mb-1">
                Discounts Saved
              </span>
              <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                ₦{summary.totalDiscountsSaved?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar: Presets & Event Filter Pills ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant">
        {/* Date Range Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-xs text-outline font-medium mr-1 flex items-center gap-1">
            <Clock size={13} /> Window:
          </span>
          {(['3m', '6m', '1y', 'all'] as RangePreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => setRangePreset(preset)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                rangePreset === preset
                  ? 'bg-primary text-on-primary font-semibold shadow-xs'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              {preset === '3m' && '3 Months (Default)'}
              {preset === '6m' && '6 Months'}
              {preset === '1y' && '1 Year'}
              {preset === 'all' && 'All Time'}
            </button>
          ))}
        </div>

        {/* Event Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <span className="text-xs text-outline font-medium mr-1 flex items-center gap-1">
            <Filter size={13} /> Filter:
          </span>
          {(
            [
              { key: 'all', label: 'All Events' },
              { key: 'stays', label: 'Stays & Check-ins' },
              { key: 'financials', label: 'Financials & Ledger' },
              { key: 'laundry', label: 'Laundry Services' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.key}
              onClick={() => setEventCategoryFilter(filter.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                eventCategoryFilter === filter.key
                  ? 'bg-on-surface text-surface font-semibold'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Timeline Tree ── */}
      {filteredEvents.length === 0 ? (
        <div className="p-10 text-center bg-surface-container-lowest border border-outline-variant rounded-2xl space-y-2">
          <Clock size={28} className="mx-auto text-outline" />
          <p className="text-sm font-medium text-on-surface">No timeline events found in selected period.</p>
          <p className="text-xs text-outline">Try selecting "6 Months" or "All Time" to view older activity.</p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-outline-variant/60">
          {filteredEvents.map((ev) => {
            const style = getNodeStyle(ev.eventType);
            const Icon = style.icon;
            const isExpanded = !!expandedNodes[ev.id];
            const d = ev.details;

            return (
              <div key={ev.id} className="relative group">
                {/* Visual Timeline Node Dot */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 bg-surface flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs ${style.bg}`}
                >
                  <Icon size={14} />
                </div>

                {/* Event Card Content */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 transition-all hover:border-outline hover:shadow-xs space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-on-surface">{ev.title}</span>

                        {ev.branchName && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-surface-container-high text-on-surface px-2.5 py-0.5 rounded-full border border-outline-variant/50">
                            <Building2 size={11} /> {ev.branchName}
                          </span>
                        )}

                        {d?.isFirstVisit && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            1st Visit
                          </span>
                        )}

                        {d?.isReturnVisit && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-md border border-purple-500/20">
                            Return Stay #{d.visitNumber}
                          </span>
                        )}
                      </div>

                      {ev.description && <p className="text-xs text-outline">{ev.description}</p>}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-outline block">
                        {format(new Date(ev.timestamp), 'd MMM yyyy')}
                      </span>
                      <span className="text-[11px] text-outline/80 block">
                        {format(new Date(ev.timestamp), 'hh:mm a')}
                      </span>
                    </div>
                  </div>

                  {/* Financial Quick Glance Badge */}
                  {d && (d.totalAmountPaid !== undefined || d.laundryTotal !== undefined) && (
                    <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40 text-xs">
                      <div className="flex items-center gap-3 flex-wrap">
                        {d.totalAmountPaid !== undefined && (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            Paid: ₦{d.totalAmountPaid.toLocaleString()}
                          </span>
                        )}
                        {d.laundryTotal !== undefined && (
                          <span className="font-semibold text-teal-600 dark:text-teal-400">
                            Bill: ₦{d.laundryTotal.toLocaleString()}
                          </span>
                        )}
                        {d.paymentMethod && (
                          <span className="text-outline uppercase text-[10px] font-bold bg-surface-container-high px-2 py-0.5 rounded-sm">
                            {d.paymentMethod.replace('_', ' ')}
                          </span>
                        )}
                        {d.discountAmount ? (
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium text-[11px]">
                            Discount: ₦{d.discountAmount.toLocaleString()} ({d.discountPercentage}%)
                          </span>
                        ) : null}
                      </div>

                      {/* Expand / Collapse Button */}
                      <button
                        onClick={() => toggleNodeExpand(ev.id)}
                        className="flex items-center gap-1 text-xs text-primary font-medium hover:underline cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Ledger Details' : 'View Full Ledger Details'}</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  )}

                  {/* ── Expandable Itemized Ledger Details ── */}
                  {isExpanded && d && (
                    <div className="mt-3 pt-3 border-t border-outline-variant bg-surface-container-low/60 rounded-lg p-3.5 space-y-3 text-xs">
                      {/* Room & Stay Details */}
                      {d.roomNumbers && d.roomNumbers.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-outline block">Room(s)</span>
                            <span className="font-medium text-on-surface">{d.roomNumbers.join(', ')}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-outline block">Category</span>
                            <span className="font-medium text-on-surface">{d.roomTypes?.join(', ') || 'Standard'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-outline block">Stay Duration</span>
                            <span className="font-medium text-on-surface">{d.nights} night{d.nights !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      )}

                      {/* Financial Line Breakdown */}
                      <div className="space-y-1 bg-surface-container-lowest p-2.5 rounded-md border border-outline-variant/50">
                        {d.baseRoomTotal !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-outline">Base Room Rate Total:</span>
                            <span className="font-medium">₦{d.baseRoomTotal.toLocaleString()}</span>
                          </div>
                        )}
                        {d.vatAmount ? (
                          <div className="flex justify-between text-outline">
                            <span>VAT Amount:</span>
                            <span>+₦{d.vatAmount.toLocaleString()}</span>
                          </div>
                        ) : null}
                        {d.serviceChargeAmount ? (
                          <div className="flex justify-between text-outline">
                            <span>Service Charge:</span>
                            <span>+₦{d.serviceChargeAmount.toLocaleString()}</span>
                          </div>
                        ) : null}
                        {d.discountAmount ? (
                          <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Tag size={12} /> Discount Applied ({d.discountReason || 'Promo/VIP'}):
                            </span>
                            <span>-₦{d.discountAmount.toLocaleString()} ({d.discountPercentage}%)</span>
                          </div>
                        ) : null}
                        {d.discountCode && (
                          <div className="flex justify-between text-purple-600 dark:text-purple-400 font-medium">
                            <span>Promo Code:</span>
                            <span className="font-mono uppercase bg-purple-500/10 px-1.5 py-0.5 rounded">{d.discountCode}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-outline-variant/40 font-bold text-sm text-on-surface">
                          <span>Total Amount Paid:</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            ₦{(d.totalAmountPaid || d.laundryTotal || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Payment & Transaction Info */}
                      {d.paymentReference && (
                        <div className="flex items-center gap-2 text-outline">
                          <CreditCard size={13} />
                          <span>Transaction Ref: <span className="font-mono text-on-surface">{d.paymentReference}</span></span>
                        </div>
                      )}

                      {/* Staff Signatures */}
                      {ev.performedBy && (
                        <div className="flex items-center gap-2 pt-1 text-[11px] text-outline border-t border-outline-variant/30">
                          <ShieldCheck size={12} className="text-primary" />
                          <span>
                            Staff Signature: <strong className="text-on-surface font-medium">{ev.performedBy.name}</strong> ({ev.performedBy.role})
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
