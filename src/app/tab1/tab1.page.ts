import { Component } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';
import { NutritionService } from '../services/nutrition.service';
import { EatenFood } from '../models/eaten-food';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page {
  constructor(
    private firebaseService: FirebaseService,
    private nutritionService: NutritionService,
    private alertController: AlertController
  ) {}

  // ngOnInit() {
  //  this.loadCaloriesConsumedToday();
  // }

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
  //   this.loadCaloriesConsumedToday();
  // }

  // async ionViewWillEnter() {
  //   const savedId = localStorage.getItem('pantryId');
  //   if (!savedId) {
  //     this.clearLocalData();
  //     return;
  //   }
  //   this.firebaseService.pantryId = savedId;

  //   // Only load if we don't have fresh data
  //   if (!this.firebaseService.getPantry()) {
  //     await this.firebaseService.loadPantry();
  //   }

  //   const pantry = this.firebaseService.getPantry();
  //   if (!pantry) {
  //     this.clearLocalData();
  //     localStorage.removeItem('pantryId');
  //     return;
  //   }

  //   await this.nutritionService.loadTodaysDataFromFirebase();
  // }


  ///////CHANGES MADE IN SALZBERGEN///////
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
  
  // ALWAYS refresh the data when entering Tab1
  await this.loadCaloriesConsumedToday();
}
///////CHANGES MADE IN SALZBERGEN///////


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

  get caloriesConsumedToday() {
    return this.nutritionService.getCaloriesConsumedToday();
  }

  getDailyLimit(): number {
    return this.nutritionService.getDailyLimit();
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

  get nutrientCalorieBreakdown() {
    return this.nutritionService.nutrientCalorieBreakdown;
  }

  getCalorieInfo(food: any) {
    return this.nutritionService.getCalorieInfo(food);
  }



  /////////// TYPED IN SALZBERGEN ///////////

async editFoodItem(item: EatenFood) {
  const alert = await this.alertController.create({
    header: 'Edit Food Item',
    message: `Edit the amount for "${item.name}"`,
    inputs: [
      {
        name: 'amount',
        type: 'number',
        placeholder: 'Amount',
        value: item.amount || item.package_size || 1,
        min: 0.1,
        max: 10000
      },
      {
        name: 'unit',
        type: 'text',
        placeholder: 'Unit',
        value: item.unit || item.package_unit || 'g'
      }
    ],
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Save',
        handler: async (data) => {
          if (data.amount && data.amount > 0) {
            await this.updateFoodItem(item, parseFloat(data.amount), data.unit);
            return true; // Close the alert
          } else {
            const errorAlert = await this.alertController.create({
              header: 'Invalid Amount',
              message: 'Please enter a valid amount greater than 0.',
              buttons: ['OK']
            });
            await errorAlert.present();
            return false; // Keep the alert open
          }
        }
      }
    ]
  });

  await alert.present();
}

async updateFoodItem(originalItem: EatenFood, newAmount: number, newUnit: string) {
  try {
    // Create updated item
    const updatedItem: EatenFood = {
      ...originalItem,
      amount: newAmount,
      unit: newUnit,
      // If it was using package_size, switch to amount-based calculation
      package_size: 0,
      package_unit: ''
    };

    // Update in Firebase
    await this.nutritionService.updateEatenFood(originalItem, updatedItem);

    // Refresh the display
    await this.loadCaloriesConsumedToday();

    const successAlert = await this.alertController.create({
      header: 'Success',
      message: `"${originalItem.name}" has been updated.`,
      buttons: ['OK']
    });
    await successAlert.present();

  } catch (error) {
    console.error('Error updating food item:', error);
    const errorAlert = await this.alertController.create({
      header: 'Error',
      message: 'Failed to update the food item. Please try again.',
      buttons: ['OK']
    });
    await errorAlert.present();
  }
}

async deleteFoodItem(item: EatenFood) {
  const confirmAlert = await this.alertController.create({
    header: 'Delete Food Item',
    message: `Are you sure you want to delete "${item.name}" from your food log?`,
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel'
      },
      {
        text: 'Delete',
        role: 'destructive',
        handler: async () => {
          try {
            // Delete from Firebase
            await this.nutritionService.deleteEatenFood(item);

            // Refresh the display
            await this.loadCaloriesConsumedToday();

            const successAlert = await this.alertController.create({
              header: 'Deleted',
              message: `"${item.name}" has been removed from your food log.`,
              buttons: ['OK']
            });
            await successAlert.present();

          } catch (error) {
            console.error('Error deleting food item:', error);
            const errorAlert = await this.alertController.create({
              header: 'Error',
              message: 'Failed to delete the food item. Please try again.',
              buttons: ['OK']
            });
            await errorAlert.present();
          }
        }
      }
    ]
  });

  await confirmAlert.present();
}
/////////// TYPED IN SALZBERGEN ///////////

}
