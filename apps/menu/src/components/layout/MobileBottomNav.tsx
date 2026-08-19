import { UtensilsCrossed, ShoppingBag, Truck, Clock } from 'lucide-react';
import { Badge } from 'antd';
import { useCart } from '../../contexts/CartContext';

export type MenuTab = 'menu' | 'cart' | 'delivery' | 'track';

export function MobileBottomNav({
  currentTab,
  onSelectTab,
}: {
  currentTab: MenuTab;
  onSelectTab: (tab: MenuTab) => void;
}) {
  const { totalItemsCount } = useCart();

  const navItems = [
    { key: 'menu' as MenuTab, label: 'Menu', icon: UtensilsCrossed },
    { key: 'cart' as MenuTab, label: 'Cart', icon: ShoppingBag, badge: totalItemsCount },
    { key: 'delivery' as MenuTab, label: 'Delivery', icon: Truck },
    { key: 'track' as MenuTab, label: 'Track Order', icon: Clock },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-lg border-t border-border px-2 py-2 safe-area-pb shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.key;

          return (
            <button
              key={item.key}
              onClick={() => onSelectTab(item.key)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
                isActive ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground font-medium'
              }`}
            >
              <div className="relative">
                {item.badge !== undefined && item.badge > 0 ? (
                  <Badge count={item.badge} size="small" offset={[6, -2]} color="#d4af37">
                    <Icon size={16} className={isActive ? 'scale-110 text-primary transition-transform' : ''} />
                  </Badge>
                ) : (
                  <Icon size={16} className={isActive ? 'scale-110 text-primary transition-transform' : ''} />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
