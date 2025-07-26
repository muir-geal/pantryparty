import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { EatenFood } from '../models/eaten-food';

@Injectable({
  providedIn: 'root',
})
export class NutritionService {
  consumedToday: number = 0;
  dailyLimit: number = 0;
  eatenToday: EatenFood[] = [];

  constructor(private firebaseService: FirebaseService) {
    this.loadDailyLimit();
  }

  async logFood(food: EatenFood): Promise<void> {
    // Just add timestamp if it's missing
    if (!food.timestamp) {
      food.timestamp = Date.now();
    }

    console.log('Saving eaten food:', food);

    const foodCalories = this.getTotalCalories(food); // Use original food object
    console.log('Food calories to add:', foodCalories);

    this.eatenToday.push(food);
    this.consumedToday += foodCalories;

    await this.firebaseService.logEatenFood(food);
  }

  async loadTodaysDataFromFirebase() {
    const pantry = this.firebaseService.getPantry();
    if (!pantry?.eatenFoods) {
      this.consumedToday = 0;
      this.eatenToday = [];
      return;
    }

    // Filter and calculate today's data
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).getTime();

    this.eatenToday = pantry.eatenFoods.filter(
      (food: EatenFood) =>
        food.timestamp >= startOfDay &&
        food.timestamp < startOfDay + 24 * 60 * 60 * 1000
    );

