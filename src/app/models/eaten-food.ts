export interface BaseFood {
  name: string;
  amount: number;
  unit: string;
  type: string;
  notes: string;
  rating: number;
  expirationdate: string;
}

export interface NutritionData {
  energykcal: number;
  proteins: number;
  fats: number;
  sugars: number;
  salts: number;
  carbohydrates: number;
}

export interface FoodItem extends BaseFood {
  id?: string;
  barcode?: string;
}

export interface FoodItemWithNutrition extends FoodItem, NutritionData {
}

export interface EatenFood extends BaseFood, NutritionData {
  timestamp: number;
}
