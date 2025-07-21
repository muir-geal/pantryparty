import { Component, inject } from '@angular/core';
import { NutritionService } from '../services/nutrition.service';
import { EatenFood } from '../models/eaten-food';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page {
  firebaseService = inject(FirebaseService);

  constructor(private nutritionService: NutritionService) {}

  weeklySummaries: {
    weekStart: string;
    totalCalories: number;
    foods: any[];
  }[] = [];

  async ionViewWillEnter() {
    await this.firebaseService.loadPantry();
    const eatenFoods = await this.nutritionService.getEatenFoodsToday(); // or a new getAllEatenFoods() method
    this.weeklySummaries = this.groupFoodsByWeek(eatenFoods);
  }

  groupFoodsByWeek(
    eatenFoods: any[]
  ): { weekStart: string; totalCalories: number; foods: any[] }[] {
    const weeks: { [weekKey: string]: any[] } = {};

    for (const food of eatenFoods) {
      const date = new Date(food.timestamp);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Sunday of that week
      weekStart.setHours(0, 0, 0, 0);
      const key = weekStart.toISOString().split('T')[0];

      if (!weeks[key]) {
        weeks[key] = [];
      }
      weeks[key].push(food);
    }

    return Object.entries(weeks)
      .map(([weekStart, foods]) => ({
        weekStart,
        totalCalories: foods.reduce(
          (sum, item) => sum + (item.nutriments?.['energy-kcal'] || 0),
          0
        ),
        foods,
      }))
      .sort(
        (a, b) =>
          new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
      );
  }

  // Returns ISO week number
  getWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(
      ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );
  }

  getTotalCalories(food: EatenFood): number {
    return this.nutritionService.getTotalCalories(food);
  }
}
