import { useState, useEffect } from 'react';
import { CartProvider, useCart } from './contexts/CartContext';
import { MenuHeader } from './components/layout/MenuHeader';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import type { MenuTab } from './components/layout/MobileBottomNav';
import { BranchSelectLanding } from './pages/BranchSelectLanding';
import { MenuCatalogView } from './pages/MenuCatalogView';
import { CartCheckoutView } from './pages/CartCheckoutView';
import { DeliveryZonesView } from './pages/DeliveryZonesView';
import { TrackOrderView } from './pages/TrackOrderView';
import type { RestaurantOrderResponse } from '@citydenapartments/shared';

function MenuAppContent() {
  const { activeBranch } = useCart();
  const [currentTab, setCurrentTab] = useState<MenuTab>('menu');
  const [lastPlacedOrder, setLastPlacedOrder] = useState<RestaurantOrderResponse | null>(null);

  // Automatically scroll to top whenever tab or view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentTab]);

  // If no active branch selected, show branch landing first
  if (!activeBranch) {
    return <BranchSelectLanding onSelectBranch={() => setCurrentTab('menu')} />;
  }

  const handleOrderSuccess = (order: RestaurantOrderResponse) => {
    setLastPlacedOrder(order);
    setCurrentTab('track');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between selection:bg-primary/20">
      {/* Top Header with quick-dropdown branch switcher */}
      <MenuHeader />

      {/* Main Views Container */}
      <main className="flex-1">
        {currentTab === 'menu' && (
          <MenuCatalogView onGoToCart={() => setCurrentTab('cart')} />
        )}

        {currentTab === 'cart' && (
          <CartCheckoutView
            onBackToMenu={() => setCurrentTab('menu')}
            onOrderSuccess={handleOrderSuccess}
          />
        )}

        {currentTab === 'delivery' && <DeliveryZonesView />}

        {currentTab === 'track' && (
          <TrackOrderView initialOrderNumber={lastPlacedOrder?.orderNumber} />
        )}
      </main>

      {/* Sticky Mobile Bottom Navigation Bar */}
      <MobileBottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />
    </div>
  );
}

export default function App() {
  return (
    <CartProvider>
      <MenuAppContent />
    </CartProvider>
  );
}
