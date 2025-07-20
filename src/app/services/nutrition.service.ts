import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { EatenFood } from '../models/eaten-food'; 

@Injectable({
  providedIn: 'root'
})
export class NutritionService {

  consumedToday: number = 500;
  dailyLimit: number = 1700;
  eatenToday: EatenFood[] = [];


  constructor(private firebaseService: FirebaseService) {}

    async logFood(food: EatenFood): Promise<void> {
      await this.firebaseService.logEatenFood(food);
    }

    async getCaloriesConsumedToday(): Promise<number> {
      const pantry = this.firebaseService.getPantry();
      if (!pantry?.eatenFoods) return 0;

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startTimestamp = startOfDay.getTime();
      const todayFoods = pantry.eatenFoods.filter((food: EatenFood) => food.timestamp >= startTimestamp);
      return todayFoods.reduce((sum: number, food: any) => sum + (food.energykcal ?? 0), 0);
    }

  async getEatenFoodsToday(): Promise<EatenFood[]> {
    const pantry = this.firebaseService.getPantry();
    if (!pantry?.eatenFoods) return [];

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startTimestamp = startOfDay.getTime();

    return pantry.eatenFoods.filter((food: EatenFood) => food.timestamp >= startTimestamp);
  }

  extractNutritionValue(food: any, nutrientType: string): number {
  if (!food) return 0;

  const type = nutrientType.toLowerCase();
  const nutrition = food.nutrition || {};
  const nutriments = food.nutriments || {};
  const nutritionMappings: { [key: string]: string[] } = {
    'energy': ['energy-kcal', 'energy_kcal', 'energy_100g', 'energy', 'energy-kj', 'energy_kj'],
    'proteins': ['protein', 'proteins', 'protein_100g', 'proteins_100g'],
    'fats': ['fat', 'fats', 'fat_100g'],
    'fat': ['fat', 'fats', 'fat_100g'],
    'sugars': ['sugar', 'sugars', 'sugar_100g', 'sugars_100g'],
    'salt': ['salt', 'salts', 'salt_100g'],
    'salts': ['salt', 'salts', 'salt_100g'],
    'carbohydrates': ['carbohydrates', 'carbohydrates_100g'],
  };

  const keysToCheck = nutritionMappings[type] || [type];

  for (const key of keysToCheck) {
    const val =
      nutrition[key] ?? nutriments[key] ?? food[key];
    const num = Number(val);
    if (!isNaN(num)) return num;
  }
  return 0;
}

getTotalCalories(food: any): number {
  if (!food) return 0;

  const nutrition = food.nutrition || {};
  const nutriments = food.nutriments || {};
  const energyKeys = ['energy-kcal', 'energy_kcal', 'energy_100g', 'energy', 'energy-kj', 'energy_kj'];

  for (const key of energyKeys) {
    let val = nutrition[key] ?? nutriments[key] ?? food[key];
    if (val !== undefined && val !== null) {
      val = Number(val);

      if (key.includes('kj') && !key.includes('kcal')) {
        val = val / 4.184;
      }
      return Math.round(val);
    }
  }
  return 0;
}
}
