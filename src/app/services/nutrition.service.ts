import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { EatenFood } from '../models/eaten-food';

@Injectable({
  providedIn: 'root',
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

  nutrientCalorieBreakdown(): {
    name: string;
    color: string;
    percent: number;
  }[] {
    const CALORIES_PER_GRAM = {
      proteins: 4,
      carbohydrates: 4,
      fats: 9,
      sugars: 4,
      salts: 5,
    };

    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalSugars = 0;
    let totalSalts = 0;

    for (const item of this.eatenToday) {
      const nutriments = item.nutriments || {};

      totalProtein += Number((nutriments.proteins * item.amount) / 100 || 0);
      totalCarbs += Number((nutriments.carbohydrates * item.amount) / 100 || 0);
      totalFat += Number((nutriments.fats * item.amount) / 100 || 0);
      totalSugars += Number((nutriments.sugars * item.amount) / 100 || 0);
      totalSalts += Number((nutriments.salts * item.amount) / 100 || 0);
    }

    const proteinCal = totalProtein * CALORIES_PER_GRAM.proteins;
    const carbCal = totalCarbs * CALORIES_PER_GRAM.carbohydrates;
    const fatCal = totalFat * CALORIES_PER_GRAM.fats;
    const sugarCal = totalSugars * CALORIES_PER_GRAM.sugars;
    const saltCal = totalSalts * CALORIES_PER_GRAM.salts;

    const total = proteinCal + carbCal + fatCal + sugarCal;
    if (total === 0) return [];

    const intakeRatio = Math.min(this.consumedToday / this.dailyLimit, 1);

    return [
      {
        name: 'Protein',
        color: '#4caf50',
        percent: (proteinCal / total) * 100 * intakeRatio, //to let the circle fill just as much as consumedToday!
      },
      {
        name: 'Fat',
        color: '#ff9800',
        percent: (fatCal / total) * 100 * intakeRatio,
      },
      {
        name: 'Carbs',
        color: '#188decff',
        percent: (carbCal / total) * 100 * intakeRatio,
      },
      {
        name: 'Sugars',
        color: '#f321d7ff',
        percent: (sugarCal / total) * 100 * intakeRatio,
      },
      {
        name: 'Salts',
        color: '#21d4f3ff',
        percent: (saltCal / total) * 100 * intakeRatio,
      },
    ];
  }

  get totalMacrosConsumedToday(): {
    proteins: number;
    carbohydrates: number;
    fats: number;
  } {
    return this.eatenToday.reduce(
      (totals, item) => {
        totals.proteins += item.nutriments?.proteins || 0;
        totals.carbohydrates += item.nutriments?.carbohydrates || 0;
        totals.fats += item.nutriments?.fats || 0;
        totals.sugars += item.nutriments?.sugars || 0;
        totals.salts += item.nutriments?.salts || 0;
        return totals;
      },
      { proteins: 0, carbohydrates: 0, fats: 0, sugars: 0, salts: 0 }
    );
  }
}
