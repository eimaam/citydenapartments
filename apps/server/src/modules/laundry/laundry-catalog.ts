export interface CatalogItem {
  category: string;
  item: string;
  laundryPrice: number;
  pressingPrice: number | null;
}

export const LAUNDRY_CATALOG: CatalogItem[] = [
  // ── MEN'S WEAR ─────────────────────────────────────────────
  { category: "MEN'S WEAR", item: 'Agbada', laundryPrice: 4000, pressingPrice: 2000 },
  { category: "MEN'S WEAR", item: 'Cap', laundryPrice: 500, pressingPrice: 500 },
  { category: "MEN'S WEAR", item: 'Complete National', laundryPrice: 3000, pressingPrice: 2000 },
  { category: "MEN'S WEAR", item: 'Handkerchief', laundryPrice: 500, pressingPrice: 300 },
  { category: "MEN'S WEAR", item: 'Jacket', laundryPrice: 4000, pressingPrice: 3000 },
  { category: "MEN'S WEAR", item: 'Jumper', laundryPrice: 3000, pressingPrice: 2000 },
  { category: "MEN'S WEAR", item: 'Kaftan', laundryPrice: 4000, pressingPrice: 2500 },
  { category: "MEN'S WEAR", item: "Lawyer's Collar", laundryPrice: 800, pressingPrice: 500 },
  { category: "MEN'S WEAR", item: "Lawyer's Gown", laundryPrice: 3000, pressingPrice: 2500 },
  { category: "MEN'S WEAR", item: 'Pyjamas', laundryPrice: 2500, pressingPrice: 1500 },
  { category: "MEN'S WEAR", item: 'Safari Suit', laundryPrice: 3000, pressingPrice: 2000 },
  { category: "MEN'S WEAR", item: 'Shirt', laundryPrice: 1000, pressingPrice: 750 },
  { category: "MEN'S WEAR", item: 'Socks', laundryPrice: 500, pressingPrice: null },
  { category: "MEN'S WEAR", item: 'Sokoto', laundryPrice: 1500, pressingPrice: 1000 },
  { category: "MEN'S WEAR", item: 'Short', laundryPrice: 1000, pressingPrice: 500 },
  { category: "MEN'S WEAR", item: 'Suit 2 Pcs', laundryPrice: 4000, pressingPrice: 3000 },
  { category: "MEN'S WEAR", item: 'Suit 3 Pcs', laundryPrice: 5000, pressingPrice: 3000 },
  { category: "MEN'S WEAR", item: 'Sweater Pull Over', laundryPrice: 1500, pressingPrice: 1000 },
  { category: "MEN'S WEAR", item: 'T-Shirt', laundryPrice: 1000, pressingPrice: null },
  { category: "MEN'S WEAR", item: 'Tie', laundryPrice: 500, pressingPrice: 250 },
  { category: "MEN'S WEAR", item: 'Track Suit', laundryPrice: 1500, pressingPrice: 1000 },
  { category: "MEN'S WEAR", item: 'Trouser', laundryPrice: 1000, pressingPrice: 500 },
  { category: "MEN'S WEAR", item: 'Under Pant/Boxer', laundryPrice: 1000, pressingPrice: null },
  { category: "MEN'S WEAR", item: 'Under Shirt', laundryPrice: 600, pressingPrice: 250 },
  { category: "MEN'S WEAR", item: 'Waistcoat', laundryPrice: 2000, pressingPrice: 1000 },
  { category: "MEN'S WEAR", item: 'Winter Coat', laundryPrice: 5000, pressingPrice: 3000 },

  // ── WOMEN'S WEAR ───────────────────────────────────────────
  { category: "WOMEN'S WEAR", item: 'Blouse', laundryPrice: 1500, pressingPrice: 1000 },
  { category: "WOMEN'S WEAR", item: 'Boubou', laundryPrice: 2000, pressingPrice: 1000 },
  { category: "WOMEN'S WEAR", item: 'Brassier', laundryPrice: 1000, pressingPrice: null },
  { category: "WOMEN'S WEAR", item: 'Buba', laundryPrice: 1700, pressingPrice: 1000 },
  { category: "WOMEN'S WEAR", item: 'Dressing Gown', laundryPrice: 1700, pressingPrice: 1000 },
  { category: "WOMEN'S WEAR", item: 'Head Tie/Scarf', laundryPrice: 500, pressingPrice: 250 },
  { category: "WOMEN'S WEAR", item: 'India Sareen', laundryPrice: 2000, pressingPrice: 1000 },
  { category: "WOMEN'S WEAR", item: 'Ladies Kaftan', laundryPrice: 2000, pressingPrice: 1000 },
  { category: "WOMEN'S WEAR", item: 'Night Dress', laundryPrice: 1000, pressingPrice: 500 },
  { category: "WOMEN'S WEAR", item: 'Panties', laundryPrice: 1500, pressingPrice: null },
  { category: "WOMEN'S WEAR", item: 'Skirt', laundryPrice: 1000, pressingPrice: 500 },
  { category: "WOMEN'S WEAR", item: 'Slack', laundryPrice: 1000, pressingPrice: 500 },
  { category: "WOMEN'S WEAR", item: 'TROUSER/SKIRT SUIT 2 PCS', laundryPrice: 2000, pressingPrice: 1000 },
  { category: "WOMEN'S WEAR", item: 'TROUSER/SKIRT SUIT 3 PCS', laundryPrice: 2500, pressingPrice: 1500 },
  { category: "WOMEN'S WEAR", item: 'UNDER SLIP', laundryPrice: 1200, pressingPrice: null },
  { category: "WOMEN'S WEAR", item: 'WEDDING GOWN', laundryPrice: 16000, pressingPrice: 5000 },
  { category: "WOMEN'S WEAR", item: 'WRAPPER', laundryPrice: 1700, pressingPrice: 650 },

  // ── OTHERS ─────────────────────────────────────────────────
  { category: 'OTHERS', item: 'BATHROBE', laundryPrice: 5000, pressingPrice: 4000 },
  { category: 'OTHERS', item: 'BED COVER', laundryPrice: 2500, pressingPrice: 2000 },
  { category: 'OTHERS', item: 'BED SHEET', laundryPrice: 2500, pressingPrice: 2000 },
  { category: 'OTHERS', item: 'BLANKET', laundryPrice: 6000, pressingPrice: 4500 },
  { category: 'OTHERS', item: 'CURTAIN', laundryPrice: 5000, pressingPrice: 3000 },
  { category: 'OTHERS', item: 'DUVET COVER', laundryPrice: 4000, pressingPrice: 3000 },
  { category: 'OTHERS', item: 'PILLOW CASES', laundryPrice: 1000, pressingPrice: 800 },
  { category: 'OTHERS', item: 'TOWEL', laundryPrice: 1500, pressingPrice: null },
  { category: 'OTHERS', item: 'BATH MAT', laundryPrice: 1000, pressingPrice: null },
  { category: 'OTHERS', item: 'FACE TOWEL', laundryPrice: 1000, pressingPrice: null },
  { category: 'OTHERS', item: 'HAND TOWEL', laundryPrice: 1000, pressingPrice: null },
];
