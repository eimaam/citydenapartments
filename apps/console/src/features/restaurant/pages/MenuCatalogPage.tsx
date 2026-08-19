import { useState, useEffect, useCallback, useRef } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Layers,
  Sparkles,
  Tag,
  Upload,
  X,
} from 'lucide-react';
import {
  Button,
  Input,
  Select,
  Option,
  Drawer,
  Badge,
  Table,
  RoomStatus,
  OptionSelectionType,
} from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import type {
  MenuCategoryResponse,
  MenuItemResponse,
  MenuItemSize,
  MenuItemOptionGroup,
} from '@citydenapartments/shared';
import { useToast } from '../../../components/ui/Toast';
import { restaurantAdminApi } from '../api/restaurant-admin.api';

const LIMIT = 20;

export default function MenuCatalogPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items');

  // Categories state
  const [categories, setCategories] = useState<MenuCategoryResponse[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategoryResponse | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', icon: '', sortOrder: 0 });

  // Items state
  const [items, setItems] = useState<MenuItemResponse[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Item Drawer State
  const [itemDrawerOpen, setItemDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemResponse | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Item Form State
  const [itemForm, setItemForm] = useState<{
    name: string;
    categoryId: string;
    description: string;
    images: string[];
    basePrice: number;
    hasSizes: boolean;
    sizes: MenuItemSize[];
    optionGroups: MenuItemOptionGroup[];
    estimatedPrepTimeMinutes: number;
    isAvailable: boolean;
    isChefSpecial: boolean;
    tags: string[];
    sortOrder: number;
  }>({
    name: '',
    categoryId: '',
    description: '',
    images: [],
    basePrice: 0,
    hasSizes: false,
    sizes: [],
    optionGroups: [],
    estimatedPrepTimeMinutes: 15,
    isAvailable: true,
    isChefSpecial: false,
    tags: [],
    sortOrder: 0,
  });

  const [tagInput, setTagInput] = useState('');

  // 1. Fetch Categories
  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const data = await restaurantAdminApi.getCategories();
      setCategories(data);
    } catch {
      toast('error', 'Failed to load menu categories.');
    } finally {
      setCategoriesLoading(false);
    }
  }, [toast]);

  // 2. Fetch Menu Items
  const fetchItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const res = await restaurantAdminApi.getMenuItems({
        page,
        limit: LIMIT,
        search,
        categoryId: selectedCategoryFilter === 'all' ? undefined : selectedCategoryFilter,
      });
      setItems(res.items || []);
      setTotalItems(res.total || 0);
    } catch {
      toast('error', 'Failed to load menu dishes.');
    } finally {
      setItemsLoading(false);
    }
  }, [page, search, selectedCategoryFilter, toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (activeTab === 'items') {
      fetchItems();
    }
  }, [fetchItems, activeTab]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedCategoryFilter]);

  const onSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await restaurantAdminApi.uploadImage(file);
      setItemForm((prev) => ({
        ...prev,
        images: [...prev.images, res.url],
      }));
      toast('success', 'Dish image uploaded successfully.');
    } catch (err: any) {
      toast('error', err.message || 'Failed to upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Category Save
  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast('error', 'Category name is required.');
      return;
    }
    try {
      if (editingCategory) {
        await restaurantAdminApi.updateCategory(editingCategory._id, categoryForm);
        toast('success', 'Category updated.');
      } else {
        await restaurantAdminApi.createCategory(categoryForm);
        toast('success', 'Category created.');
      }
      setCategoryDrawerOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast('error', err.message || 'Failed to save category.');
    }
  };

  // Item Save
  const handleSaveItem = async () => {
    if (!itemForm.name.trim()) {
      toast('error', 'Dish name is required.');
      return;
    }
    if (!itemForm.categoryId) {
      toast('error', 'Please select a menu category.');
      return;
    }
    if (itemForm.basePrice < 0) {
      toast('error', 'Base price cannot be negative.');
      return;
    }

    setSavingItem(true);
    try {
      if (editingItem) {
        await restaurantAdminApi.updateMenuItem(editingItem._id, itemForm);
        toast('success', 'Dish updated successfully.');
      } else {
        await restaurantAdminApi.createMenuItem(itemForm);
        toast('success', 'Dish created successfully.');
      }
      setItemDrawerOpen(false);
      fetchItems();
    } catch (err: any) {
      toast('error', err.message || 'Failed to save dish.');
    } finally {
      setSavingItem(false);
    }
  };

  // Quick Stock Toggle
  const handleToggleStock = async (id: string, currentStatus: boolean) => {
    try {
      await restaurantAdminApi.toggleItemAvailability(id);
      toast('success', !currentStatus ? 'Marked in stock.' : 'Marked out of stock.');
      fetchItems();
    } catch {
      toast('error', 'Failed to update stock status.');
    }
  };

  const openNewItemDrawer = () => {
    setEditingItem(null);
    setItemForm({
      name: '',
      categoryId: categories[0]?._id || '',
      description: '',
      images: [],
      basePrice: 2500,
      hasSizes: false,
      sizes: [],
      optionGroups: [],
      estimatedPrepTimeMinutes: 20,
      isAvailable: true,
      isChefSpecial: false,
      tags: [],
      sortOrder: 0,
    });
    setItemDrawerOpen(true);
  };

  const openEditItemDrawer = (item: MenuItemResponse) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      categoryId: typeof item.categoryId === 'string' ? item.categoryId : item.categoryId._id,
      description: item.description || '',
      images: item.images || [],
      basePrice: item.basePrice || 0,
      hasSizes: item.hasSizes || false,
      sizes: item.sizes || [],
      optionGroups: item.optionGroups || [],
      estimatedPrepTimeMinutes: item.estimatedPrepTimeMinutes || 15,
      isAvailable: item.isAvailable,
      isChefSpecial: item.isChefSpecial || false,
      tags: item.tags || [],
      sortOrder: item.sortOrder || 0,
    });
    setItemDrawerOpen(true);
  };

  // Columns for Items Table
  const itemColumns: TableProps<MenuItemResponse>['columns'] = [
    {
      title: 'Dish / Beverage',
      key: 'name',
      render: (_: unknown, r: MenuItemResponse) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-surface-container flex items-center justify-center overflow-hidden shrink-0 border border-outline-variant">
            {r.images && r.images.length > 0 ? (
              <img src={r.images[0]} alt={r.name} className="w-full h-full object-cover" />
            ) : (
              <UtensilsCrossed size={16} className="text-outline" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-on-surface text-sm">{r.name}</span>
              {r.isChefSpecial && (
                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-500/10 text-amber-600">
                  Chef's Pick
                </span>
              )}
            </div>
            <p className="text-xs text-outline line-clamp-1 max-w-xs">{r.description || 'No description'}</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      render: (_: unknown, r: MenuItemResponse) => (
        <span className="text-xs font-medium text-outline">
          {typeof r.categoryId === 'object' ? r.categoryId?.name : 'General'}
        </span>
      ),
    },
    {
      title: 'Price',
      key: 'price',
      render: (_: unknown, r: MenuItemResponse) => (
        <div className="font-mono text-sm font-semibold text-on-surface">
          ₦{r.basePrice.toLocaleString()}
          {r.hasSizes && r.sizes && r.sizes.length > 0 && (
            <span className="block text-[10px] text-outline font-normal">
              {r.sizes.length} portion sizes
            </span>
          )}
        </div>
      ),
    },
    {
      title: 'Options',
      key: 'options',
      render: (_: unknown, r: MenuItemResponse) => (
        <span className="text-xs text-outline">
          {r.optionGroups && r.optionGroups.length > 0
            ? `${r.optionGroups.length} modifier group${r.optionGroups.length > 1 ? 's' : ''}`
            : 'Standard'}
        </span>
      ),
    },
    {
      title: 'Stock Status',
      key: 'status',
      width: 140,
      render: (_: unknown, r: MenuItemResponse) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleStock(r._id, r.isAvailable);
          }}
          className="cursor-pointer"
        >
          <Badge
            status={r.isAvailable ? RoomStatus.Available : RoomStatus.Maintenance}
            label={r.isAvailable ? 'In Stock' : 'Out of Stock'}
          />
        </button>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      render: (_: unknown, r: MenuItemResponse) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<Edit2 size={13} />}
            onClick={(e) => {
              e.stopPropagation();
              openEditItemDrawer(r);
            }}
          />
        </div>
      ),
    },
  ];

  // Columns for Categories Table
  const categoryColumns: TableProps<MenuCategoryResponse>['columns'] = [
    {
      title: 'Category Name',
      key: 'name',
      render: (_: unknown, r: MenuCategoryResponse) => (
        <div>
          <span className="font-semibold text-sm text-on-surface">{r.name}</span>
          {r.description && <p className="text-xs text-outline">{r.description}</p>}
        </div>
      ),
    },
    {
      title: 'Sort Order',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 100,
      render: (_: unknown, r: MenuCategoryResponse) => <span className="font-mono">{r.sortOrder}</span>,
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_: unknown, r: MenuCategoryResponse) => (
        <Badge status={r.isActive ? RoomStatus.Available : RoomStatus.Maintenance} label={r.isActive ? 'Active' : 'Disabled'} />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      render: (_: unknown, r: MenuCategoryResponse) => (
        <Button
          size="sm"
          variant="secondary"
          icon={<Edit2 size={13} />}
          onClick={(e) => {
            e.stopPropagation();
            setEditingCategory(r);
            setCategoryForm({
              name: r.name,
              description: r.description || '',
              icon: r.icon || '',
              sortOrder: r.sortOrder || 0,
            });
            setCategoryDrawerOpen(true);
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
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Restaurant & Dining</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Menu Catalog</h1>
        <div className="flex items-center gap-3">
          {activeTab === 'items' && (
            <>
              <Input
                size="sm"
                placeholder="Search dishes..."
                prefix={<Search size={14} className="text-outline" />}
                value={searchInput}
                onChange={(e) => onSearchChange(e.target.value)}
                className="!w-64"
              />
              <Button size="sm" icon={<Plus size={14} />} onClick={openNewItemDrawer}>
                New Dish
              </Button>
            </>
          )}

          {activeTab === 'categories' && (
            <Button
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: '', description: '', icon: '', sortOrder: categories.length });
                setCategoryDrawerOpen(true);
              }}
            >
              New Category
            </Button>
          )}
        </div>
      </div>

      {/* Tab Strip */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex gap-1 p-1 rounded bg-surface-container w-fit">
          <button
            key="items"
            onClick={() => setActiveTab('items')}
            className="px-3 py-1.5 text-xs font-medium rounded-sm transition-all cursor-pointer"
            style={{
              background: activeTab === 'items' ? 'var(--color-surface-container-lowest)' : 'transparent',
              color: activeTab === 'items' ? 'var(--color-on-surface)' : 'var(--color-outline)',
              boxShadow: activeTab === 'items' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            Dishes & Drinks ({totalItems})
          </button>
          <button
            key="categories"
            onClick={() => setActiveTab('categories')}
            className="px-3 py-1.5 text-xs font-medium rounded-sm transition-all cursor-pointer"
            style={{
              background: activeTab === 'categories' ? 'var(--color-surface-container-lowest)' : 'transparent',
              color: activeTab === 'categories' ? 'var(--color-on-surface)' : 'var(--color-outline)',
              boxShadow: activeTab === 'categories' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            Menu Categories ({categories.length})
          </button>
        </div>

        {activeTab === 'items' && categories.length > 0 && (
          <div className="w-52">
            <Select
              size="sm"
              className="w-full"
              value={selectedCategoryFilter}
              onChange={(v) => setSelectedCategoryFilter(v)}
            >
              <Option value="all">All Categories</Option>
              {categories.map((c) => (
                <Option key={c._id} value={c._id}>
                  {c.name}
                </Option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Table Data Shell */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        {activeTab === 'items' ? (
          <Table<MenuItemResponse>
            columns={itemColumns}
            dataSource={items}
            rowKey="_id"
            loading={itemsLoading}
            pagination={{
              current: page,
              pageSize: LIMIT,
              total: totalItems,
              showSizeChanger: false,
              onChange: (p) => setPage(p),
            }}
            onRow={(r) => ({
              onClick: () => openEditItemDrawer(r),
              style: { cursor: 'pointer' },
            })}
          />
        ) : (
          <Table<MenuCategoryResponse>
            columns={categoryColumns}
            dataSource={categories}
            rowKey="_id"
            loading={categoriesLoading}
            pagination={false}
            onRow={(r) => ({
              onClick: () => {
                setEditingCategory(r);
                setCategoryForm({
                  name: r.name,
                  description: r.description || '',
                  icon: r.icon || '',
                  sortOrder: r.sortOrder || 0,
                });
                setCategoryDrawerOpen(true);
              },
              style: { cursor: 'pointer' },
            })}
          />
        )}
      </div>

      {/* Dish Drawer */}
      <Drawer
        open={itemDrawerOpen}
        onClose={() => setItemDrawerOpen(false)}
        title={editingItem ? `Edit Dish: ${editingItem.name}` : 'New Menu Dish'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setItemDrawerOpen(false)}>
              Cancel
            </Button>
            <Button loading={savingItem} onClick={handleSaveItem}>
              {editingItem ? 'Save Changes' : 'Create Dish'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 pb-6">
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 block">
              Dish Name *
            </label>
            <Input
              size="lg"
              placeholder="e.g. Royal Masa with Gbegiri & Spicy Stew"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 block">
                Category *
              </label>
              <Select
                size="lg"
                className="w-full"
                placeholder="Select Category"
                value={itemForm.categoryId || undefined}
                onChange={(v) => setItemForm({ ...itemForm, categoryId: v })}
              >
                {categories.map((c) => (
                  <Option key={c._id} value={c._id}>
                    {c.name}
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 block">
                Base Price (₦) *
              </label>
              <Input
                size="lg"
                type="number"
                placeholder="2500"
                value={itemForm.basePrice}
                onChange={(e) => setItemForm({ ...itemForm, basePrice: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 block">
              Description
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-md border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary"
              placeholder="Flavor notes, key ingredients, preparation details..."
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
            />
          </div>

          {/* Dish Image Uploader */}
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 block">
              Dish Photos (Cloudflare R2)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md bg-surface-container border border-outline-variant text-xs font-semibold text-on-surface hover:border-primary transition-all">
                <Upload size={14} className="text-primary" />
                {uploadingImage ? 'Uploading to R2...' : 'Upload Photo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            </div>
            {itemForm.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {itemForm.images.map((img, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-outline-variant group">
                    <img src={img} alt="dish" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        setItemForm({
                          ...itemForm,
                          images: itemForm.images.filter((_, idx) => idx !== i),
                        })
                      }
                      className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Portion Sizes Builder */}
          <div className="p-4 rounded-lg bg-surface-container border border-outline-variant space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface block">
                  Portion Sizes (Optional)
                </span>
                <p className="text-[11px] text-outline">
                  e.g. Regular, Large, or Family Pack with distinct prices
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus size={12} />}
                onClick={() =>
                  setItemForm({
                    ...itemForm,
                    hasSizes: true,
                    sizes: [
                      ...itemForm.sizes,
                      { name: '', price: itemForm.basePrice, isDefault: itemForm.sizes.length === 0 },
                    ],
                  })
                }
              >
                Add Size
              </Button>
            </div>

            {itemForm.sizes.map((sz, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  size="sm"
                  placeholder="Size name (e.g. 6 Pieces, Large)"
                  value={sz.name}
                  onChange={(e) => {
                    const next = [...itemForm.sizes];
                    next[idx].name = e.target.value;
                    setItemForm({ ...itemForm, sizes: next });
                  }}
                  className="flex-1"
                />
                <Input
                  size="sm"
                  type="number"
                  placeholder="Price (₦)"
                  value={sz.price}
                  onChange={(e) => {
                    const next = [...itemForm.sizes];
                    next[idx].price = Number(e.target.value);
                    setItemForm({ ...itemForm, sizes: next });
                  }}
                  className="w-28"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = itemForm.sizes.filter((_, i) => i !== idx);
                    setItemForm({ ...itemForm, sizes: next, hasSizes: next.length > 0 });
                  }}
                  className="p-1.5 text-outline hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Modifier Option Groups Builder */}
          <div className="p-4 rounded-lg bg-surface-container border border-outline-variant space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface block">
                  Modifier Option Groups (Deep Choices)
                </span>
                <p className="text-[11px] text-outline">
                  e.g. Choice of Soup for Masa (Miyan Kuka, Egusi, Vegetable)
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus size={12} />}
                onClick={() =>
                  setItemForm({
                    ...itemForm,
                    optionGroups: [
                      ...itemForm.optionGroups,
                      {
                        name: '',
                        selectionType: OptionSelectionType.SingleSelect,
                        required: true,
                        minSelections: 1,
                        maxSelections: 1,
                        options: [{ name: '', extraPrice: 0, isAvailable: true }],
                      },
                    ],
                  })
                }
              >
                Add Group
              </Button>
            </div>

            {itemForm.optionGroups.map((group, gIdx) => (
              <div key={gIdx} className="p-3 bg-surface-container-lowest rounded-md border border-outline-variant space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    size="sm"
                    placeholder="Group Title (e.g. Choose Your Soup)"
                    value={group.name}
                    onChange={(e) => {
                      const next = [...itemForm.optionGroups];
                      next[gIdx].name = e.target.value;
                      setItemForm({ ...itemForm, optionGroups: next });
                    }}
                    className="flex-1"
                  />
                  <Select
                    size="sm"
                    value={group.selectionType}
                    onChange={(v: any) => {
                      const next = [...itemForm.optionGroups];
                      next[gIdx].selectionType = v;
                      setItemForm({ ...itemForm, optionGroups: next });
                    }}
                    className="w-36"
                  >
                    <Option value={OptionSelectionType.SingleSelect}>Single Choice</Option>
                    <Option value={OptionSelectionType.MultiSelect}>Multi Choice</Option>
                  </Select>
                  <button
                    type="button"
                    onClick={() => {
                      const next = itemForm.optionGroups.filter((_, i) => i !== gIdx);
                      setItemForm({ ...itemForm, optionGroups: next });
                    }}
                    className="p-1 text-outline hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-1.5 pl-2 border-l-2 border-primary/30 mt-2">
                  {group.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <Input
                        size="sm"
                        placeholder="Option name (e.g. Miyan Kuka)"
                        value={opt.name}
                        onChange={(e) => {
                          const next = [...itemForm.optionGroups];
                          next[gIdx].options[oIdx].name = e.target.value;
                          setItemForm({ ...itemForm, optionGroups: next });
                        }}
                        className="flex-1"
                      />
                      <Input
                        size="sm"
                        type="number"
                        placeholder="+₦ Extra Price"
                        value={opt.extraPrice}
                        onChange={(e) => {
                          const next = [...itemForm.optionGroups];
                          next[gIdx].options[oIdx].extraPrice = Number(e.target.value);
                          setItemForm({ ...itemForm, optionGroups: next });
                        }}
                        className="w-28"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...itemForm.optionGroups];
                          next[gIdx].options = next[gIdx].options.filter((_, i) => i !== oIdx);
                          setItemForm({ ...itemForm, optionGroups: next });
                        }}
                        className="p-1 text-outline hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...itemForm.optionGroups];
                      next[gIdx].options.push({ name: '', extraPrice: 0, isAvailable: true });
                      setItemForm({ ...itemForm, optionGroups: next });
                    }}
                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer pt-1 block"
                  >
                    + Add Option Item
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Availability & Specials Checkboxes */}
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer">
              <input
                type="checkbox"
                checked={itemForm.isAvailable}
                onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.checked })}
                className="w-4 h-4 rounded border-outline-variant text-primary"
              />
              In Stock for Orders
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer">
              <input
                type="checkbox"
                checked={itemForm.isChefSpecial}
                onChange={(e) => setItemForm({ ...itemForm, isChefSpecial: e.target.checked })}
                className="w-4 h-4 rounded border-outline-variant text-primary"
              />
              Highlight as Chef's Special
            </label>
          </div>
        </div>
      </Drawer>

      {/* Category Drawer */}
      <Drawer
        open={categoryDrawerOpen}
        onClose={() => setCategoryDrawerOpen(false)}
        title={editingCategory ? 'Edit Category' : 'New Menu Category'}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCategoryDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory}>
              {editingCategory ? 'Save' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 block">
              Category Name *
            </label>
            <Input
              size="lg"
              placeholder="e.g. Local Delicacies, Grills, Drinks"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 block">
              Description
            </label>
            <Input
              size="lg"
              placeholder="Brief description..."
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 block">
              Sort Order
            </label>
            <Input
              size="lg"
              type="number"
              value={categoryForm.sortOrder}
              onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: Number(e.target.value) })}
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
