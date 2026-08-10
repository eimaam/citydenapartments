import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search, Package, AlertTriangle, ArrowDownCircle, ArrowUpCircle, Plus, Clock, Trash2, Pencil,
  ChevronRight, ArrowLeft, Building2, Utensils, Sparkles, Wrench, Shirt, Shield, Headphones
} from 'lucide-react';
import { useAuth } from '../../../contexts/auth';
import { useToast } from '../../../components/ui/Toast';
import { Input, Select, Option, Drawer, Button, UserRole, Departments, INVENTORY_UNITS } from '@citydenapartments/shared';
import { can } from '../../../components/ui/Can';
import { inventoryApi, type InventoryItem } from '../api/inventory.api';
import { employeesApi, type Employee } from '../../employees/api/employees.api';
import { departmentsApi } from '../../department-expenses/api/department-expenses.api';
import { format, isBefore, differenceInDays } from 'date-fns';

const LIMIT = 20;

// Department Icon Map
const DEPT_ICONS: Record<string, any> = {
  Kitchen: Utensils,
  Housekeeping: Sparkles,
  'Front Desk': Headphones,
  Maintenance: Wrench,
  Laundry: Shirt,
  Security: Shield,
  Admin: Building2,
};

export default function InventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isManager = can(user, [UserRole.StoreManager, UserRole.SuperAdmin, UserRole.Accountant]);
  const canAdd = can(user, [UserRole.StoreManager, UserRole.SuperAdmin, UserRole.StoreKeeper]);
  const canIssue = can(user, [UserRole.StoreKeeper, UserRole.StoreManager, UserRole.SuperAdmin]);

  const [dbDepartments, setDbDepartments] = useState<Array<{ _id: string; name: string }>>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<{ _id: string; name: string } | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summaryData, setSummaryData] = useState<Array<{ departmentId: string | null; count: number; totalValue: number; lowStockCount: number }>>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [actionItem, setActionItem] = useState<InventoryItem | null>(null);
  const [actionType, setActionType] = useState<'issue' | 'restock' | null>(null);
  const [qty, setQty] = useState(1);
  const [restockUnitPrice, setRestockUnitPrice] = useState<string | number>('');
  const [requestedBy, setRequestedBy] = useState('');
  const [issueDepartment, setIssueDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    departmentId: '',
    category: '',
    description: '',
    unit: 'pcs',
    currentStock: 0,
    reorderLevel: 0,
    unitPrice: '' as string | number,
    expiryDate: '',
  });

  const [empSearch, setEmpSearch] = useState('');
  const [empResults, setEmpResults] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empSelectedId, setEmpSelectedId] = useState<string | null>(null);
  const [empFocus, setEmpFocus] = useState(false);

  const [spoilItem, setSpoilItem] = useState<InventoryItem | null>(null);
  const [spoilQty, setSpoilQty] = useState(1);
  const [spoilType, setSpoilType] = useState('expired');
  const [spoilReason, setSpoilReason] = useState('');
  const [spoilNotes, setSpoilNotes] = useState('');

  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    departmentId: '',
    category: '',
    description: '',
    unit: 'pcs',
    reorderLevel: '' as string | number,
    unitPrice: '' as string | number,
    expiryDate: '',
  });

  const spoilTypes = [
    { value: 'expired', label: 'Expired' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'contaminated', label: 'Contaminated' },
    { value: 'stolen', label: 'Stolen' },
    { value: 'lost', label: 'Lost' },
    { value: 'other', label: 'Other' },
  ];

  const getItemDeptId = (item: InventoryItem): string => {
    if (typeof item.departmentId === 'object' && item.departmentId?._id) return item.departmentId._id;
    return (item.departmentId as string) || '';
  };

  const getItemDeptName = (item: InventoryItem): string => {
    if (typeof item.departmentId === 'object' && item.departmentId?.name) return item.departmentId.name;
    return 'Unassigned';
  };

  useEffect(() => {
    departmentsApi.list().then((depts) => setDbDepartments(depts)).catch(() => {});
  }, []);

  // Fetch paginated inventory list
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.listItems({
        page,
        limit: LIMIT,
        search: search || undefined,
        departmentId: selectedDepartment?._id || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      toast('error', 'Failed to load inventory items.');
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedDepartment, toast]);

  // Fetch department summary metrics overview
  const fetchDepartmentSummaries = useCallback(async () => {
    try {
      const res = await inventoryApi.getDepartmentSummaries();
      setSummaryData(res);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchDepartmentSummaries();
  }, [fetchDepartmentSummaries]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedDepartment]);

  const empTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!empSearch.trim() || empSelectedId) {
      setEmpResults([]);
      return;
    }
    setEmpLoading(true);
    clearTimeout(empTimer.current!);
    empTimer.current = setTimeout(async () => {
      try {
        const res = await employeesApi.search(empSearch);
        setEmpResults(res);
      } catch {
        /* ignore */
      } finally {
        setEmpLoading(false);
      }
    }, 300);
    return () => clearTimeout(empTimer.current!);
  }, [empSearch, empSelectedId]);

  const selectEmployee = (emp: Employee) => {
    setRequestedBy(emp.name);
    setEmpSelectedId(emp._id);
    setEmpSearch('');
    setEmpResults([]);
    if (emp.department && !issueDepartment) setIssueDepartment(emp.department);
  };

  const onSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current!);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  const openAction = (item: InventoryItem, type: 'issue' | 'restock') => {
    setActionItem(item);
    setActionType(type);
    setQty(1);
    setRestockUnitPrice(item.unitPrice ?? item.costPrice ?? '');
    setRequestedBy('');
    setIssueDepartment('');
    setNotes('');
    setEmpSelectedId(null);
    setEmpSearch('');
    setEmpResults([]);
  };

  const submitAction = async () => {
    if (!actionItem || !actionType) return;
    if (qty < 1) {
      toast('error', 'Quantity must be at least 1.');
      return;
    }
    if (actionType === 'issue' && qty > actionItem.currentStock) {
      toast('error', `Only ${actionItem.currentStock} ${actionItem.unit} available.`);
      return;
    }
    setSubmitting(true);
    try {
      if (actionType === 'issue') {
        await inventoryApi.issue(actionItem._id, {
          quantity: qty,
          requestedBy: requestedBy || undefined,
          requestedEmployeeId: empSelectedId || undefined,
          department: issueDepartment || undefined,
          notes: notes || undefined,
        });
        toast('success', `Issued ${qty} ${actionItem.unit} of ${actionItem.name}.`);
      } else {
        await inventoryApi.restock(actionItem._id, {
          quantity: qty,
          unitPrice: restockUnitPrice !== '' ? Number(restockUnitPrice) : undefined,
          notes: notes || undefined,
        });
        toast('success', `Restocked ${qty} ${actionItem.unit} of ${actionItem.name}.`);
      }
      setActionItem(null);
      setActionType(null);
      fetchItems();
      fetchDepartmentSummaries();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setCreateForm({
      name: '',
      departmentId: selectedDepartment?._id || (dbDepartments[0]?._id ?? ''),
      category: '',
      description: '',
      unit: 'pcs',
      currentStock: 0,
      reorderLevel: 0,
      unitPrice: '',
      expiryDate: '',
    });
    setShowCreate(true);
  };

  const createItem = async () => {
    if (!createForm.name || !createForm.departmentId || !createForm.category || !createForm.unit) {
      toast('error', 'Name, Department, Category, and Unit are required.');
      return;
    }
    if (createForm.unitPrice === '' || Number(createForm.unitPrice) < 0) {
      toast('error', 'Unit price is mandatory and must be 0 or greater.');
      return;
    }
    setSubmitting(true);
    try {
      await inventoryApi.createItem({
        name: createForm.name,
        departmentId: createForm.departmentId,
        category: createForm.category,
        description: createForm.description || undefined,
        unit: createForm.unit,
        currentStock: Number(createForm.currentStock) || 0,
        reorderLevel: Number(createForm.reorderLevel) || 0,
        unitPrice: Number(createForm.unitPrice) || 0,
        expiryDate: createForm.expiryDate || undefined,
      });
      toast('success', `Created inventory item ${createForm.name}.`);
      setShowCreate(false);
      fetchItems();
      fetchDepartmentSummaries();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (item: InventoryItem) => {
    setEditItem(item);
    setEditForm({
      name: item.name,
      departmentId: getItemDeptId(item),
      category: item.category,
      description: item.description || '',
      unit: item.unit,
      reorderLevel: item.reorderLevel ?? 0,
      unitPrice: item.unitPrice ?? item.costPrice ?? '',
      expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
    });
  };

  const submitEdit = async () => {
    if (!editItem) return;
    if (!editForm.name.trim() || !editForm.departmentId || !editForm.category.trim() || !editForm.unit) {
      toast('error', 'Name, Department, Category, and Unit are required.');
      return;
    }
    if (editForm.unitPrice === '' || Number(editForm.unitPrice) < 0) {
      toast('error', 'Unit price must be 0 or greater.');
      return;
    }
    setSubmitting(true);
    try {
      await inventoryApi.updateItem(editItem._id, {
        name: editForm.name,
        departmentId: editForm.departmentId,
        category: editForm.category,
        description: editForm.description || undefined,
        unit: editForm.unit,
        reorderLevel: Number(editForm.reorderLevel) || 0,
        unitPrice: Number(editForm.unitPrice) || 0,
        expiryDate: editForm.expiryDate || undefined,
      });
      toast('success', `Updated inventory item ${editForm.name}.`);
      setEditItem(null);
      fetchItems();
      fetchDepartmentSummaries();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openSpoilage = (item: InventoryItem) => {
    setSpoilItem(item);
    setSpoilQty(1);
    setSpoilType('expired');
    setSpoilReason('');
    setSpoilNotes('');
  };

  const submitSpoilage = async () => {
    if (!spoilItem) return;
    if (spoilQty < 1) {
      toast('error', 'Quantity must be at least 1.');
      return;
    }
    if (spoilQty > spoilItem.currentStock) {
      toast('error', `Only ${spoilItem.currentStock} ${spoilItem.unit} available.`);
      return;
    }
    if (!spoilReason.trim()) {
      toast('error', 'Reason is required.');
      return;
    }
    setSubmitting(true);
    try {
      await inventoryApi.reportSpoilage(spoilItem._id, {
        quantity: spoilQty,
        spoilageType: spoilType,
        reason: spoilReason,
        notes: spoilNotes || undefined,
      });
      toast('success', 'Spoilage reported. Awaiting approval.');
      setSpoilItem(null);
      fetchItems();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isLowStock = (item: InventoryItem) => item.currentStock <= item.reorderLevel;
  const isExpired = (item: InventoryItem) => item.expiryDate && isBefore(new Date(item.expiryDate), new Date());
  const isExpiringSoon = (item: InventoryItem) => {
    if (!item.expiryDate || isExpired(item)) return false;
    return differenceInDays(new Date(item.expiryDate), new Date()) <= 30;
  };

  const stockColor = (item: InventoryItem) => {
    if (isExpired(item)) return 'text-red-500';
    if (item.currentStock === 0) return 'text-red-500';
    if (isLowStock(item)) return 'text-amber-500';
    return 'text-emerald-500';
  };

  // Department metrics summary calculations from server aggregation
  const deptSummaries = useMemo(() => {
    const summaryMap: Record<string, { id: string; name: string; count: number; value: number; lowStockCount: number }> = {};
    for (const d of dbDepartments) {
      summaryMap[d._id] = { id: d._id, name: d.name, count: 0, value: 0, lowStockCount: 0 };
    }
    for (const s of summaryData) {
      if (s.departmentId && summaryMap[s.departmentId]) {
        summaryMap[s.departmentId].count = s.count;
        summaryMap[s.departmentId].value = s.totalValue;
        summaryMap[s.departmentId].lowStockCount = s.lowStockCount;
      }
    }
    return summaryMap;
  }, [dbDepartments, summaryData]);

  // Live forms calculations
  const createFormTotalCost = useMemo(() => {
    const qty = Number(createForm.currentStock) || 0;
    const price = Number(createForm.unitPrice) || 0;
    return qty * price;
  }, [createForm.currentStock, createForm.unitPrice]);

  const actionRestockCalculations = useMemo(() => {
    if (!actionItem) return { batchTotalCost: 0, batchUnitPrice: 0, newAvgUnitPrice: 0, currentPrice: 0 };
    const currentPrice = actionItem.unitPrice ?? actionItem.costPrice ?? 0;
    const batchUnitPrice = restockUnitPrice !== '' ? Number(restockUnitPrice) : currentPrice;
    const batchTotalCost = qty * batchUnitPrice;
    const newStock = actionItem.currentStock + qty;
    const existingValue = actionItem.currentStock * currentPrice;
    const newAvgUnitPrice = newStock > 0 ? Math.round((existingValue + batchTotalCost) / newStock) : batchUnitPrice;
    return { batchTotalCost, batchUnitPrice, newAvgUnitPrice, currentPrice };
  }, [actionItem, qty, restockUnitPrice]);

  return (
    <div className="p-6 md:p-8">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="w-8 h-px bg-primary" />
          <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">
            Store {selectedDepartment ? `· ${selectedDepartment.name}` : ''}
          </span>
        </div>
        {selectedDepartment && (
          <button
            onClick={() => setSelectedDepartment(null)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer bg-transparent border-0"
          >
            <ArrowLeft size={14} /> Back to All Departments
          </button>
        )}
      </div>

      {/* Main Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">
            {selectedDepartment ? `${selectedDepartment.name} Inventory` : 'Inventory Departments'}
          </h1>
          <p className="text-xs text-outline mt-1">
            {selectedDepartment
              ? `Manage items, stock levels, and issue requests for ${selectedDepartment.name}.`
              : 'Select a department to view and manage assigned inventory items.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedDepartment && (
            <Input
              size="sm"
              placeholder="Search items..."
              prefix={<Search size={14} className="text-outline" />}
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
              className="!w-56"
            />
          )}
          {canAdd && (
            <Button size="sm" icon={<Plus size={14} />} onClick={openCreateModal}>
              Add Item
            </Button>
          )}
        </div>
      </div>

      {/* Department Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-outline-variant/60">
        <button
          onClick={() => setSelectedDepartment(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border cursor-pointer ${
            selectedDepartment === null
              ? 'bg-primary text-on-primary border-primary'
              : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container'
          }`}
        >
          All Departments Overview
        </button>
        {dbDepartments.map((dept) => {
          const info = deptSummaries[dept._id] || { count: 0 };
          const isSelected = selectedDepartment?._id === dept._id;
          return (
            <button
              key={dept._id}
              onClick={() => setSelectedDepartment(dept)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container'
              }`}
            >
              <span>{dept.name}</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-surface-container-high text-outline'
                }`}
              >
                {info.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* VIEW 1: Department Overview Cards Grid (when selectedDepartment is null AND not actively searching) */}
      {selectedDepartment === null && !search && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {dbDepartments.map((dept) => {
            const IconComp = DEPT_ICONS[dept.name] || Building2;
            const summary = deptSummaries[dept._id] || { count: 0, value: 0, lowStockCount: 0 };

            return (
              <div
                key={dept._id}
                onClick={() => setSelectedDepartment(dept)}
                className="p-5 rounded-xl border border-outline-variant bg-surface-container-lowest hover:border-primary hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <IconComp size={20} />
                    </div>
                    {summary.lowStockCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle size={10} /> {summary.lowStockCount} Low
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                    {dept.name}
                  </h3>
                  <p className="text-xs text-outline mt-0.5">{summary.count} inventory items</p>
                </div>

                <div className="mt-6 pt-3 border-t border-outline-variant/60 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline">Total Value</p>
                    <p className="text-sm font-bold text-on-surface">₦{summary.value.toLocaleString()}</p>
                  </div>
                  <span className="text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                    Open <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: Items List Table (Filtered by department or showing search results) */}
      {(selectedDepartment !== null || search) && (
        <div className="grid gap-3">
          {items.map((item) => {
            const price = item.unitPrice ?? item.costPrice ?? 0;
            return (
              <div
                key={item._id}
                className="p-4 rounded-lg border border-outline-variant bg-surface-container-lowest flex items-center justify-between hover:border-outline transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isLowStock(item) ? 'bg-amber-50' : 'bg-surface-container'
                    }`}
                  >
                    <Package size={16} className={stockColor(item)} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-on-surface truncate">{item.name}</p>
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-surface-container-high text-on-surface-variant">
                        {getItemDeptName(item)}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Category: {item.category} · Unit: {item.unit}
                    </p>
                    <p className="text-[11px] text-outline font-medium">
                      Unit Price: ₦{price.toLocaleString()} | Stock Value: ₦
                      {(item.currentStock * price).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.expiryDate && (
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                            isExpired(item)
                              ? 'bg-red-50 text-red-600'
                              : isExpiringSoon(item)
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-green-50 text-green-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isExpired(item) || isExpiringSoon(item) ? 'animate-pulse bg-current' : 'bg-current'
                            }`}
                          />
                          {isExpired(item)
                            ? `Expired ${format(new Date(item.expiryDate), 'MMM d, yyyy')}`
                            : `Exp ${format(new Date(item.expiryDate), 'MMM d, yyyy')}`}
                        </span>
                      )}
                      {isLowStock(item) && item.currentStock > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600">
                          <AlertTriangle size={10} className="animate-pulse" />
                          Low Stock
                        </span>
                      )}
                      {item.pendingSpoilageQuantity && item.pendingSpoilageQuantity > 0 ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                          ({item.pendingSpoilageQuantity} Pending Write-off)
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className={`text-lg font-bold ${stockColor(item)}`}>{item.currentStock}</p>
                    <p className="text-[10px] text-outline">Reorder at {item.reorderLevel}</p>
                  </div>
                  {isExpired(item) && <Clock size={16} className="text-red-500" />}
                  {!isExpired(item) && isLowStock(item) && item.currentStock > 0 && (
                    <AlertTriangle size={16} className="text-amber-500" />
                  )}
                  {!isExpired(item) && item.currentStock === 0 && (
                    <AlertTriangle size={16} className="text-red-500" />
                  )}
                  <div className="flex gap-2">
                    {isManager && (
                      <button
                        onClick={() => openEditModal(item)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded border border-outline-variant hover:bg-surface-container cursor-pointer bg-transparent text-on-surface-variant hover:text-on-surface"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    )}
                    {canIssue && (
                      <button
                        onClick={() => openAction(item, 'issue')}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded border border-outline-variant hover:bg-surface-container cursor-pointer bg-transparent text-on-surface-variant hover:text-on-surface"
                      >
                        <ArrowDownCircle size={12} /> Issue
                      </button>
                    )}
                    {isManager && (
                      <button
                        onClick={() => openAction(item, 'restock')}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded border border-outline-variant hover:bg-surface-container cursor-pointer bg-transparent text-on-surface-variant hover:text-on-surface"
                      >
                        <ArrowUpCircle size={12} /> Restock
                      </button>
                    )}
                    {isManager && (
                      <button
                        onClick={() => openSpoilage(item)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded border border-red-200 hover:bg-red-50 cursor-pointer bg-transparent text-red-500 hover:text-red-600"
                      >
                        <Trash2 size={12} /> Write Off
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!loading && items.length === 0 && (
            <p className="text-center text-sm text-outline py-12">No inventory items found.</p>
          )}
          {total > LIMIT && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-xs rounded border border-outline-variant disabled:opacity-30 cursor-pointer disabled:cursor-default"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-xs text-outline">
                Page {page} of {Math.ceil(total / LIMIT)}
              </span>
              <button
                disabled={page >= Math.ceil(total / LIMIT)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-xs rounded border border-outline-variant disabled:opacity-30 cursor-pointer disabled:cursor-default"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Restock & Issue Drawer */}
      <Drawer
        open={!!actionItem}
        onClose={() => {
          setActionItem(null);
          setActionType(null);
        }}
        title={actionType === 'issue' ? 'Issue Item' : 'Restock Item'}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setActionItem(null);
                setActionType(null);
              }}
            >
              Cancel
            </Button>
            <Button loading={submitting} onClick={submitAction}>
              {actionType === 'issue' ? 'Issue' : 'Restock'}
            </Button>
          </div>
        }
      >
        {actionItem && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-surface-container border border-outline-variant">
              <p className="font-medium text-sm">{actionItem.name}</p>
              <p className="text-xs text-outline">
                {getItemDeptName(actionItem)} · {actionItem.category} · Current stock: <strong>{actionItem.currentStock}</strong>{' '}
                {actionItem.unit}
              </p>
              <p className="text-xs font-semibold text-primary mt-1">
                Unit Price: ₦{(actionItem.unitPrice ?? actionItem.costPrice ?? 0).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Quantity</label>
              <Input
                size="lg"
                type="number"
                step="any"
                min={0.001}
                max={actionType === 'issue' ? actionItem.currentStock : undefined}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="mt-1"
              />
            </div>

            {/* Live Total Calculation */}
            {actionType === 'restock' && (
              <>
                <div>
                  <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">
                    Restock Unit Price (₦) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    size="lg"
                    type="number"
                    min={0}
                    placeholder="Enter unit price for this purchase"
                    value={restockUnitPrice}
                    onChange={(e) => setRestockUnitPrice(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-[11px] text-outline mt-1">
                    Current price in system: ₦{actionRestockCalculations.currentPrice.toLocaleString()}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-on-surface-variant">
                    <span>Batch Purchase Cost ({qty} × ₦{actionRestockCalculations.batchUnitPrice.toLocaleString()}):</span>
                    <span className="font-semibold text-on-surface">₦{actionRestockCalculations.batchTotalCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-dashed border-outline-variant/60 font-medium">
                    <span className="text-primary">New Weighted Avg Unit Price:</span>
                    <span className="font-bold text-sm text-primary">
                      ₦{actionRestockCalculations.newAvgUnitPrice.toLocaleString()} / {actionItem.unit}
                    </span>
                  </div>
                </div>
              </>
            )}

            {actionType === 'issue' && (
              <>
                <div className="relative">
                  <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Requested By</label>
                  <div className="relative mt-1">
                    <Input
                      size="lg"
                      placeholder="Search employee or type a name"
                      value={empSelectedId ? requestedBy : empSearch}
                      onChange={(e) => {
                        setEmpSearch(e.target.value);
                        setRequestedBy(e.target.value);
                        setEmpSelectedId(null);
                      }}
                      onFocus={() => setEmpFocus(true)}
                      onBlur={() => setTimeout(() => setEmpFocus(false), 200)}
                    />
                    {empSelectedId && (
                      <button
                        onClick={() => {
                          setEmpSelectedId(null);
                          setEmpSearch('');
                          setRequestedBy('');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-outline text-xs hover:text-on-surface cursor-pointer bg-transparent border-0"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {empFocus && empResults.length > 0 && (
                    <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg border border-outline-variant bg-surface-container-lowest shadow-lg max-h-48 overflow-y-auto">
                      {empResults.map((emp) => (
                        <button
                          key={emp._id}
                          onMouseDown={() => selectEmployee(emp)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-surface-container transition-colors cursor-pointer border-0 bg-transparent"
                        >
                          <p className="font-medium">{emp.name}</p>
                          <p className="text-[10px] text-outline">
                            {emp.position || emp.department || ''}
                            {emp.position && emp.department ? ` · ${emp.department}` : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {empFocus && empLoading && (
                    <div className="absolute z-10 left-0 right-0 mt-1 p-3 text-center text-xs text-outline bg-surface-container-lowest rounded-lg border border-outline-variant shadow-lg">
                      Searching...
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Or Destination Department</label>
                  <Select
                    size="lg"
                    className="w-full mt-1"
                    value={issueDepartment}
                    onChange={(v) => setIssueDepartment(v)}
                  >
                    <Option value="">None</Option>
                    {Departments.map((d) => (
                      <Option key={d} value={d}>
                        {d}
                      </Option>
                    ))}
                  </Select>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Notes</label>
              <Input
                size="lg"
                placeholder="Optional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </Drawer>

      {/* Spoilage / Write Off Drawer */}
      <Drawer
        open={!!spoilItem}
        onClose={() => setSpoilItem(null)}
        title="Report Spoilage / Write-Off"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setSpoilItem(null)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={submitSpoilage} variant="destructive">
              Submit for Approval
            </Button>
          </div>
        }
      >
        {spoilItem && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-surface-container">
              <p className="font-medium text-sm">{spoilItem.name}</p>
              <p className="text-xs text-outline">
                {getItemDeptName(spoilItem)} · Current stock: <strong>{spoilItem.currentStock}</strong> {spoilItem.unit}
              </p>
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Quantity</label>
              <Input
                size="lg"
                type="number"
                step="any"
                min={0.001}
                max={spoilItem.currentStock}
                value={spoilQty}
                onChange={(e) => setSpoilQty(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Spoilage Type</label>
              <Select size="lg" className="w-full mt-1" value={spoilType} onChange={(v) => setSpoilType(v)}>
                {spoilTypes.map((t) => (
                  <Option key={t.value} value={t.value}>
                    {t.label}
                  </Option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">
                Reason <span className="text-red-500">*</span>
              </label>
              <Input
                size="lg"
                placeholder="Explain why this is being written off"
                value={spoilReason}
                onChange={(e) => setSpoilReason(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Additional Notes</label>
              <Input
                size="lg"
                placeholder="Optional details"
                value={spoilNotes}
                onChange={(e) => setSpoilNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </Drawer>

      {/* Add Inventory Item Drawer */}
      <Drawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add Inventory Item"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={createItem}>
              Create Item
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">
              Item Name <span className="text-red-500">*</span>
            </label>
            <Input
              size="lg"
              placeholder="e.g. Toilet Roll 2-ply"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">
              Department <span className="text-red-500">*</span>
            </label>
            <Select
              size="lg"
              className="w-full mt-1"
              value={createForm.departmentId}
              onChange={(v) => setCreateForm({ ...createForm, departmentId: v })}
            >
              <Option value="">Select Department</Option>
              {dbDepartments.map((d) => (
                <Option key={d._id} value={d._id}>
                  {d.name}
                </Option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">
                Category <span className="text-red-500">*</span>
              </label>
              <Input
                size="lg"
                placeholder="e.g. Cleaning Supplies"
                value={createForm.category}
                onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">
                Unit <span className="text-red-500">*</span>
              </label>
              <Select
                size="lg"
                className="w-full mt-1"
                value={createForm.unit}
                onChange={(v) => setCreateForm({ ...createForm, unit: v })}
              >
                {INVENTORY_UNITS.map((u) => (
                  <Option key={u.value} value={u.value}>
                    {u.label}
                  </Option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Description</label>
            <Input
              size="lg"
              placeholder="Optional item description"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Initial Stock</label>
              <Input
                size="lg"
                type="number"
                min={0}
                value={createForm.currentStock}
                onChange={(e) => setCreateForm({ ...createForm, currentStock: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Reorder Level</label>
              <Input
                size="lg"
                type="number"
                min={0}
                value={createForm.reorderLevel}
                onChange={(e) => setCreateForm({ ...createForm, reorderLevel: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">
                Unit Price (₦) <span className="text-red-500">*</span>
              </label>
              <Input
                size="lg"
                type="number"
                min={0}
                placeholder="e.g. 1500"
                value={createForm.unitPrice}
                onChange={(e) => setCreateForm({ ...createForm, unitPrice: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Expiry Date</label>
              <Input
                size="lg"
                type="date"
                value={createForm.expiryDate}
                onChange={(e) => setCreateForm({ ...createForm, expiryDate: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          {/* Live Total Stock Cost Calculation */}
          <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant flex items-center justify-between text-xs">
            <span className="text-outline font-medium">Initial Total Stock Value:</span>
            <span className="font-bold text-sm text-primary">₦{createFormTotalCost.toLocaleString()}</span>
          </div>
        </div>
      </Drawer>

      {/* Edit Item Drawer */}
      <Drawer
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="Edit Inventory Item"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={submitEdit}>
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">
              Item Name <span className="text-red-500">*</span>
            </label>
            <Input
              size="lg"
              placeholder="e.g. Toilet Roll 2-ply"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">
              Department <span className="text-red-500">*</span>
            </label>
            <Select
              size="lg"
              className="w-full mt-1"
              value={editForm.departmentId}
              onChange={(v) => setEditForm({ ...editForm, departmentId: v })}
            >
              <Option value="">Select Department</Option>
              {dbDepartments.map((d) => (
                <Option key={d._id} value={d._id}>
                  {d.name}
                </Option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">
                Category <span className="text-red-500">*</span>
              </label>
              <Input
                size="lg"
                placeholder="e.g. Cleaning Supplies"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">
                Unit <span className="text-red-500">*</span>
              </label>
              <Select
                size="lg"
                className="w-full mt-1"
                value={editForm.unit}
                onChange={(v) => setEditForm({ ...editForm, unit: v })}
              >
                {INVENTORY_UNITS.map((u) => (
                  <Option key={u.value} value={u.value}>
                    {u.label}
                  </Option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Description</label>
            <Input
              size="lg"
              placeholder="Optional notes or description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Reorder Level</label>
              <Input
                size="lg"
                type="number"
                min={0}
                placeholder="e.g. 5"
                value={editForm.reorderLevel}
                onChange={(e) => setEditForm({ ...editForm, reorderLevel: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">
                Unit Price (₦) <span className="text-red-500">*</span>
              </label>
              <Input
                size="lg"
                type="number"
                min={0}
                placeholder="e.g. 1500"
                value={editForm.unitPrice}
                onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Expiry Date</label>
              <Input
                size="lg"
                type="date"
                value={editForm.expiryDate}
                onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
