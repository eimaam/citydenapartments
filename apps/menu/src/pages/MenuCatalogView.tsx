import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Minus,
  Sparkles,
  Clock,
  UtensilsCrossed,
  RefreshCw,
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { menuPublicApi } from '../lib/api';
import type {
  MenuCategoryResponse,
  MenuItemResponse,
  RestaurantBannerResponse,
} from '@citydenapartments/shared';
import { ItemCustomizerModal } from '../components/ItemCustomizerModal';

export function MenuCatalogView({ onGoToCart }: { onGoToCart: () => void }) {
  const { activeBranch, addItem, updateQuantity, items: cartItems, subtotal, totalItemsCount } = useCart();

  const [categories, setCategories] = useState<MenuCategoryResponse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [menuItems, setMenuItems] = useState<MenuItemResponse[]>([]);
  const [banners, setBanners] = useState<RestaurantBannerResponse[]>([]);
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedItemForCustomization, setSelectedItemForCustomization] = useState<MenuItemResponse | null>(null);

  // Fetch Categories & Banners
  useEffect(() => {
    if (!activeBranch) return;

    menuPublicApi
      .getCategories(activeBranch._id)
      .then((c) => setCategories(c || []))
      .catch(() => {});

    menuPublicApi
      .getBanners(activeBranch._id)
      .then((b) => setBanners(b || []))
      .catch(() => {});
  }, [activeBranch]);

  // Banner Auto Carousel
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveBannerIdx((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners]);

  // Fetch Menu Items (Server-Side Search & Category Filter)
  const fetchMenuItems = useCallback(async () => {
    if (!activeBranch) return;
    setLoading(true);
    try {
      const res = await menuPublicApi.getMenuItems({
        branchId: activeBranch._id,
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: search.trim() || undefined,
        limit: 100,
      });
      setMenuItems(res.items || []);
    } catch {
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeBranch, selectedCategory, search]);

  useEffect(() => {
    const delayTimer = setTimeout(() => {
      fetchMenuItems();
    }, 200);
    return () => clearTimeout(delayTimer);
  }, [fetchMenuItems]);

  // Handle Quick Add / Customizer Modal Trigger
  const handleItemCardClick = (item: MenuItemResponse) => {
    // If item has portion sizes OR nested options, open the customizer modal
    if (
      (item.hasSizes && item.sizes && item.sizes.length > 0) ||
      (item.optionGroups && item.optionGroups.length > 0)
    ) {
      setSelectedItemForCustomization(item);
    } else {
      // Simple item - direct add 1
      addItem(item, 1);
    }
  };

  // Find quantity of a specific item in cart
  const getItemCartQuantity = (itemId: string): number => {
    return cartItems
      .filter((i) => i.menuItem._id === itemId)
      .reduce((sum, i) => sum + i.quantity, 0);
  };

  return (
    <div className="pb-24 max-w-md mx-auto">
      {/* 1. Promotional Banners Slider */}
      {banners.length > 0 && (
        <div className="px-4 pt-3">
          <div className="relative h-40 w-full rounded-2xl overflow-hidden shadow-sm border border-border">
            {banners.map((b, idx) => (
              <div
                key={b._id}
                className={`absolute inset-0 transition-opacity duration-500 ${
                  activeBannerIdx === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                {b.imageUrl ? (
                  <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-primary to-primary-dark p-6 flex flex-col justify-center text-white" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-4 flex flex-col justify-end text-white">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold bg-primary/90 text-on-primary px-2 py-0.5 rounded-md w-fit mb-1">
                    {b.bannerType?.replace('_', ' ')}
                  </span>
                  <h3 className="font-bold font-serif text-lg leading-tight drop-shadow-sm">{b.title}</h3>
                  {b.subtitle && <p className="text-xs text-white/90 line-clamp-1 mt-0.5">{b.subtitle}</p>}
                </div>
              </div>
            ))}

            {/* Indicator Dots */}
            {banners.length > 1 && (
              <div className="absolute bottom-2 right-3 z-20 flex items-center gap-1.5">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveBannerIdx(idx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      activeBannerIdx === idx ? 'w-4 bg-primary' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Search Bar */}
      <div className="px-4 pt-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search Masa, Suya, Soups, Drinks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface text-foreground placeholder:text-muted-foreground text-xs font-medium rounded-2xl border border-border focus:outline-none focus:border-primary shadow-xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 3. Category Horizontal Pills Slider */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-primary text-on-primary shadow-xs scale-102'
                : 'bg-surface text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            All Dishes
          </button>

          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setSelectedCategory(cat._id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedCategory === cat._id
                  ? 'bg-primary text-on-primary shadow-xs scale-102'
                  : 'bg-surface text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              <span>{cat.icon || '🍽️'}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Menu Items Listing */}
      <div className="px-4 pt-2 space-y-3">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <RefreshCw size={24} className="animate-spin text-primary" />
            <p className="text-xs">Fetching meals...</p>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="py-16 bg-surface rounded-2xl border border-border text-center p-6 space-y-2">
            <UtensilsCrossed size={40} className="text-muted-foreground/40 mx-auto" />
            <h4 className="font-bold text-sm text-foreground">No dishes found</h4>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {search ? `No meals matching "${search}". Try searching for another dish.` : 'No meals in this category currently.'}
            </p>
          </div>
        ) : (
          menuItems.map((item) => {
            const qtyInCart = getItemCartQuantity(item._id);
            const hasOptionsOrSizes =
              (item.hasSizes && item.sizes && item.sizes.length > 0) ||
              (item.optionGroups && item.optionGroups.length > 0);

            return (
              <div
                key={item._id}
                onClick={() => handleItemCardClick(item)}
                className="p-3.5 bg-surface rounded-2xl border border-border hover:border-primary/40 transition-all flex items-start gap-3 shadow-xs cursor-pointer active:scale-99"
              >
                {/* Food Image */}
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-surface-hover shrink-0 border border-border">
                  {item.images?.[0] ? (
                    <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🍲</div>
                  )}

                  {item.isChefSpecial && (
                    <div className="absolute top-1 left-1 bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs">
                      <Sparkles size={9} /> Special
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                  <div>
                    <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-1">{item.name}</h3>

                    {item.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-tight">
                        {item.description}
                      </p>
                    )}

                    {item.estimatedPrepTimeMinutes && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                        <Clock size={11} /> ~{item.estimatedPrepTimeMinutes}m prep
                        {hasOptionsOrSizes && <span className="text-primary font-medium ml-1">• Customizable</span>}
                      </span>
                    )}
                  </div>

                  {/* Price & Smart Button */}
                  <div className="flex items-center justify-between pt-2 mt-auto">
                    <div className="font-bold font-mono text-sm text-foreground">
                      {item.hasSizes && item.sizes?.length ? (
                        <span>
                          <span className="text-[10px] text-muted-foreground font-sans uppercase font-semibold">From </span>
                          ₦{Math.min(...item.sizes.map((s) => s.price)).toLocaleString()}
                        </span>
                      ) : (
                        <span>₦{item.basePrice.toLocaleString()}</span>
                      )}
                    </div>

                    {/* Action Button */}
                    <div onClick={(e) => e.stopPropagation()}>
                      {qtyInCart > 0 ? (
                        <div className="flex items-center bg-primary text-on-primary rounded-xl px-2 py-1 shadow-xs">
                          <button
                            type="button"
                            onClick={() => {
                              // Find first cart item with this id to reduce
                              const matched = cartItems.find((c) => c.menuItem._id === item._id);
                              if (matched) updateQuantity(matched.id, -1);
                            }}
                            className="w-5 h-5 flex items-center justify-center cursor-pointer active:scale-90"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-2 text-xs font-bold font-mono">{qtyInCart}</span>
                          <button
                            type="button"
                            onClick={() => handleItemCardClick(item)}
                            className="w-5 h-5 flex items-center justify-center cursor-pointer active:scale-90"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleItemCardClick(item)}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer active:scale-95 border border-primary/20"
                        >
                          <Plus size={13} /> Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Cart Bar (if items in cart) */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-16 left-4 right-4 z-40 max-w-md mx-auto animate-in slide-in-from-bottom-4">
          <button
            onClick={onGoToCart}
            className="w-full py-3.5 px-5 bg-primary hover:bg-primary-dark text-on-primary rounded-2xl shadow-xl flex items-center justify-between cursor-pointer active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center">
                {totalItemsCount}
              </span>
              <span className="font-bold text-sm">View Cart</span>
            </div>
            <span className="font-bold font-mono text-base">₦{subtotal.toLocaleString()} →</span>
          </button>
        </div>
      )}

      {/* Customizer Modal for portion sizes & options */}
      <ItemCustomizerModal
        item={selectedItemForCustomization}
        onClose={() => setSelectedItemForCustomization(null)}
        onAddToCart={(dish, qty, size, opts, notes) => {
          addItem(dish, qty, size, opts, notes);
        }}
      />
    </div>
  );
}
