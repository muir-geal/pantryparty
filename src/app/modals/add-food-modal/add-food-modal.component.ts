import { Component, inject, OnInit } from '@angular/core';
import { Input } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import {
  Firestore,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
} from '@angular/fire/firestore';
import {
  BarcodeScanner,
  type BarcodesScannedEvent,
  BarcodeFormat,
  LensFacing,
} from '@capacitor-mlkit/barcode-scanning';
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

  // Form fields
  newName: string = '';
  newRating: number = 0;
  notes: string = '';
  newAmount: number = 1;
  newAvailable: number = 0;
  newUnit: string = 'g';
  newType: string = 'other';
  newNotes: string = '';
  expirationdate: string = '';

  // Nutrition fields
  energykcal: number | null = null;
  proteins: number | null = null;
  fats: number | null = null;
  sugars: number | null = null;
  salts: number | null = null;
  carbohydrates: number | null = null;

  // Dietary flags
  vegan: boolean = false;
  vegetarian: boolean = false;
  halal: boolean = false;
  kosher: boolean = false;

  constructor(
    private firestore: Firestore,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    if (this.isEditing && this.food) {
      // Initialize form fields when editing existing food
      this.initializeFormFields();
    } else if (!this.food) {
      // Create new food item structure if none provided
      this.food = this.firebaseService.createFoodItem();
    } else {
      // Food was provided (likely from barcode scan), initialize form with existing data
      this.initializeFormFields();
    }
  }

  private initializeFormFields() {
    if (!this.food) return;

    // Basic info
    this.newName = this.food.name || '';
    this.newType = this.food.type || 'other';
    this.newAmount = this.food.amount ?? 1;
    this.newAvailable = this.food.available ?? this.newAmount;
    this.newUnit = this.food.unit || 'g';
    this.expirationdate = this.food.expirationdate || '';
    this.newNotes = this.food.notes || '';
    this.newRating = this.food.rating ?? 0;

    // Dietary flags
    this.vegan = this.food.vegan ?? false;
    this.vegetarian = this.food.vegetarian ?? false;
    this.halal = this.food.halal ?? false;
    this.kosher = this.food.kosher ?? false;

    // Initialize nutrition fields from different possible sources
    if (this.food.nutriments) {
      // From comprehensive nutriments object (barcode scanned food)
      this.energykcal = this.food.nutriments['energy-kcal'] ?? null;
      this.proteins = this.food.nutriments.proteins ?? null;
      this.fats = this.food.nutriments.fat ?? null;
      this.sugars = this.food.nutriments.sugars ?? null;
      this.salts = this.food.nutriments.salt ?? null;
      this.carbohydrates = this.food.nutriments.carbohydrates ?? null;
    } else if (this.food.nutrition) {
      // From simplified nutrition object
      this.fats = this.food.nutrition.fat ?? null;
      this.salts = this.food.nutrition.salt ?? null;
      this.sugars = this.food.nutrition.sugar ?? null;
    } else {
      // From legacy flat structure or manual input
      this.energykcal = this.food.energykcal ?? null;
      this.proteins = this.food.proteins ?? null;
      this.fats = this.food.fats ?? null;
      this.sugars = this.food.sugars ?? null;
      this.salts = this.food.salts ?? null;
      this.carbohydrates = this.food.carbohydrates ?? null;
    }
  }

  getPantries() {
    return this.firebaseService.getPantries();
  }

  setRating(rating: number) {
    this.newRating = rating;
  }

  cancel() {
    this.modalController.dismiss();
  }

  async addFoodByBarcode(barcode: string): Promise<any | null> {
    const product = await this.firebaseService.fetchProductData(barcode);
    if (!product) {
      alert('Product not found');
      return null;
    }

    // Create food item with the comprehensive structure
    const food = {
      ...this.firebaseService.createFoodItem(), // Start with the default structure

      // Basic info
      name: product.product_name || 'unknown',
      type: '', // You might want to determine this from product categories
      openfoodfactsid: barcode, // Store the barcode as OpenFoodFacts ID
      expirationdate: product.expiration_date || '',
      amount: this.newAmount || 1,
      available: this.newAmount || 0,
      unit: '',

      // Dietary flags
      vegan: product.labels_tags?.includes('en:vegan') || false,
      vegetarian: product.labels_tags?.includes('en:vegetarian') || false,
      halal: product.labels_tags?.includes('en:halal') || false,
      kosher: product.labels_tags?.includes('en:kosher') || false,

      // Other properties
      image: product.image_front_small_url || product.image_url || '',
      allergens: (product.allergens_tags || []).map((a: string) =>
        a.replace('en:', '')
      ),
      notes: this.notes || '',
      rating: this.newRating || 0,

      // Map nutrition data to the new structure
      nutrition: {
        fat: product.nutriments?.fat || 0,
        'saturated-fat': product.nutriments?.['saturated-fat'] || 0,
        salt: product.nutriments?.salt || 0,
        sugar: product.nutriments?.sugars || 0,
      },

      // Map comprehensive nutriments data
      nutriments: {
        carbohydrates: product.nutriments?.carbohydrates || 0,
        carbohydrates_100g: product.nutriments?.carbohydrates_100g || 0,
        carbohydrates_serving: product.nutriments?.carbohydrates_serving || 0,
        carbohydrates_unit: 'g',
        carbohydrates_value: product.nutriments?.carbohydrates || 0,

        energy: product.nutriments?.energy || 0,
        'energy-kcal': product.nutriments?.['energy-kcal'] || 0,
        'energy-kcal_100g': product.nutriments?.['energy-kcal_100g'] || 0,
        'energy-kcal_serving': product.nutriments?.['energy-kcal_serving'] || 0,
        'energy-kcal_unit': 'kcal',
        'energy-kcal_value': product.nutriments?.['energy-kcal'] || 0,
        'energy-kcal_value_computed':
          product.nutriments?.['energy-kcal_value_computed'] || 0,
        energy_100g: product.nutriments?.energy_100g || 0,
        energy_serving: product.nutriments?.energy_serving || 0,
        energy_unit: 'kcal',
        energy_value: product.nutriments?.['energy-kcal'] || 0,

        fat: product.nutriments?.fat || 0,
        fat_100g: product.nutriments?.fat_100g || 0,
        fat_serving: product.nutriments?.fat_serving || 0,
        fat_unit: 'g',
        fat_value: product.nutriments?.fat || 0,

        proteins: product.nutriments?.proteins || 0,
        proteins_100g: product.nutriments?.proteins_100g || 0,
        proteins_serving: product.nutriments?.proteins_serving || 0,
        proteins_unit: 'g',
        proteins_value: product.nutriments?.proteins || 0,

        salt: product.nutriments?.salt || 0,
        salt_100g: product.nutriments?.salt_100g || 0,
        salt_serving: product.nutriments?.salt_serving || 0,
        salt_unit: 'g',
        salt_value: product.nutriments?.salt || 0,

        'saturated-fat': product.nutriments?.['saturated-fat'] || 0,
        'saturated-fat_100g': product.nutriments?.['saturated-fat_100g'] || 0,
        'saturated-fat_serving':
          product.nutriments?.['saturated-fat_serving'] || 0,
        'saturated-fat_unit': 'g',
        'saturated-fat_value': product.nutriments?.['saturated-fat'] || 0,

        sodium: product.nutriments?.sodium || 0,
        sodium_100g: product.nutriments?.sodium_100g || 0,
        sodium_serving: product.nutriments?.sodium_serving || 0,
        sodium_unit: 'g',
        sodium_value: product.nutriments?.sodium || 0,

        sugars: product.nutriments?.sugars || 0,
        sugars_100g: product.nutriments?.sugars_100g || 0,
        sugars_serving: product.nutriments?.sugars_serving || 0,
        sugars_unit: 'g',
        sugars_value: product.nutriments?.sugars || 0,
      },

      // Use defaults from createFoodItem for nutriments_estimated
      nutriments_estimated:
        this.firebaseService.createFoodItem().nutriments_estimated,

      // Environmental data (if available from OpenFoodFacts)
      footprint_per_kg: product.footprint_per_kg || 0,
      footprint_grade: product.footprint_grade || '',
    };

    return food;
  }

  async saveFood() {
    if (!this.food) {
      alert('No food available to save.');
      return;
    }

    // Create food item with the new structure
    const updatedFood = {
      ...this.firebaseService.createFoodItem(), // Start with the default structure

      // Basic info
      name: this.newName || this.food.name || '',
      type: this.newType || '',
      openfoodfactsid: this.food.openfoodfactsid || '',
      expirationdate: this.expirationdate || '',
      amount: this.newAmount || 1,
      available: this.newAvailable || 0,
      unit: this.newUnit || '',

      // Dietary flags
      vegan: this.vegan || false,
      vegetarian: this.vegetarian || false,
      halal: this.halal || false,
      kosher: this.kosher || false,

      // Other properties
      image: this.food.image || '',
      allergens: this.food.allergens || [],
      notes: this.newNotes || '',
      rating: this.newRating || 0,

      // Map nutrition data to the new structure
      nutrition: {
        fat: this.fats || 0,
        'saturated-fat': this.food.nutrition?.['saturated-fat'] || 0,
        salt: this.salts || 0,
        sugar: this.sugars || 0,
      },

      // Map nutriments data
      nutriments: {
        carbohydrates: this.carbohydrates || 0,
        carbohydrates_100g: this.food.nutriments?.carbohydrates_100g || 0,
        carbohydrates_serving: this.food.nutriments?.carbohydrates_serving || 0,
        carbohydrates_unit: 'g',
        carbohydrates_value: this.carbohydrates || 0,

        energy: this.food.nutriments?.energy || 0,
        'energy-kcal': this.energykcal || 0,
        'energy-kcal_100g': this.food.nutriments?.['energy-kcal_100g'] || 0,
        'energy-kcal_serving':
          this.food.nutriments?.['energy-kcal_serving'] || 0,
        'energy-kcal_unit': 'kcal',
        'energy-kcal_value': this.energykcal || 0,
        'energy-kcal_value_computed':
          this.food.nutriments?.['energy-kcal_value_computed'] || 0,
        energy_100g: this.food.nutriments?.energy_100g || 0,
        energy_serving: this.food.nutriments?.energy_serving || 0,
        energy_unit: 'kcal',
        energy_value: this.energykcal || 0,

        fat: this.fats || 0,
        fat_100g: this.food.nutriments?.fat_100g || 0,
        fat_serving: this.food.nutriments?.fat_serving || 0,
        fat_unit: 'g',
        fat_value: this.fats || 0,

        proteins: this.proteins || 0,
        proteins_100g: this.food.nutriments?.proteins_100g || 0,
        proteins_serving: this.food.nutriments?.proteins_serving || 0,
        proteins_unit: 'g',
        proteins_value: this.proteins || 0,

        salt: this.salts || 0,
        salt_100g: this.food.nutriments?.salt_100g || 0,
        salt_serving: this.food.nutriments?.salt_serving || 0,
        salt_unit: 'g',
        salt_value: this.salts || 0,

        'saturated-fat': this.food.nutriments?.['saturated-fat'] || 0,
        'saturated-fat_100g': this.food.nutriments?.['saturated-fat_100g'] || 0,
        'saturated-fat_serving':
          this.food.nutriments?.['saturated-fat_serving'] || 0,
        'saturated-fat_unit': 'g',
        'saturated-fat_value':
          this.food.nutriments?.['saturated-fat_value'] || 0,

        sodium: this.food.nutriments?.sodium || 0,
        sodium_100g: this.food.nutriments?.sodium_100g || 0,
        sodium_serving: this.food.nutriments?.sodium_serving || 0,
        sodium_unit: 'g',
        sodium_value: this.food.nutriments?.sodium_value || 0,

        sugars: this.sugars || 0,
        sugars_100g: this.food.nutriments?.sugars_100g || 0,
        sugars_serving: this.food.nutriments?.sugars_serving || 0,
        sugars_unit: 'g',
        sugars_value: this.sugars || 0,
      },

      // Keep existing nutriments_estimated or use defaults
      nutriments_estimated:
        this.food.nutriments_estimated ||
        this.firebaseService.createFoodItem().nutriments_estimated,

      // Environmental data
      footprint_per_kg: this.food.footprint_per_kg || 0,
      footprint_grade: this.food.footprint_grade || '',
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
}
