import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { NutritionService } from '../../services/nutrition.service';
import { ReservefoodService } from '../../services/reserve-food.service';

@Component({
  selector: 'app-open-food-detail-modal',
  templateUrl: './open-food-detail-modal.component.html',
  styleUrls: ['./open-food-detail-modal.component.scss'],
  standalone: false,
})
export class OpenFoodDetailModalComponent {
  @Input() food: any;

  isReserved = false;

  constructor(
    private modalController: ModalController,
    private nutritionService: NutritionService,
    private reserveFoodService: ReservefoodService
  ) {}

  ngOnInit() {
    this.isReserved = !!this.food?.isReserved;
  }

  dismiss() {
    this.modalController.dismiss(
      {
        someBoolean: this.isReserved,
        foodId: this.food?.barcode,
      },
      'confirm'
    );
  }

  extract(nutrient: string, food: any): number {
    return this.nutritionService.extractNutritionValue(food, nutrient);
  }

  getCalories(food: any): number {
    return this.nutritionService.getTotalCalories(food);
  }

  // reserveFood()
  //   {
  //   this.isReserved = !this.isReserved;
  //   }

  reserveFood() {
    // Toggle the local state
    this.isReserved = !this.isReserved;

    // Update the service with the new state
    const identifier = this.food.barcode || this.food.openfoodfactsid;
    if (identifier) {
      this.reserveFoodService.toggleReservation(identifier, this.isReserved);
    }

    // Also update the food object if you're using it in the template
    if (this.food) {
      this.food.isReserved = this.isReserved;
    }
  }

  countAllergens(item: any): number {
    if (!item || !item.allergens) return 0;
    return item.allergens.length;
  }

  getAllergenString(item: any): string {
    if (!item || !item.allergens || item.allergens.length === 0) {
      return '';
    }
    return item.allergens.join(', ');
  }

  getCalorieInfo(food: any) {
    return this.nutritionService.getCalorieInfo(food);
  }

  // getNutrientAmount(food: any, nutrientKey: string): number {
  //   if (!food.nutriments?.[nutrientKey]) return 0;

  //   const nutrientPer100g = food.nutriments[nutrientKey];
  //   const amount = food.package_size || food.amount || 100;

  //   return (nutrientPer100g * amount) / 100;
  // }

  // // Get all nutrients for display (including calories)
  // getNutrientList(food: any) {
  //   if (!food.nutriments) return [];

  //   const nutrients = [];

  //   // Add calories first (if available)
  //   const totalCalories =
  //     this.nutritionService?.getTotalCalories(food) ||
  //     this.getNutrientAmount(food, 'energy-kcal');
  //   const caloriesPer100g =
  //     this.nutritionService?.getCaloriesPer100g(food) ||
  //     food.nutriments?.['energy-kcal'];
  //   const caloriesPerServing =
  //     this.nutritionService?.getCaloriesPerServing(food) ||
  //     food.nutriments?.['energy-kcal_serving'];

  //   if (totalCalories > 0) {
  //     nutrients.push({
  //       name: 'calories (total)',
  //       value: totalCalories,
  //       unit: 'kcal',
  //       isCalorie: true,
  //     });
  //   }

  //   if (caloriesPer100g > 0) {
  //     nutrients.push({
  //       name: 'calories (per 100g)',
  //       value: Math.round(caloriesPer100g),
  //       unit: 'kcal',
  //       isCalorie: true,
  //     });
  //   }

  //   if (caloriesPerServing > 0 && caloriesPerServing !== caloriesPer100g) {
  //     nutrients.push({
  //       name: 'calories (per serving)',
  //       value: Math.round(caloriesPerServing),
  //       unit: 'kcal',
  //       isCalorie: true,
  //     });
  //   }

  //   // Skip regular nutrients for pieces since they don't make sense
  //   if (food.package_unit !== 'pcs' && food.unit !== 'pcs') {
  //     const regularNutrients = [
  //       { name: 'protein', key: 'proteins', unit: 'g' },
  //       { name: 'fat', key: 'fat', unit: 'g' },
  //       { name: 'carbohydrates', key: 'carbohydrates', unit: 'g' },
  //       { name: 'sugars', key: 'sugars', unit: 'g' },
  //       { name: 'salt', key: 'salt', unit: 'g' },
  //       { name: 'saturated fat', key: 'saturated-fat', unit: 'g' },
  //       { name: 'sodium', key: 'sodium', unit: 'mg' },
  //     ];

  //     const mappedNutrients = regularNutrients
  //       .map((nutrient) => ({
  //         ...nutrient,
  //         value: this.getNutrientAmount(food, nutrient.key),
  //         isCalorie: false,
  //       }))
  //       .filter((nutrient) => nutrient.value > 0);

  //     nutrients.push(...mappedNutrients);
  //   }

  //   return nutrients;
  // }
}
