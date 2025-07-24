import { Component, inject } from '@angular/core';
import { NutritionService } from '../services/nutrition.service';
import { EatenFood } from '../models/eaten-food';
import { FirebaseService } from '../services/firebase.service';

interface DayData {
  date: Date;
  dayName: string;
  calories: number;
  isToday: boolean;
}

interface WeekData {
  weekStart: Date;
  weekEnd: Date;
  days: DayData[];
  totalCalories: number;
  averageCalories: number;
  weekNumber: number;
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page {
  firebaseService = inject(FirebaseService);

  weeks: WeekData[] = [];
  currentWeekIndex = 0;
  loading = true;

  constructor(private nutritionService: NutritionService) {}

  async ionViewWillEnter() {
    const savedId = localStorage.getItem('pantryId');
    if (!savedId) {
      this.loading = false;
      return;
    }

    this.firebaseService.pantryId = savedId;
    await this.firebaseService.loadPantry();

    const pantry = this.firebaseService.getPantry();
    if (!pantry) {
      localStorage.removeItem('pantryId');
      this.loading = false;
      return;
    }

    await this.loadWeeklyData();
    this.loading = false;
  }

  async loadWeeklyData() {
    // Load data for the past 8 weeks plus current week
    const weeks: WeekData[] = [];
    const today = new Date();

    // Find the Monday of current week
    const currentMonday = this.getMondayOfWeek(today);

    // Generate 9 weeks of data (8 past weeks + current week)
    for (let i = 8; i >= 0; i--) {
      const weekStart = new Date(currentMonday);
      weekStart.setDate(currentMonday.getDate() - i * 7);

      const weekData = await this.generateWeekData(weekStart, 8 - i + 1);
      weeks.push(weekData);
    }

    this.weeks = weeks;
    this.currentWeekIndex = weeks.length - 1; // Start with current week
  }

  async generateWeekData(
    weekStart: Date,
    weekNumber: number
  ): Promise<WeekData> {
    const days: DayData[] = [];
    const dayNames = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    let totalCalories = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const isToday = date.getTime() === today.getTime();

      // Get calories for this specific date
      const calories = await this.getCaloriesForDate(date);
      totalCalories += calories;

      days.push({
        date: new Date(date),
        dayName: dayNames[i],
        calories,
        isToday,
      });
    }

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return {
      weekStart: new Date(weekStart),
      weekEnd,
      days,
      totalCalories,
      averageCalories: Math.round(totalCalories / 7),
      weekNumber,
    };
  }

  async getCaloriesForDate(date: Date): Promise<number> {
    try {
      return await this.nutritionService.getCaloriesConsumedForDateFromTimestamps(
        date
      );
    } catch (error) {
      console.error('Error getting calories for date:', error);
      return 0;
    }
  }

  getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  previousWeek() {
    if (this.currentWeekIndex > 0) {
      this.currentWeekIndex--;
    }
  }

  nextWeek() {
    if (this.currentWeekIndex < this.weeks.length - 1) {
      this.currentWeekIndex++;
    }
  }

  get currentWeek(): WeekData | null {
    return this.weeks[this.currentWeekIndex] || null;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateRange(start: Date, end: Date): string {
    const startStr = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const endStr = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${startStr} - ${endStr}`;
  }

  getCalorieStatus(calories: number): string {
    const dailyLimit = this.nutritionService.getDailyLimit();
    if (calories === 0) return 'no-data';
    if (calories < dailyLimit * 0.8) return 'under';
    if (calories > dailyLimit * 1.2) return 'over';
    return 'good';
  }

  getDailyLimit(): number {
    return this.nutritionService.getDailyLimit();
  }

  Math = Math;

  //////////OLD TAB2//////////
  // weeklySummaries: {
  //   weekStart: string;
  //   totalCalories: number;
  //   foods: any[];
  // }[] = [];

  // async ionViewWillEnter() {
  //   const savedId = localStorage.getItem('pantryId');
  //   if (!savedId) {
  //     this.clearLocalData();
  //     return;
  //   }
  //   this.firebaseService.pantryId = savedId;
  //   await this.firebaseService.loadPantry();

  //   const pantry = this.firebaseService.getPantry();
  //   if (!pantry) {
  //     this.clearLocalData();
  //     localStorage.removeItem('pantryId');
  //     return;
  //   }
  //   const eatenFoods = await this.nutritionService.getEatenFoodsToday();
  //   this.weeklySummaries = this.groupFoodsByWeek(eatenFoods);
  // }

  // private clearLocalData() {
  //   this.nutritionService.consumedToday = 0;
  //   this.nutritionService.eatenToday = [];
  //   this.nutritionService.dailyLimit = 0;
  //   this.weeklySummaries = [];
  // }

  // groupFoodsByWeek(
  //   eatenFoods: any[]
  // ): { weekStart: string; totalCalories: number; foods: any[] }[] {
  //   const weeks: { [weekKey: string]: any[] } = {};

  //   for (const food of eatenFoods) {
  //     const date = new Date(food.timestamp);
  //     const weekStart = new Date(date);
  //     weekStart.setDate(date.getDate() - date.getDay()); // Sunday of that week
  //     weekStart.setHours(0, 0, 0, 0);
  //     const key = weekStart.toISOString().split('T')[0];

  //     if (!weeks[key]) {
  //       weeks[key] = [];
  //     }
  //     weeks[key].push(food);
  //   }

  //   return Object.entries(weeks)
  //     .map(([weekStart, foods]) => ({
  //       weekStart,
  //       totalCalories: foods.reduce(
  //         (sum, item) => sum + (item.nutriments?.['energy-kcal'] || 0),
  //         0
  //       ),
  //       foods,
  //     }))
  //     .sort(
  //       (a, b) =>
  //         new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
  //     );
  // }

  // // Returns ISO week number
  // getWeekNumber(d: Date): number {
  //   const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  //   const dayNum = date.getUTCDay() || 7;
  //   date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  //   const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  //   return Math.ceil(
  //     ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  //   );
  // }

  // getTotalCalories(food: EatenFood): number {
  //   return this.nutritionService.getTotalCalories(food);
  // }
  //////////OLD TAB2//////////
}
