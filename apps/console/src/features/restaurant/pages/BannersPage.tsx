import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Plus, Search, Edit2, Trash2, Upload, X } from 'lucide-react';
import {
  Button,
  Input,
  Select,
  Option,
  Drawer,
  Badge,
  Table,
  RoomStatus,
} from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import type { RestaurantBannerResponse, BannerTypeType } from '@citydenapartments/shared';
import { BannerType } from '@citydenapartments/shared';
import { useToast } from '../../../components/ui/Toast';
import { restaurantAdminApi } from '../api/restaurant-admin.api';

export default function BannersPage() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<RestaurantBannerResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<RestaurantBannerResponse | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState<{
    title: string;
    subtitle: string;
    imageUrl: string;
    bannerType: BannerTypeType;
    actionLink: string;
    isActive: boolean;
    sortOrder: number;
  }>({
    title: '',
    subtitle: '',
    imageUrl: '',
    bannerType: BannerType.MealPromo,
    actionLink: '',
    isActive: true,
    sortOrder: 0,
  });

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await restaurantAdminApi.getBanners();
      setBanners(data || []);
    } catch {
      toast('error', 'Failed to load banners.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const res = await restaurantAdminApi.uploadImage(files[0]);
      setForm((prev) => ({ ...prev, imageUrl: res.url }));
      toast('success', 'Banner image uploaded successfully.');
    } catch (err: any) {
      toast('error', err.response?.data?.message || err.message || 'Failed to upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const openCreate = () => {
    setEditingBanner(null);
    setForm({
      title: '',
      subtitle: '',
      imageUrl: '',
      bannerType: BannerType.MealPromo,
      actionLink: '',
      isActive: true,
      sortOrder: banners.length,
    });
    setDrawerOpen(true);
  };

  const openEdit = (b: RestaurantBannerResponse) => {
    setEditingBanner(b);
    setForm({
      title: b.title,
      subtitle: b.subtitle || '',
      imageUrl: b.imageUrl,
      bannerType: b.bannerType,
      actionLink: b.actionLink || '',
      isActive: b.isActive,
      sortOrder: b.sortOrder || 0,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast('error', 'Banner title is required.');
      return;
    }
    if (!form.imageUrl.trim()) {
      toast('error', 'Please upload a banner image.');
      return;
    }

    try {
      if (editingBanner) {
        await restaurantAdminApi.updateBanner(editingBanner._id, form);
        toast('success', 'Banner updated.');
      } else {
        await restaurantAdminApi.createBanner(form);
        toast('success', 'Banner published.');
      }
      setDrawerOpen(false);
      setEditingBanner(null);
      fetchBanners();
    } catch (err: any) {
      toast('error', err.response?.data?.message || err.message || 'Failed to save banner.');
    }
  };

  const handleDelete = async (b: RestaurantBannerResponse) => {
    if (!confirm(`Are you sure you want to delete banner "${b.title}"?`)) return;
    try {
      await restaurantAdminApi.deleteBanner(b._id);
      toast('success', 'Banner removed.');
      fetchBanners();
    } catch (err: any) {
      toast('error', err.response?.data?.message || err.message || 'Failed to delete banner.');
    }
  };

  const filteredBanners = banners.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      (b.subtitle && b.subtitle.toLowerCase().includes(search.toLowerCase()))
  );

  const columns: TableProps<RestaurantBannerResponse>['columns'] = [
    {
      title: 'Banner Preview',
      key: 'preview',
      width: 140,
      render: (_: unknown, r: RestaurantBannerResponse) => (
        <div className="w-24 h-12 rounded-md bg-surface-container overflow-hidden border border-outline-variant">
          <img src={r.imageUrl} alt={r.title} className="w-full h-full object-cover" />
        </div>
      ),
    },
    {
      title: 'Title & Headline',
      key: 'title',
      render: (_: unknown, r: RestaurantBannerResponse) => (
        <div>
          <span className="font-semibold text-sm text-on-surface block">{r.title}</span>
          {r.subtitle && <p className="text-xs text-outline line-clamp-1">{r.subtitle}</p>}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'bannerType',
      key: 'type',
      width: 130,
      render: (type: string) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary-container/20 text-primary">
          {type}
        </span>
      ),
    },
    {
      title: 'Sort Order',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 100,
      render: (order: number) => <span className="font-mono text-xs">{order || 0}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'status',
      width: 120,
      render: (active: boolean) => (
        <Badge
          status={active ? RoomStatus.Available : RoomStatus.Maintenance}
          label={active ? 'Live' : 'Hidden'}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, r: RestaurantBannerResponse) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<Edit2 size={13} />}
            onClick={(e) => {
              e.stopPropagation();
              openEdit(r);
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            icon={<Trash2 size={13} className="text-red-500" />}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(r);
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8">
      {/* Eyebrow Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">
          Promotions & Marketing
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Digital Menu Banners</h1>
        <div className="flex items-center gap-3">
          <Input
            size="sm"
            placeholder="Search banners..."
            prefix={<Search size={14} className="text-outline" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!w-64"
          />
          <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>
            New Banner
          </Button>
        </div>
      </div>

      {/* Table Data Shell */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <Table<RestaurantBannerResponse>
          columns={columns}
          dataSource={filteredBanners}
          rowKey="_id"
          loading={loading}
          pagination={false}
          onRow={(r) => ({
            onClick: () => openEdit(r),
            style: { cursor: 'pointer' },
          })}
        />
      </div>

      {/* Create / Edit Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingBanner ? `Edit Banner: ${editingBanner.title}` : 'New Promotional Banner'}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingBanner ? 'Save Changes' : 'Publish Banner'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 block">
              Banner Title *
            </label>
            <Input
              size="lg"
              placeholder="e.g. Weekend Suya & Cocktail Special"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 block">
              Subtitle / Tagline
            </label>
            <Input
              size="lg"
              placeholder="e.g. 20% off all chef special grills today"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
          </div>

          {/* Banner Photo Upload */}
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 block">
              Banner Graphic *
            </label>
            {form.imageUrl ? (
              <div className="relative w-full h-32 rounded-lg overflow-hidden border border-outline-variant mb-2 group">
                <img src={form.imageUrl} alt="banner" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, imageUrl: '' })}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center h-28 border-2 border-dashed border-outline-variant rounded-lg bg-surface-container hover:border-primary transition-all">
                <Upload size={20} className="text-primary mb-1" />
                <span className="text-xs font-semibold text-on-surface">
                  {uploadingImage ? 'Uploading image...' : 'Click to upload banner photo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 block">
                Banner Type
              </label>
              <Select
                size="lg"
                className="w-full"
                value={form.bannerType}
                onChange={(v: any) => setForm({ ...form, bannerType: v })}
              >
                {Object.values(BannerType).map((t) => (
                  <Option key={t} value={t}>
                    {t}
                  </Option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 block">
                Sort Order
              </label>
              <Input
                size="lg"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-outline-variant text-primary"
              />
              Publish and display on Digital Menu
            </label>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
