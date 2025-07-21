import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { EatenFood } from '../models/eaten-food';

@Injectable({
  providedIn: 'root',
})
export class NutritionService {
  consumedToday: number = 0;
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

    const todayFoods = pantry.eatenFoods.filter(
      (food: EatenFood) => food.timestamp >= startTimestamp
    );

    return todayFoods.reduce(
      (sum: number, food: EatenFood) =>
        sum + (this.extractNutritionValue(food, 'energy') || 0),
      0
    );
  }

  async getEatenFoodsToday(): Promise<EatenFood[]> {
    const pantry = this.firebaseService.getPantry();
    if (!pantry?.eatenFoods) return [];

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startTimestamp = startOfDay.getTime();

    return pantry.eatenFoods.filter(
      (food: EatenFood) => food.timestamp >= startTimestamp
    );
  }

  extractNutritionValue(food: any, nutrientType: string): number {
    if (!food) return 0;

    const type = nutrientType.toLowerCase();
    const nutrition = food.nutrition || {};
    const nutriments = food.nutriments || {};
    const nutritionMappings: { [key: string]: string[] } = {
      energy: [
        'energy-kcal_100g',
        'energy-kcal',
        'energy_kcal',
        'energy_100g',
        'energy',
        'energy-kj',
        'energy_kj',
      ],
      proteins: ['protein', 'proteins', 'protein_100g', 'proteins_100g'],
      fats: ['fat', 'fats', 'fat_100g'],
      fat: ['fat', 'fats', 'fat_100g'],
      sugars: ['sugar', 'sugars', 'sugar_100g', 'sugars_100g'],
      salt: ['salt', 'salts', 'salt_100g'],
      salts: ['salt', 'salts', 'salt_100g'],
      carbohydrates: ['carbohydrates', 'carbohydrates_100g'],
    };

    const keysToCheck = nutritionMappings[type] || [type];

    for (const key of keysToCheck) {
      const val = nutrition[key] ?? nutriments[key] ?? food[key];
      const num = Number(val);
      if (!isNaN(num)) return num;
    }
    return 0;
  }

  getTotalCalories(food: any): number {
    const kcalPer100g = this.extractNutritionValue(food, 'energy');
    const amount = food?.amount || 0;
    const unit = food?.unit || 'g' || 'ml';

    // if g or ml
    if (
      unit === 'g' ||
      unit === 'gram' ||
      unit === 'ml' ||
      unit === 'millilitres'
    ) {
      return Math.round((kcalPer100g * amount) / 100);
    }

    // For units like pcs, assume kcalPer100g is already per unit
    return Math.round(kcalPer100g * amount);
  }

  async getAllEatenFoods(): Promise<EatenFood[]> {
    const pantry = this.firebaseService.getPantry();
    return pantry?.eatenFoods ?? [];
  }
}
