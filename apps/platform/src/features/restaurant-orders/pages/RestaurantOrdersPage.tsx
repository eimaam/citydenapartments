import { useState, useEffect, useCallback, useRef } from 'react';
import {
  UtensilsCrossed,
  Search,
  RefreshCw,
  DoorOpen,
  Truck,
  Volume2,
  VolumeX,
  Eye,
} from 'lucide-react';
import {
  Button,
  Input,
  Select,
  Option,
  Badge,
  Drawer,
  Table,
  RoomStatus,
  RestaurantOrderStatus,
  RestaurantDeliveryType,
  RestaurantPaymentMethod,
  RestaurantPaymentStatus,
} from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import type {
  RestaurantOrderResponse,
  RestaurantOrderStatusType,
  RestaurantPaymentStatusType,
  RestaurantPaymentMethodType,
} from '@citydenapartments/shared';
import { useToast } from '../../../components/ui/Toast';
import { restaurantOrdersApi } from '../api/restaurant-orders.api';

// Web Audio API chime sound generator for incoming orders
function playOrderChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.18);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.35); // D6
    gain2.gain.setValueAtTime(0.3, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.7);
  } catch (e) {
    console.error('Audio chime error:', e);
  }
}

const LIMIT = 25;

const statusTabs: { label: string; value: string }[] = [
  { label: 'All Orders', value: 'all' },
  { label: 'Received (New)', value: RestaurantOrderStatus.Received },
  { label: 'Preparing', value: RestaurantOrderStatus.Preparing },
  { label: 'Out for Delivery', value: RestaurantOrderStatus.OutForDelivery },
  { label: 'Completed', value: RestaurantOrderStatus.Completed },
  { label: 'Cancelled', value: RestaurantOrderStatus.Cancelled },
];

