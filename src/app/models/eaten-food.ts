export interface BaseFood {
  name: string;
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
  // ... add more if needed for tab1/2
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
