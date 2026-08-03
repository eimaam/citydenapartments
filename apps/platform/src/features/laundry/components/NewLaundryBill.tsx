import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Search, ChevronDown, ChevronRight, UserRound, UsersRound, X } from 'lucide-react';
import { Button, Input, Textarea, Checkbox } from '@citydenapartments/shared';
import { useToast } from '../../../components/ui/Toast';
import { customersApi, type CustomerResponse } from '../../bookings/api/customers.api';
import { laundryApi, type LaundryCategorySummary, type PaginatedItems } from '../api/laundry.api';
import type { LaundryBillResponse, LaundryItemResponse } from '@citydenapartments/shared';

interface LineKey {
  itemId: string;
  itemName: string;
  category: string;
  service: 'laundry' | 'pressing';
  unitPrice: number;
  qty: number;
}

interface CategoryPage {
  items: LaundryItemResponse[];
  page: number;
  total: number;
  hasMore: boolean;
  loading: boolean;
}

const PAGE_SIZE = 20;

interface Props {
  onCreated: (bill: LaundryBillResponse) => void;
}

export default function NewLaundryBill({ onCreated }: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'customer' | 'walkin'>('customer');
  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CustomerResponse[]>([]);
  const [selected, setSelected] = useState<CustomerResponse | null>(null);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [lines, setLines] = useState<Map<string, LineKey>>(new Map());
  const [notes, setNotes] = useState('');
  const [paidNow, setPaidNow] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── items: summary + per-category lazy pages ─────────────────
  const [summary, setSummary] = useState<LaundryCategorySummary[]>([]);
  const [catPages, setCatPages] = useState<Record<string, CategoryPage>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // ── items: backend search ────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchResults, setSearchResults] = useState<CategoryPage | null>(null);

  const doSearch = useCallback(async (term: string, page: number, append: boolean) => {
    setSearchResults((prev) => ({ ...(prev ?? { items: [], page: 0, total: 0, hasMore: false }), loading: true }));
    try {
      const res = await laundryApi.items({ search: term || undefined, page, limit: PAGE_SIZE });
      setSearchResults((prev) => ({
        items: append && prev ? [...prev.items, ...res.items] : res.items,
        page: res.page,
        total: res.total,
        hasMore: res.hasMore,
        loading: false,
      }));
    } catch {
      toast('error', 'Failed to search items.');
      setSearchResults((prev) => (prev ? { ...prev, loading: false } : prev));
    }
  }, [toast]);

  useEffect(() => {
    laundryApi.summary().then(setSummary).catch(() => toast('error', 'Failed to load laundry categories.'));
  }, [toast]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const term = searchInput.trim();
      setSearch(term);
      if (term) doSearch(term, 1, false);
      else setSearchResults(null);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput, doSearch]);

  const toggleCategory = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    if (!catPages[name] && !expanded.has(name)) {
      loadCategoryPage(name, 1, false);
    }
  };

  const loadCategoryPage = async (name: string, page: number, append: boolean) => {
    setCatPages((prev) => ({
      ...prev,
      [name]: { ...(prev[name] ?? { items: [], page: 0, total: 0, hasMore: false }), loading: true },
    }));
    try {
      const res = await laundryApi.items({ category: name, page, limit: PAGE_SIZE });
      setCatPages((prev) => ({
        ...prev,
        [name]: {
          items: append ? [...(prev[name]?.items ?? []), ...res.items] : res.items,
          page: res.page,
          total: res.total,
          hasMore: res.hasMore,
          loading: false,
        },
      }));
    } catch {
      toast('error', `Failed to load ${name} items.`);
      setCatPages((prev) => ({ ...prev, [name]: { ...(prev[name] ?? { items: [], page: 0, total: 0, hasMore: false }), loading: false } }));
    }
  };

  const loadMoreCategory = (name: string) => {
    const pg = catPages[name];
    if (pg && pg.hasMore && !pg.loading) loadCategoryPage(name, pg.page + 1, true);
  };

  const loadMoreSearch = () => {
    if (searchResults && searchResults.hasMore && !searchResults.loading) doSearch(search, searchResults.page + 1, true);
  };

  // ── line selection ───────────────────────────────────────────
  const toggleLine = (item: LaundryItemResponse, service: 'laundry' | 'pressing') => {
    const key = `${item._id}:${service}`;
    const unitPrice = service === 'pressing' ? item.pressingPrice : item.laundryPrice;
    if (unitPrice === null || unitPrice === undefined) return;
    setLines((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, {
          itemId: item._id,
          itemName: item.item,
          category: item.category,
          service,
          unitPrice,
          qty: 1,
        });
      }
      return next;
    });
  };

  const setQty = (keys: string[], delta: number) => {
    setLines((prev) => {
      const next = new Map(prev);
      for (const key of keys) {
        const line = next.get(key);
        if (!line) continue;
        const qty = Math.min(99, Math.max(1, line.qty + delta));
        next.set(key, { ...line, qty });
      }
      return next;
    });
  };

  const total = useMemo(() => Array.from(lines.values()).reduce((sum, l) => sum + l.unitPrice * l.qty, 0), [lines]);

  const customerResolved = mode === 'customer' ? !!selected : !!walkInName.trim();
  const canSubmit = customerResolved && lines.size > 0;
  const searchingActive = search.trim() !== '';

  const doSearchCustomer = async () => {
    if (!phone.trim()) return;
    setSearching(true);
    setSelected(null);
    try {
      const res = await customersApi.search(phone.trim());
      setResults(res);
      if (res.length === 0) toast('info', 'No customer found with this phone. Use walk-in details instead.');
    } catch {
      toast('error', 'Failed to search customers.');
    } finally {
      setSearching(false);
    }
  };

  const submit = async () => {
    if (!customerResolved) {
      toast('error', mode === 'customer' ? 'Select a customer from the search results.' : 'Enter the walk-in client name.');
      return;
    }
    if (lines.size === 0) {
      toast('error', 'Tick at least one item.');
      return;
    }
    setSaving(true);
    try {
      const bill = await laundryApi.createBill({
        customerId: mode === 'customer' ? selected?._id : undefined,
        walkIn: mode === 'walkin' ? { name: walkInName.trim(), phone: walkInPhone.trim() || undefined } : undefined,
        roomNumber: roomNumber.trim() || undefined,
        lines: Array.from(lines.values()).map((l) => ({ itemId: l.itemId, service: l.service, qty: l.qty })),
        status: paidNow ? 'paid' : 'pending',
        notes: notes.trim() || undefined,
      });
      toast('success', `Laundry bill ${bill.billNumber} created — ₦${bill.total.toLocaleString()}`);
      setLines(new Map());
      setRoomNumber('');
      setNotes('');
      setPaidNow(false);
      setSelected(null);
      setResults([]);
      setPhone('');
      setWalkInName('');
      setWalkInPhone('');
      onCreated(bill);
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to create laundry bill.');
    } finally {
      setSaving(false);
    }
  };

  const renderItemRow = (item: LaundryItemResponse, showCategory: boolean) => {
    const laundryKey = `${item._id}:laundry`;
    const pressingKey = `${item._id}:pressing`;
    const laundryOn = lines.has(laundryKey);
    const pressingOn = lines.has(pressingKey);
    const hasPressing = item.pressingPrice !== null && item.pressingPrice !== undefined;
    return (
      <div key={item._id} className="flex items-center gap-3 px-3 py-2 hover:bg-surface-container-low">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {item.item}
            {showCategory && <span className="ml-2 text-[10px] font-bold tracking-wide text-primary uppercase">{item.category}</span>}
          </p>
          <p className="text-xs opacity-60">
            Laundry <span className="font-medium">₦{item.laundryPrice.toLocaleString()}</span>
            {hasPressing && <span className="ml-3">Pressing <span className="font-medium">₦{(item.pressingPrice as number).toLocaleString()}</span></span>}
          </p>
        </div>
        <Checkbox checked={laundryOn} onChange={() => toggleLine(item, 'laundry')} className="text-xs">Laundry</Checkbox>
        <Checkbox checked={pressingOn} disabled={!hasPressing} onChange={() => toggleLine(item, 'pressing')} className="text-xs">Press</Checkbox>
        {(laundryOn || pressingOn) && (
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setQty([laundryKey, pressingKey].filter((k) => lines.has(k)), -1)} className="w-6 h-6 rounded border border-outline-variant flex items-center justify-center text-xs"><Minus size={12} /></button>
            <span className="w-6 text-center text-sm font-semibold">{lines.get(laundryOn ? laundryKey : pressingKey)!.qty}</span>
            <button type="button" onClick={() => setQty([laundryKey, pressingKey].filter((k) => lines.has(k)), 1)} className="w-6 h-6 rounded border border-outline-variant flex items-center justify-center text-xs"><Plus size={12} /></button>
          </div>
        )}
      </div>
    );
  };

  const renderLoadMore = (page: CategoryPage | undefined, onMore: () => void, noun: string) => {
    if (!page || !page.hasMore || page.items.length === 0) return null;
    return (
      <div className="p-2 text-center">
        <Button size="sm" variant="outline" loading={page.loading} onClick={onMore}>
          Load more {noun} ({page.total - page.items.length} remaining)
        </Button>
      </div>
    );
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-6 min-w-0">
        {/* ── client ── */}
        <section className="rounded-2xl border border-outline-variant bg-surface p-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-outline mb-3">Client</h3>
          <div className="flex gap-2 mb-4">
            <Button variant={mode === 'customer' ? 'default' : 'outline'} size="sm" icon={<UsersRound size={14} />} onClick={() => { setMode('customer'); setSelected(null); }}>
              Existing Customer
            </Button>
            <Button variant={mode === 'walkin' ? 'default' : 'outline'} size="sm" icon={<UserRound size={14} />} onClick={() => { setMode('walkin'); setSelected(null); }}>
              Walk-in Client
            </Button>
          </div>

          {mode === 'customer' ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Search customer by phone…" value={phone} onChange={(e) => setPhone(e.target.value)} onPressEnter={doSearchCustomer} />
                <Button variant="default" icon={<Search size={14} />} onClick={doSearchCustomer} loading={searching}>Search</Button>
              </div>
              {results.length > 0 && (
                <div className="max-h-44 overflow-auto divide-y divide-outline-variant/60 rounded-lg border border-outline-variant">
                  {results.map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => setSelected(c)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-container-low ${selected?._id === c._id ? 'bg-primary/10' : ''}`}
                    >
                      <span>
                        <span className="font-medium">{c.name}</span>
                        <span className="ml-2 text-xs opacity-60">{c.phone}</span>
                      </span>
                      <span className="text-xs opacity-60">{c.totalVisits} visit(s)</span>
                    </button>
                  ))}
                </div>
              )}
              {selected && (
                <p className="text-sm">Selected: <span className="font-medium">{selected.name}</span> <span className="text-xs opacity-60">{selected.phone}</span></p>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-outline">Client name *</label>
                <Input placeholder="e.g. John Doe" value={walkInName} onChange={(e) => setWalkInName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-outline">Phone (optional)</label>
                <Input placeholder="e.g. 0803 000 0000" value={walkInPhone} onChange={(e) => setWalkInPhone(e.target.value)} />
              </div>
            </div>
          )}
          <div className="mt-3">
            <label className="text-xs text-outline">Room number (optional)</label>
            <Input placeholder="e.g. 204" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
          </div>
        </section>

        {/* ── items ── */}
        <section className="rounded-2xl border border-outline-variant bg-surface p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-outline">Items</h3>
            {searchingActive && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setSearch(''); setSearchResults(null); }}
                className="flex items-center gap-1 text-xs text-outline hover:text-on-surface cursor-pointer"
              >
                <X size={12} /> Clear search
              </button>
            )}
          </div>

          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <Input
              className="pl-9"
              placeholder="Search items… (queries the price list)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {searchingActive ? (
            <div className="rounded-lg border border-outline-variant overflow-hidden">
              {searchResults?.items.length === 0 && !searchResults.loading ? (
                <p className="p-4 text-sm text-on-surface-variant">No items match "{search}".</p>
              ) : (
                <div className="divide-y divide-outline-variant/60">
                  {(searchResults?.items ?? []).map((item) => renderItemRow(item, true))}
                </div>
              )}
              {searchResults?.loading && searchResults.items.length === 0 && (
                <p className="p-4 text-sm text-on-surface-variant animate-pulse">Searching…</p>
              )}
              {renderLoadMore(searchResults, loadMoreSearch, 'results')}
            </div>
          ) : (
            <div className="space-y-3">
              {summary.length === 0 && <p className="text-sm text-on-surface-variant animate-pulse">Loading categories…</p>}
              {summary.map((cat) => {
                const isOpen = expanded.has(cat.name);
                const page = catPages[cat.name];
                return (
                  <div key={cat._id} className="rounded-lg border border-outline-variant overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.name)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-surface-container-low cursor-pointer"
                    >
                      {isOpen ? <ChevronDown size={14} className="text-outline shrink-0" /> : <ChevronRight size={14} className="text-outline shrink-0" />}
                      <span className="text-[11px] font-bold tracking-widest text-primary uppercase flex-1">{cat.name}</span>
                      <span className="text-xs opacity-60">{cat.itemCount} item(s)</span>
                    </button>
                    {isOpen && (
                      <div className="divide-y divide-outline-variant/60 border-t border-outline-variant">
                        {page?.loading && page.items.length === 0 && <p className="p-3 text-sm text-on-surface-variant animate-pulse">Loading…</p>}
                        {(page?.items ?? []).map((item) => renderItemRow(item, false))}
                        {renderLoadMore(page, () => loadMoreCategory(cat.name), 'items')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── notes ── */}
        <section className="rounded-2xl border border-outline-variant bg-surface p-4">
          <label className="text-xs text-outline">Notes (optional)</label>
          <Textarea rows={2} placeholder="Special instructions, items delivered, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </section>
      </div>

      {/* ── summary ── */}
      <aside className="lg:sticky lg:top-6 h-fit rounded-2xl border border-outline-variant bg-surface p-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-outline mb-3">Summary</h3>
        {lines.size === 0 ? (
          <p className="text-sm opacity-60">No items selected yet.</p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-auto mb-3">
            {Array.from(lines.values()).map((l) => (
              <li key={`${l.itemId}:${l.service}`} className="flex justify-between gap-2 text-sm">
                <span className="truncate">{l.qty}× {l.itemName} <span className="opacity-50 lowercase">({l.service})</span></span>
                <span className="font-medium whitespace-nowrap">₦{(l.unitPrice * l.qty).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between border-t border-outline-variant pt-3">
          <span className="text-sm font-semibold uppercase tracking-wide">Total</span>
          <span className="text-lg font-bold">₦{total.toLocaleString()}</span>
        </div>
        <div className="mt-4 space-y-3">
          <Checkbox checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)}>
            Payment collected — mark as <span className="font-medium">Paid</span>
          </Checkbox>
          <Button variant="default" fullWidth size="lg" disabled={!canSubmit} loading={saving} onClick={submit}>
            Create Bill
          </Button>
        </div>
      </aside>
    </div>
  );
}