export default function RestaurantOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<RestaurantOrderResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Drawer state
  const [selectedOrder, setSelectedOrder] = useState<RestaurantOrderResponse | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const prevOrdersCountRef = useRef<number | null>(null);

  const fetchOrders = useCallback(
    async (isAutoRefresh = false) => {
      if (!isAutoRefresh) setLoading(true);
      try {
        const data = await restaurantOrdersApi.getOrders({
          page,
          limit: LIMIT,
          orderStatus: activeTab !== 'all' ? (activeTab as any) : undefined,
          deliveryType: deliveryFilter !== 'all' ? (deliveryFilter as any) : undefined,
          search: search.trim() || undefined,
        });

        setOrders(data.orders || []);
        setTotal(data.total || 0);

        if (prevOrdersCountRef.current !== null && data.total > prevOrdersCountRef.current) {
          if (soundEnabled) playOrderChime();
          toast('info', 'New incoming restaurant order received!');
        }
        prevOrdersCountRef.current = data.total;
      } catch {
        if (!isAutoRefresh) toast('error', 'Failed to load restaurant orders.');
      } finally {
        if (!isAutoRefresh) setLoading(false);
      }
    },
    [page, activeTab, deliveryFilter, search, soundEnabled, toast]
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, deliveryFilter, search]);

  // Auto-polling every 12 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchOrders(true);
    }, 12000);
    return () => clearInterval(timer);
  }, [fetchOrders]);

  const onSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  const handleStatusTransition = async (
    id: string,
    newStatus: RestaurantOrderStatusType,
    notes?: string
  ) => {
    setActionLoading(true);
    try {
      const updated = await restaurantOrdersApi.updateStatus(id, newStatus, notes);
      toast('success', `Order #${updated.orderNumber} updated to ${newStatus.toUpperCase()}`);
      if (selectedOrder?._id === id) setSelectedOrder(updated);
      fetchOrders(true);
    } catch (err: any) {
      toast('error', err.response?.data?.message || 'Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaymentStatusChange = async (
    id: string,
    newPaymentStatus: RestaurantPaymentStatusType,
    method?: RestaurantPaymentMethodType
  ) => {
    setActionLoading(true);
    try {
      const updated = await restaurantOrdersApi.updatePaymentStatus(id, newPaymentStatus, method);
      toast('success', `Payment updated to ${newPaymentStatus.toUpperCase()}`);
      if (selectedOrder?._id === id) setSelectedOrder(updated);
      fetchOrders(true);
    } catch {
      toast('error', 'Failed to update payment status');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper status badge mapper
  const getStatusBadge = (status: RestaurantOrderStatusType) => {
    switch (status) {
      case RestaurantOrderStatus.Received:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20">Received</span>;
      case RestaurantOrderStatus.Confirmed:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20">Confirmed</span>;
      case RestaurantOrderStatus.Preparing:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 border border-purple-500/20">Preparing</span>;
      case RestaurantOrderStatus.OutForDelivery:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">Dispatched</span>;
      case RestaurantOrderStatus.Completed:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Completed</span>;
      case RestaurantOrderStatus.Cancelled:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-600 border border-red-500/20">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-container text-outline">{status}</span>;
    }
  };

  const getPaymentBadge = (status: RestaurantPaymentStatusType) => {
    if (status === RestaurantPaymentStatus.Settled) {
      return <Badge status={RoomStatus.Available} label="PAID" />;
    }
    if (status === RestaurantPaymentStatus.Pending) {
      return <Badge status={RoomStatus.Occupied} label="UNPAID" />;
    }
    return <Badge status={RoomStatus.Maintenance} label={status.toUpperCase()} />;
  };

  const columns: TableProps<RestaurantOrderResponse>['columns'] = [
    {
      title: 'Order Ref',
      dataIndex: 'orderNumber',
      key: 'ref',
      width: 130,
      render: (ref: string) => (
        <span className="font-mono text-xs font-bold text-on-surface">#{ref}</span>
      ),
    },
    {
      title: 'Destination / Guest',
      key: 'guest',
      render: (_: unknown, r: RestaurantOrderResponse) => (
        <div>
          <div className="flex items-center gap-1.5 font-semibold text-sm text-on-surface">
            {r.deliveryType === RestaurantDeliveryType.InRoom ? (
              <span className="inline-flex items-center gap-1 text-primary font-bold">
                <DoorOpen size={14} /> Room {r.roomNumber || 'Lodge Guest'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-on-surface">
                <Truck size={14} className="text-outline" /> {r.deliveryLocation?.zoneName || 'External'}
              </span>
            )}
          </div>
          <p className="text-xs text-outline">
            {r.customer?.name} • {r.customer?.phone}
          </p>
        </div>
      ),
    },
    {
      title: 'Items',
      key: 'items',
      render: (_: unknown, r: RestaurantOrderResponse) => (
        <div className="text-xs text-on-surface">
          <span className="font-semibold">{r.items.reduce((acc, i) => acc + i.quantity, 0)} items</span>
          <p className="text-[11px] text-outline line-clamp-1">
            {r.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
          </p>
        </div>
      ),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'total',
      render: (amt: number) => (
        <span className="font-mono text-sm font-bold text-on-surface">
          ₦{(amt || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Payment',
      key: 'payment',
      width: 110,
      render: (_: unknown, r: RestaurantOrderResponse) => getPaymentBadge(r.paymentStatus),
    },
    {
      title: 'Status',
      key: 'orderStatus',
      width: 140,
      render: (_: unknown, r: RestaurantOrderResponse) => getStatusBadge(r.orderStatus),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: unknown, r: RestaurantOrderResponse) => (
        <Button
          size="sm"
          variant="secondary"
          icon={<Eye size={13} />}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedOrder(r);
            setDetailDrawerOpen(true);
          }}
        />
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8">
      {/* Eyebrow Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">
          Kitchen & Dispatch
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Live Restaurant Orders</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            icon={soundEnabled ? <Volume2 size={14} className="text-primary" /> : <VolumeX size={14} />}
          >
            {soundEnabled ? 'Chime Alerts On' : 'Chime Muted'}
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw size={13} className={loading ? 'animate-spin' : ''} />}
            onClick={() => fetchOrders()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs and Search Strip */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-6">
        <div className="flex gap-1 p-1 rounded bg-surface-container w-fit overflow-x-auto">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-sm transition-all cursor-pointer whitespace-nowrap"
              style={{
                background: activeTab === tab.value ? 'var(--color-surface-container-lowest)' : 'transparent',
                color: activeTab === tab.value ? 'var(--color-on-surface)' : 'var(--color-outline)',
                boxShadow: activeTab === tab.value ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-48">
            <Select
              size="sm"
              className="w-full"
              value={deliveryFilter}
              onChange={(v) => setDeliveryFilter(v)}
            >
              <Option value="all">All Delivery Types</Option>
              <Option value={RestaurantDeliveryType.InRoom}>🚪 Room Service</Option>
              <Option value={RestaurantDeliveryType.HomeDelivery}>🛵 External Delivery</Option>
              <Option value={RestaurantDeliveryType.Pickup}>🥡 Pickup</Option>
            </Select>
          </div>

          <Input
            size="sm"
            placeholder="Search ref, guest, room..."
            prefix={<Search size={14} className="text-outline" />}
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="!w-60"
          />
        </div>
      </div>

      {/* Orders Table Shell */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <Table<RestaurantOrderResponse>
          columns={columns}
          dataSource={orders}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: LIMIT,
            total,
            showSizeChanger: false,
            onChange: (p) => setPage(p),
          }}
          onRow={(r) => ({
            onClick: () => {
              setSelectedOrder(r);
              setDetailDrawerOpen(true);
            },
            style: { cursor: 'pointer' },
          })}
        />
      </div>

      {/* Order Detail Drawer */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        title={selectedOrder ? `Order #${selectedOrder.orderNumber}` : 'Order Details'}
        size="md"
        footer={
          selectedOrder && (
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2">
                {selectedOrder.paymentStatus !== RestaurantPaymentStatus.Settled && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={actionLoading}
                    onClick={() =>
                      handlePaymentStatusChange(
                        selectedOrder._id,
                        RestaurantPaymentStatus.Settled,
                        RestaurantPaymentMethod.PosTerminal
                      )
                    }
                  >
                    Mark Paid
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedOrder.orderStatus === RestaurantOrderStatus.Received && (
                  <Button
                    size="sm"
                    loading={actionLoading}
                    onClick={() =>
                      handleStatusTransition(selectedOrder._id, RestaurantOrderStatus.Preparing)
                    }
                  >
                    Start Preparing
                  </Button>
                )}

                {selectedOrder.orderStatus === RestaurantOrderStatus.Preparing && (
                  <Button
                    size="sm"
                    loading={actionLoading}
                    onClick={() =>
                      handleStatusTransition(selectedOrder._id, RestaurantOrderStatus.OutForDelivery)
                    }
                  >
                    Mark Dispatched
                  </Button>
                )}

                {selectedOrder.orderStatus === RestaurantOrderStatus.OutForDelivery && (
                  <Button
                    size="sm"
                    loading={actionLoading}
                    onClick={() =>
                      handleStatusTransition(selectedOrder._id, RestaurantOrderStatus.Completed)
                    }
                  >
                    Complete Order
                  </Button>
                )}

                {selectedOrder.orderStatus !== RestaurantOrderStatus.Cancelled &&
                  selectedOrder.orderStatus !== RestaurantOrderStatus.Completed && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={actionLoading}
                      onClick={() =>
                        handleStatusTransition(selectedOrder._id, RestaurantOrderStatus.Cancelled)
                      }
                      className="text-red-500 hover:text-red-600"
                    >
                      Cancel
                    </Button>
                  )}
              </div>
            </div>
          )
        }
      >
        {selectedOrder && (
          <div className="space-y-6 pb-6 text-sm">
            {/* Status and Summary Header */}
            <div className="p-4 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-outline uppercase tracking-wider block">
                  Current Status
                </span>
                <div className="mt-1">{getStatusBadge(selectedOrder.orderStatus)}</div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-outline uppercase tracking-wider block">
                  Grand Total
                </span>
                <span className="text-lg font-serif font-bold text-primary">
                  ₦{(selectedOrder.totalAmount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Guest & Destination Card */}
            <div className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant space-y-3">
              <span className="text-xs font-bold text-outline uppercase tracking-wider block">
                Destination & Guest
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-outline block">Guest Name:</span>
                  <span className="font-semibold text-on-surface">{selectedOrder.customer?.name}</span>
                </div>
                <div>
                  <span className="text-outline block">Contact Phone:</span>
                  <span className="font-semibold text-on-surface">{selectedOrder.customer?.phone}</span>
                </div>
                <div>
                  <span className="text-outline block">Delivery Type:</span>
                  <span className="font-semibold text-on-surface">
                    {selectedOrder.deliveryType === RestaurantDeliveryType.InRoom
                      ? `Room Service (Room ${selectedOrder.roomNumber || '-'})`
                      : `External (${selectedOrder.deliveryLocation?.zoneName || 'Delivery'})`}
                  </span>
                </div>
                <div>
                  <span className="text-outline block">Payment Method:</span>
                  <span className="font-semibold text-on-surface uppercase">
                    {selectedOrder.paymentMethod} • {selectedOrder.paymentStatus}
                  </span>
                </div>
              </div>
              {selectedOrder.deliveryLocation?.address && (
                <div className="pt-2 border-t border-outline-variant text-xs">
                  <span className="text-outline block">Delivery Address:</span>
                  <span className="font-medium text-on-surface">{selectedOrder.deliveryLocation.address}</span>
                </div>
              )}
              {selectedOrder.orderNotes && (
                <div className="pt-2 border-t border-outline-variant text-xs bg-amber-500/5 p-2 rounded">
                  <span className="text-amber-700 font-bold block">Guest Cooking Notes:</span>
                  <p className="text-on-surface italic mt-0.5">"{selectedOrder.orderNotes}"</p>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-outline uppercase tracking-wider block">
                Ordered Dishes ({selectedOrder.items.length})
              </span>
              <div className="border border-outline-variant rounded-lg overflow-hidden divide-y divide-outline-variant">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-surface-container-lowest flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {item.quantity}x
                        </span>
                        <span className="font-semibold text-sm text-on-surface">{item.name}</span>
                        {item.selectedSize && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-surface-container text-outline font-medium">
                            {item.selectedSize.name}
                          </span>
                        )}
                      </div>

                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <div className="text-xs text-outline mt-1 pl-6 space-y-0.5">
                          {item.selectedOptions.map((opt, oIdx) => (
                            <p key={oIdx}>
                              • {opt.groupName}: <span className="font-medium text-on-surface">{opt.optionName}</span>
                              {opt.extraPrice > 0 && ` (+₦${opt.extraPrice.toLocaleString()})`}
                            </p>
                          ))}
                        </div>
                      )}

                      {item.specialInstructions && (
                        <p className="text-[11px] text-amber-600 italic mt-1 pl-6">
                          Note: "{item.specialInstructions}"
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs font-semibold text-on-surface">
                        ₦{item.lineTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Breakdown summary */}
            <div className="p-4 rounded-lg bg-surface-container space-y-1.5 text-xs">
              <div className="flex justify-between text-outline">
                <span>Subtotal</span>
                <span className="font-mono">₦{selectedOrder.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-outline">
                <span>Delivery Fee</span>
                <span className="font-mono">
                  {selectedOrder.deliveryFee === 0 ? 'FREE' : `₦${selectedOrder.deliveryFee.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between text-on-surface font-bold pt-2 border-t border-outline-variant text-sm">
                <span>Grand Total</span>
                <span className="font-mono text-primary">
                  ₦{(selectedOrder.totalAmount || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
