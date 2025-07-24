export interface BaseFood {
  name: string;
  // package_size: number;
  // package_unit: string;
  amount: number;
  unit: string;
  type: string;
  notes: string;
  rating: number;
  expirationdate: string;
}

export interface Nutrition {
  fat: number;
  'saturated-fat': number;
  salt: number;
  sugar: number;
}

export interface Nutriments {
  'energy-kcal': number;
  carbohydrates: number;
  proteins: number;
  fats: number;
  sugars: number;
  salts: number;
  // calcium_100g: number;
  // fiber_100g: number;
  // iron_100g: number;
  // magnesium_100g: number;
  // potassium_100g: number;
  // 'vitamin-a_100g': number;
  // 'vitamin-b12_100g': number;
  // 'vitamin-c_100g': number;
  // 'vitamin-d_100g': number;
}

export interface FoodItem extends BaseFood {
  id?: string;
  barcode?: string;
}

export interface FoodItemWithNutrition extends FoodItem {
  nutrition: Nutrition;
  nutriments: Nutriments;
}

export interface EatenFood extends BaseFood {
  timestamp: number;
  nutrition: Nutrition;
  nutriments: Nutriments;
}
