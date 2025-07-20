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
}
