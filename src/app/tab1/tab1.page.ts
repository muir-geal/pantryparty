import { Component } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';
import { NutritionService } from '../services/nutrition.service';
import { EatenFood } from '../models/eaten-food';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page {
  constructor(
    private firebaseService: FirebaseService,
    private nutritionService: NutritionService
  ) {}

  // ngOnInit() {
  //  this.loadCaloriesConsumedToday();
  // }

  async ionViewWillEnter() {
    const savedId = localStorage.getItem('pantryId');
    if (!savedId) {
      this.clearLocalData();
      return;
    }
    this.firebaseService.pantryId = savedId;
    await this.firebaseService.loadPantry();

    const pantry = this.firebaseService.getPantry();
    if (!pantry) {
      this.clearLocalData();
      localStorage.removeItem('pantryId');
      return;
    }
    this.loadCaloriesConsumedToday();
  }

  private clearLocalData() {
    this.nutritionService.consumedToday = 0;
    this.nutritionService.eatenToday = [];
    this.nutritionService.dailyLimit = 0;
  }

  async loadCaloriesConsumedToday() {
    this.nutritionService.consumedToday =
      await this.nutritionService.getCaloriesConsumedToday();
    this.nutritionService.eatenToday =
      await this.nutritionService.getEatenFoodsToday();
  }

  getTotalCalories(food: EatenFood): number {
    return this.nutritionService.getTotalCalories(food);
  }

  get consumedToday(): number {
    return this.nutritionService.consumedToday;
  }

  get dailyLimit(): number {
    return this.nutritionService.dailyLimit;
  }

  get eatenToday(): EatenFood[] {
    return this.nutritionService.eatenToday;
  }

  //for the full circle graph:
  get progress(): number {
    const ratio = Math.min(
      this.nutritionService.consumedToday / this.nutritionService.dailyLimit,
      1
    );
    return +(ratio * 100).toFixed(2);
  }

  getSegmentOffset(index: number): number {
    const segments = this.nutritionService.nutrientCalorieBreakdown();
    const consumptionRatio = this.consumedToday / this.dailyLimit;
    let offset = 0;
    for (let i = 0; i < index; i++) {
      // Scale the offset by consumption ratio for visual representation
      offset -= segments[i].percent * consumptionRatio;
    }
    return offset;
  }

  getSegmentDashArray(segment: any): string {
    const consumptionRatio = this.consumedToday / this.dailyLimit;
    // Scale the segment percentage by consumption ratio for visual arc length
    const visualPercent = +(segment.percent * consumptionRatio).toFixed(2);
    return `${visualPercent}, 100`;
  }

  //for the arc:
  // get progressArcPath(): string {
  //   const startX = 10;
  //   const startY = 50;
  //   const endX = 90;
  //   const endY = 50;

  //   const radius = 40;
  //   const progressRatio = Math.min(
  //     this.nutritionService.consumedToday / this.nutritionService.dailyLimit,
  //     1
  //   );
  //   const angle = progressRatio * Math.PI; // range: 0 to π

  //   // Calculate endpoint using angle
  //   const x = 50 + radius * Math.cos(Math.PI - angle);
  //   const y = 50 - radius * Math.sin(Math.PI - angle);

  //   // Large arc flag: 0 if less than half, 1 if more
  //   const largeArcFlag = progressRatio > 0.5 ? 1 : 0;

  //   return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x} ${y}`;
  // }

  get nutrientCalorieBreakdown() {
    return this.nutritionService.nutrientCalorieBreakdown;
  }
}
