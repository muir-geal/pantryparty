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
}
