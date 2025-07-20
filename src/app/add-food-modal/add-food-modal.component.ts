import { Component, inject, OnInit } from '@angular/core';
import { Input } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';
import { Firestore, doc, setDoc, deleteDoc, getDoc } from '@angular/fire/firestore';
import { BarcodeScanner, type BarcodesScannedEvent, BarcodeFormat, LensFacing } from '@capacitor-mlkit/barcode-scanning';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-add-food-modal',
  templateUrl: './add-food-modal.component.html',
  styleUrls: ['./add-food-modal.component.scss'],
  standalone: false,
})
export class AddFoodModalComponent implements OnInit {

@Input() food: any;
@Input() isEditing: boolean = false;

firebaseService = inject(FirebaseService);

scannedContent: string | null = null;
scannedCode: string | null = null;
scanListener: any;

newName: string = '';
newRating: number = 5;
notes: string = '';
newAmount: number = 1;
newAvailable: number = 0;
newUnit: string = 'g';
newType: string = 'other';
newNotes: string = '';
expirationdate: string = '';

energykcal: number | null = null;
proteins: number | null = null;
fats: number | null = null;
sugars: number | null = null;
salts: number | null = null;
carbohydrates: number | null = null;

vegan: boolean = false;
vegetarian: boolean = false;
halal: boolean = false;
kosher: boolean = false;

constructor(private firestore: Firestore, private modalController: ModalController) { }

  ngOnInit() {
    if (this.food) {
      this.newName = this.food.name || '';
      this.newRating = this.food.rating ?? 5;
      this.newAmount = this.food.amount ?? 1;
      this.newAvailable = this.food.available ?? this.newAmount;
      this.newUnit = this.food.unit || 'g';
      this.newType = this.food.type || 'other';
      this.newNotes = this.food.notes || '';
      this.expirationdate = this.food.expirationdate || '';

      this.energykcal = this.food.energykcal ?? null;
      this.proteins = this.food.proteins ?? null;
      this.fats = this.food.fats ?? null;
      this.sugars = this.food.sugars ?? null;
      this.salts = this.food.salts ?? null;
      this.carbohydrates = this.food.carbohydrates ?? null;

      this.vegan = this.food.vegan ?? false;
      this.vegetarian = this.food.vegetarian ?? false;
      this.halal = this.food.halal ?? false;
      this.kosher = this.food.kosher ?? false;
    }
  }

getPantries()
  {
    return this.firebaseService.getPantries();
  }

setRating(rating: number) {
  this.newRating = rating;
}

async saveFood() {
    if (!this.food) {
      alert('No food scanned yet.');
      return;
    }

    const updatedFood = {
      ...this.food,
      name: this.newName,
      rating: this.newRating,
      amount: this.newAmount,
      available: this.newAvailable,
      unit: this.newUnit,
      type: this.newType,
      notes: this.newNotes,
      expirationdate: this.expirationdate,
      energykcal: this.energykcal,
      proteins: this.proteins,
      fats: this.fats,
      sugars: this.sugars,
      salts: this.salts,
      carbohydrates: this.carbohydrates,
      vegan: this.vegan,
      vegetarian: this.vegetarian,
      halal: this.halal,
      kosher: this.kosher,
    };

    if (this.isEditing) {
      this.modalController.dismiss(updatedFood);
    } else {
      const pantry = await this.firebaseService.getPantry();
      if (pantry) {
        await this.firebaseService.updatePantryWithFood(pantry.id, updatedFood);
        await this.firebaseService.loadPantry();
      }
      this.modalController.dismiss(updatedFood);
    }
  }

  cancel() {
    this.modalController.dismiss();
  }
}