    this.consumedToday = this.eatenToday.reduce(
      (total, food) => total + this.getTotalCalories(food),
      0
    );
  }

  setDailyLimit(limit: number): void {
    this.dailyLimit = limit;
    localStorage.setItem('dailyCalorieLimit', limit.toString());
  }

  getDailyLimit(): number {
    return this.dailyLimit;
  }

  private loadDailyLimit(): void {
    const saved = localStorage.getItem('dailyCalorieLimit');
    if (saved) {
      this.dailyLimit = parseInt(saved, 10) || 0;
    }
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

    return todayFoods.reduce((sum: number, food: EatenFood) => {
      // Use the same calculation logic as getTotalCalories()
      const kcalPer100g = this.extractNutritionValue(food, 'energy') || 0;
      const amount = food?.amount || 0;
      const unit = food?.unit || 'g';

      let calories = 0;
      if (
        unit === 'g' ||
        unit === 'gram' ||
        unit === 'ml' ||
        unit === 'millilitres'
      ) {
        calories = Math.round((kcalPer100g * amount) / 100);
      } else {
        // For units like pcs, assume kcalPer100g is already per unit
        calories = Math.round(kcalPer100g * amount);
      }

      return sum + calories;
    }, 0);
  }

  // getTotalCalories(food: any): number {
  //   const kcalPer100g = this.extractNutritionValue(food, 'energy');
  //   const amount = food?.amount || 0;
  //   const unit = food?.unit || 'g' || 'ml';

  //   // if g or ml
  //   if (
  //     unit === 'g' ||
  //     unit === 'gram' ||
  //     unit === 'ml' ||
  //     unit === 'millilitres'
  //   ) {
  //     return Math.round((kcalPer100g * amount) / 100);
  //   }

  //   // For units like pcs, assume kcalPer100g is already per unit
  //   return Math.round(kcalPer100g * amount);
  // }

  getTotalCalories(food: any): number {
    console.log('=== DEBUG getTotalCalories ===');
    console.log('Food object:', food);

    const kcalPer100g = this.getCaloriesPer100g(food);
    console.log('kcalPer100g:', kcalPer100g);

    if (kcalPer100g === 0) {
      console.log('kcalPer100g is 0, returning 0');
      return 0;
    }

    // Determine the weight/amount to calculate from
    const packageSize = food?.package_size || 0;
    const packageUnit = (food?.package_unit || '').toLowerCase();
    const amount = food?.amount || 0;
    const unit = (food?.unit || 'g').toLowerCase();

    console.log('packageSize:', packageSize);
    console.log('packageUnit:', packageUnit);
    console.log('amount:', amount);
    console.log('unit:', unit);

    // Use package info if available, otherwise fall back to amount/unit
    const finalAmount = packageSize > 0 ? packageSize : amount;
    const finalUnit = packageUnit || unit;

    console.log('finalAmount:', finalAmount);
    console.log('finalUnit:', finalUnit);

    const result = this.calculateCaloriesFromAmount(
      kcalPer100g,
      finalAmount,
      finalUnit
    );
    console.log('Final result:', result);
    console.log('=== END DEBUG ===');

    return result;
  }

  private calculateCaloriesFromAmount(
    kcalPer100g: number,
    amount: number,
    unit: string
  ): number {
    if (amount === 0) {
      return 0;
    }

    const normalizedUnit = unit.toLowerCase();

    // Weight-based units (convert to grams)
    if (this.isWeightUnit(normalizedUnit)) {
      const weightInGrams = this.convertToGrams(amount, normalizedUnit);
      return Math.round((kcalPer100g * weightInGrams) / 100);
    }

    // Volume-based units (assume 1ml = 1g density for most foods)
    if (this.isVolumeUnit(normalizedUnit)) {
      const weightInGrams = this.convertVolumeToGrams(amount, normalizedUnit);
      return Math.round((kcalPer100g * weightInGrams) / 100);
    }

    // For pieces or unknown units, assume kcalPer100g is per unit
    return Math.round(kcalPer100g * amount);
  }

  getCaloriesPer100g(food: any): number {
    console.log('=== DEBUG getCaloriesPer100g ===');
    console.log('food.nutriments:', food.nutriments);

    // Try different possible keys for energy values
    const energyKcal100g = food.nutriments?.['energy-kcal_100g'] || 0;
    const energyKcal = food.nutriments?.['energy-kcal'] || 0;
    const energy100g = food.nutriments?.['energy_100g'] || 0;
    const energy = food.nutriments?.energy || 0;

    console.log('energy-kcal_100g:', energyKcal100g);
    console.log('energy-kcal:', energyKcal);
    console.log('energy_100g:', energy100g);
    console.log('energy:', energy);

    // Return the first non-zero value found
    const result =
      energyKcal100g || energyKcal || energy100g / 4.184 || energy / 4.184;
    console.log('getCaloriesPer100g result:', result);
    console.log('=== END DEBUG getCaloriesPer100g ===');

    return result;
  }

  getCaloriesPerServing(food: any): number {
    if (food.nutriments?.['energy-kcal_serving']) {
      return Math.round(food.nutriments['energy-kcal_serving']);
    }

    // If no serving data, return per 100g as fallback
    return this.getCaloriesPer100g(food);
  }

  private isWeightUnit(unit: string): boolean {
    return [
      'g',
      'gram',
      'grams',
      'kg',
      'kilogram',
      'kilograms',
      'oz',
      'ounce',
      'ounces',
      'lb',
      'pound',
      'pounds',
    ].includes(unit);
  }

  private isVolumeUnit(unit: string): boolean {
    return [
      'ml',
      'milliliter',
      'milliliters',
      'l',
      'liter',
      'liters',
      'fl oz',
      'cup',
      'cups',
      'pint',
      'pints',
      'quart',
      'quarts',
    ].includes(unit);
  }

  private convertToGrams(amount: number, unit: string): number {
    switch (unit) {
      case 'kg':
      case 'kilogram':
      case 'kilograms':
        return amount * 1000;
      case 'oz':
      case 'ounce':
      case 'ounces':
        return amount * 28.35;
      case 'lb':
      case 'pound':
      case 'pounds':
        return amount * 453.592;
      case 'g':
      case 'gram':
      case 'grams':
      default:
        return amount;
    }
  }

  private convertVolumeToGrams(amount: number, unit: string): number {
    // Assuming density similar to water (1ml = 1g) for most foods
    switch (unit) {
      case 'l':
      case 'liter':
      case 'liters':
        return amount * 1000;
      case 'fl oz':
        return amount * 29.5735;
      case 'cup':
      case 'cups':
        return amount * 240; // US cup
      case 'pint':
      case 'pints':
        return amount * 473.176;
      case 'quart':
      case 'quarts':
        return amount * 946.353;
      case 'ml':
      case 'milliliter':
      case 'milliliters':
      default:
        return amount;
    }
  }

  // Convenience method to get all calorie information at once
  getCalorieInfo(food: any): {
    per100g: number;
    perServing: number;
    total: number;
    unit: string;
  } {
    return {
      per100g: this.getCaloriesPer100g(food),
      perServing: this.getCaloriesPerServing(food),
      total: this.getTotalCalories(food),
      unit: food?.package_unit || food?.unit || 'g',
    };
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

  async getAllEatenFoods(): Promise<EatenFood[]> {
    const pantry = this.firebaseService.getPantry();
    return pantry?.eatenFoods ?? [];
  }

  nutrientCalorieBreakdown(): {
    name: string;
    chartColor: string;
    legendColor: string;
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

    const rawSegments = [
      {
        name: 'Protein',
        color: '#4caf50',
        value: totalProtein * CALORIES_PER_GRAM.proteins,
      },
      {
        name: 'Fat',
        color: '#ff9800',
        value: totalFat * CALORIES_PER_GRAM.fats,
      },
      {
        name: 'Carbs',
        color: '#188decff',
        value: totalCarbs * CALORIES_PER_GRAM.carbohydrates,
      },
      {
        name: 'Sugars',
        color: '#f321d7ff',
        value: totalSugars * CALORIES_PER_GRAM.sugars,
      },
      {
        name: 'Salts',
        color: '#21d4f3ff',
        value: totalSalts * CALORIES_PER_GRAM.salts,
      },
    ];

    const totalNutrientCalories = rawSegments.reduce(
      (sum, seg) => sum + seg.value,
      0
    );

    // Always return segments, even if no calories consumed
    if (totalNutrientCalories === 0) {
      return rawSegments.map((seg) => ({
        ...seg,
        percent: 0.0,
        chartColor: '#ffffff',
        legendColor: seg.color,
      }));
    }

    // Compute percentages relative to nutrient breakdown (these should add to 100%)
    let segments = rawSegments.map((seg) => ({
      ...seg,
      percent: +((seg.value / totalNutrientCalories) * 100).toFixed(2),
      chartColor: seg.color,
      legendColor: seg.color,
    }));

    // Correct total by adjusting the last segment to ensure exactly 100%
    const percentSum = segments.reduce((sum, seg) => sum + seg.percent, 0);
    const delta = +(100 - percentSum).toFixed(2);
    if (Math.abs(delta) > 0.01 && segments.length > 0) {
      segments[segments.length - 1].percent += delta;
    }

    return segments;
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

  async getCaloriesConsumedForDateFromTimestamps(date: Date): Promise<number> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const pantry = this.firebaseService.getPantry();
      if (!pantry || !pantry.eatenFoods) {
        return 0;
      }

      let totalCalories = 0;

      // Iterate through all eaten foods and filter by date
      for (const food of pantry.eatenFoods) {
        if (food.timestamp) {
          const foodDate = new Date(food.timestamp);
          if (foodDate >= startOfDay && foodDate <= endOfDay) {
            totalCalories += this.getTotalCalories(food);
          }
        }
      }

      return totalCalories;
    } catch (error) {
      console.error('Error getting calories for date from timestamps:', error);
      return 0;
    }
  }


  /////////// TYPED IN SALZBERGEN ///////////
  async updateEatenFood(originalItem: EatenFood, updatedItem: EatenFood): Promise<void> {
  try {
    // Update in Firebase
    await this.firebaseService.updateEatenFood(originalItem, updatedItem);

    // Update local cache
    const index = this.eatenToday.findIndex(food => 
      food.timestamp === originalItem.timestamp && 
      food.name === originalItem.name
    );
    
    if (index !== -1) {
      // Calculate calorie difference
      const oldCalories = this.getTotalCalories(originalItem);
      const newCalories = this.getTotalCalories(updatedItem);
      const calorieDifference = newCalories - oldCalories;

      // Update the item in cache
      this.eatenToday[index] = updatedItem;
      
      // Update total consumed calories
      this.consumedToday += calorieDifference;
    }

    console.log('Food item updated successfully');
  } catch (error) {
    console.error('Error updating eaten food:', error);
    throw error;
  }
}

async deleteEatenFood(item: EatenFood): Promise<void> {
  try {
    // Delete from Firebase
    await this.firebaseService.deleteEatenFood(item);

    // Update local cache
    const index = this.eatenToday.findIndex(food => 
      food.timestamp === item.timestamp && 
      food.name === item.name
    );
    
    if (index !== -1) {
      // Calculate calories to subtract
      const calories = this.getTotalCalories(item);
      
      // Remove from cache
      this.eatenToday.splice(index, 1);
      
      // Update total consumed calories
      this.consumedToday -= calories;
      
      // Ensure it doesn't go below 0
      if (this.consumedToday < 0) {
        this.consumedToday = 0;
      }
    }

    console.log('Food item deleted successfully');
  } catch (error) {
    console.error('Error deleting eaten food:', error);
    throw error;
  }
}
/////////// TYPED IN SALZBERGEN ///////////

}
