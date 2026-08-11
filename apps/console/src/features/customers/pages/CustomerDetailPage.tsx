import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Briefcase, Globe, ShieldCheck } from 'lucide-react';
import { Button } from '@citydenapartments/shared';
import { useToast } from '../../../components/ui/Toast';
import { api } from '../../../lib/api';
import type { CustomerResponse } from '@citydenapartments/shared';
import CustomerTimelineTree from '../components/CustomerTimelineTree';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCustomer = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<CustomerResponse>(`/customers/${id}`);
      setCustomer(res);
    } catch {
      toast('error', 'Failed to load customer profile.');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  if (loading) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        <p className="text-xs text-outline font-medium">Loading customer profile &amp; timeline...</p>
      </div>
    );
  }

  if (!customer || !id) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-medium text-on-surface">Customer profile not found.</p>
        <Button size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate('/customers')}>
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/customers')}
          className="flex items-center gap-2 text-xs font-semibold text-outline hover:text-on-surface transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Customer Directory
        </button>
      </div>

      {/* Customer Identity Profile Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/50 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-serif text-2xl font-bold border border-primary/20 shrink-0">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-serif text-2xl font-bold text-on-surface">{customer.name}</h1>
                <span className="text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface border border-outline-variant/60">
                  {customer.gender}
                </span>
              </div>
              <p className="text-xs text-outline mt-0.5 flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1"><Phone size={12} /> {customer.phone}</span>
                {customer.email && <span className="flex items-center gap-1"><Mail size={12} /> {customer.email}</span>}
              </p>
            </div>
          </div>

          {customer.branchLifetimeDiscounts && customer.branchLifetimeDiscounts.length > 0 && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 p-3 rounded-xl flex items-center gap-3">
              <ShieldCheck size={20} />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block">VIP Branch Discount</span>
                <span className="text-sm font-bold">
                  {customer.branchLifetimeDiscounts.map((d) => `${d.percentage}%`).join(', ')} Discount
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] text-outline font-semibold uppercase tracking-wider block">Address</span>
            <span className="font-medium text-on-surface flex items-center gap-1 mt-0.5">
              <MapPin size={12} className="text-outline shrink-0" /> {customer.address}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-outline font-semibold uppercase tracking-wider block">Nationality / Origin</span>
            <span className="font-medium text-on-surface flex items-center gap-1 mt-0.5">
              <Globe size={12} className="text-outline shrink-0" /> {customer.nationality} ({customer.stateOfOrigin})
            </span>
          </div>

          <div>
            <span className="text-[10px] text-outline font-semibold uppercase tracking-wider block">Occupation</span>
            <span className="font-medium text-on-surface flex items-center gap-1 mt-0.5">
              <Briefcase size={12} className="text-outline shrink-0" /> {customer.occupation}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-outline font-semibold uppercase tracking-wider block">Travel Details</span>
            <span className="font-medium text-on-surface mt-0.5 block">
              From <strong className="text-on-surface">{customer.comingFrom}</strong> → Next: <strong className="text-on-surface">{customer.nextDestination}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Guest Ledger & Interactive Timeline Tree Component */}
      <CustomerTimelineTree customerId={id} />
    </div>
  );
}
