import { Component, importProvidersFrom, inject, OnInit } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';
import { Firestore } from '@angular/fire/firestore';
import {
  BarcodeScanner,
  type BarcodesScannedEvent,
  BarcodeFormat,
  LensFacing,
} from '@capacitor-mlkit/barcode-scanning';
import { AddFoodModalComponent } from '../modals/add-food-modal/add-food-modal.component';
import { ActionSheetController, ModalController } from '@ionic/angular';
import { AlertController } from '@ionic/angular';
import { PantrySettingsModalComponent } from '../modals/pantry-settings-modal/pantry-settings-modal.component';
import { NutritionService } from '../services/nutrition.service';
import { EatenFood } from '../models/eaten-food';
import { ManualFoodModalComponent } from '../modals/manual-food-modal/manual-food-modal.component';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss'],
  standalone: false,
})
export class Tab4Page {
  firebaseService = inject(FirebaseService);
  name: string = '';
  nick: string = '';
  pantryCreated = false;
  pantryItems: any[] = [];
  isScanning = false;

  scannedContent: string | null = null;
  scannedCode: string | null = null;
  scanListener: any;

  food: any = null;
  newName: string = '';
  newRating: number = 5;
  notes: string = '';
  amount: number = 0;
  unit: string = '';

  searchTerm: string = '';
  allFoods: any[] = [];
  filteredFoods: any[] = [];

  editName: string = '';
  editNick: string = '';

  sortOption: string = 'name';

  newDailyLimit: number = 0;

  sortOptions = [
    { value: 'name', label: 'alphabetically' },
    { value: 'type', label: 'type' },
    { value: 'proteins', label: 'proteins (high to low)' },
    { value: 'energykcal', label: 'calories (high to low)' },
    { value: 'allergens', label: 'allergens (most to least)' },
    { value: 'allergens_asc', label: 'allergens (least to most)' },
    { value: 'expirationdate', label: 'expiration date' },
    { value: 'rating', label: 'Rating (high to low)' },
  ];

  constructor(
    private firestore: Firestore,
    private modalController: ModalController,
    private alertController: AlertController,
    private nutritionService: NutritionService,
    private actionSheetController: ActionSheetController
  ) {}

  // async ngOnInit() {
  //   // await this.firebaseService.deleteMyTestPantries('testy');
  //   // await this.firebaseService.deleteMyTestPantries('0');

  //   const savedId = localStorage.getItem('pantry');
  //   if (savedId) {
  //     this.firebaseService.pantryId = savedId;
  //     await this.firebaseService.loadPantry();

  //     const pantry = this.firebaseService.getPantry();
  //     if (pantry) {
  //       this.name = pantry.name;
  //       this.nick = pantry.nick;
  //       this.pantryCreated = true;
  //       this.pantryItems = pantry.foods || [];
  //       this.allFoods = pantry.foods || [];
  //       this.filteredFoods = [...this.allFoods];
  //     }
  //   }
  //   this.loadPantryItems();
  // }

  ngOnInit() {
    // Initialize with current limit
    this.newDailyLimit = this.nutritionService.getDailyLimit();
  }

  async ionViewWillEnter() {
    // await this.firebaseService.deleteMyTestPantries('testy');
    // await this.firebaseService.deleteMyTestPantries('0');

    const savedId = localStorage.getItem('pantryId');
    if (!savedId) {
      this.resetPantryState();
      return;
    }

    if (this.firebaseService.pantryId !== savedId) {
      this.firebaseService.pantryId = savedId;
    }

    await this.firebaseService.loadPantry();
    const pantry = this.firebaseService.getPantry();

    if (!pantry) {
      this.resetPantryState();
      localStorage.removeItem('pantryId');
      return;
    }

    this.name = pantry.name;
    this.nick = pantry.nick;
    this.pantryCreated = true;
    this.pantryItems = pantry.foods || [];
    this.allFoods = pantry.foods || [];
    this.filteredFoods = [...this.allFoods];
    this.updateFilteredFoods();
  }

  private resetPantryState() {
    this.pantryCreated = false;
    this.pantryItems = [];
    this.allFoods = [];
    this.filteredFoods = [];
    this.name = '';
    this.nick = '';
    this.firebaseService.pantryId = '';
  }

  async add() {
    if (this.name != '' && this.nick != '') {
      const pantryAdded = await this.firebaseService.addPantry(
        this.name,
        this.nick
      );
      if (pantryAdded) {
        this.name = '';
        this.nick = '';
        this.pantryCreated = true;
        await this.firebaseService.loadPantry();
        const pantry = this.firebaseService.getPantry();
        if (pantry) {
          this.name = pantry.name;
          this.nick = pantry.nick;
        }
      }
    }
  }

  getPantries() {
    return this.firebaseService.getPantries();
  }

  async loadPantryItems() {
    const pantry = await this.firebaseService.getPantry();
    if (pantry && Array.isArray(pantry.foods)) {
      this.pantryItems = pantry.foods;
      this.allFoods = pantry.foods;
      this.filteredFoods = [...this.allFoods];
      this.updateFilteredFoods();
    } else {
      this.pantryItems = [];
      this.allFoods = [];
      this.filteredFoods = [];
    }
  }

  async openFoodActions() {
    const actionSheet = await this.actionSheetController.create({
      header: 'add food',
      cssClass: 'custom-sheet',
      buttons: [
        {
          text: 'scan barcode',
          icon: 'barcode-outline',
          role: 'barcode',
          handler: () => {
            this.openAddFoodModalWithScan();
          },
        },
        {
          text: 'add manually',
          icon: 'create-outline',
          role: 'manual',
          handler: () => {
            this.openManualFoodModal();
          },
        },
        {
          text: 'cancel',
          icon: 'close',
          role: 'cancel',
        },
      ],
    });
    await actionSheet.present();
  }

  async openManualFoodModal() {
    const modal = await this.modalController.create({
      component: ManualFoodModalComponent,
      cssClass: 'food-detail-modal',
      componentProps: {
        isEditing: false,
        food: this.firebaseService.createFoodItem(),
      },
    });

    await modal.present();
  }

  async scanBarcode() {
    document.body.classList.add('barcode-scanner-active');
    this.scanListener = await BarcodeScanner.addListener(
      'barcodesScanned',
      async (event) => {
        if (event.barcodes && event.barcodes.length > 0) {
          const code = event.barcodes[0].displayValue;
          this.scannedCode = code;

          await BarcodeScanner.stopScan();
          await this.scanListener.remove();
          document.body.classList.remove('barcode-scanner-active');

          this.addFoodByBarcode(code);
        }
      }
    );
    document.body.classList.add('barcode-scanner-active');
    await BarcodeScanner.startScan();
  }

  async openAddFoodModalWithScan() {
    this.isScanning = true;
    document.body.classList.add('barcode-scanner-active');

    const barcode = await this.scanSingleBarcode();
    this.isScanning = false;

    document.body.classList.remove('barcode-scanner-active');

    if (!barcode) {
      alert('No barcode scanned.');
      return;
    }

    const food = await this.addFoodByBarcode(barcode);

    if (!food) {
      alert('Food not found for this barcode.');
      return;
    }

    const pantry = await this.firebaseService.getPantry();
    const existingItem = pantry?.foods?.find(
      (item: any) => item.barcode === barcode
    );

    const modal = await this.modalController.create({
      component: AddFoodModalComponent,
      componentProps: { food },
      cssClass: 'barcode-modal',
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      const pantry = await this.firebaseService.getPantry();
      if (pantry) {
        await this.firebaseService.updatePantryWithFood(pantry.id, data);
        this.loadPantryItems();
      }
    }
  }

  async scanSingleBarcode(): Promise<string | null> {
    console.log('Starting barcode scan...');

    return new Promise(async (resolve, reject) => {
      try {
        const listener = await BarcodeScanner.addListener(
          'barcodesScanned',
          async (event: any) => {
            console.log('Barcode detected:', event.barcodes[0]?.rawValue);
            await listener.remove();
            resolve(event.barcodes[0]?.rawValue || null);
          }
        );

        await BarcodeScanner.startScan();
        console.log('BarcodeScanner.startScan() called');
      } catch (err) {
        console.error('Barcode scanning failed:', err);
        reject(null);
        this.isScanning = false;
      }
    });
  }

  async stopScan() {
    try {
      await BarcodeScanner.stopScan();
      await BarcodeScanner.removeAllListeners();
      this.isScanning = false;
      document.body.classList.remove('barcode-scanner-active');
    } catch (error) {
      console.error('Error stopping scan:', error);
    }
  }

  async cancelScan() {
    await this.stopScan();
  }

  // async addFoodByBarcode(barcode: string): Promise<any | null> {
  //   const product = await this.firebaseService.fetchProductData(barcode);
  //   if (!product) {
  //     alert('Product not found');
  //     return null;
  //   }

  //   const food = {
  //     type: '',
  //     barcode: barcode,
  //     name: product.product_name || 'unknown',
  //     expirationdate: product.expiration_date || '',
  //     amount: this.amount,
  //     available: this.amount,
  //     unit: '',
  //     vegan: product.labels_tags?.includes('en:vegan') || false,
  //     vegetarian: product.labels_tags?.includes('en:vegetarian') || false,
  //     halal: product.labels_tags?.includes('en:halal') || false,
  //     kosher: product.labels_tags?.includes('en:kosher') || false,
  //     opened: false,
  //     allergens: (product.allergens_tags || []).map((a: string) => a.replace('en:', '')),
  //     image: product.image_front_small_url || product.image_url || '',
  //     energykcal: product.nutriments?.['energy-kcal'] || null,
  //     proteins: product.nutriments?.proteins || null,
  //     fats: product.nutriments?.fat || null,
  //     sugars: product.nutriments?.sugars || null,
  //     salts: product.nutriments?.salt || null,
  //     carbohydrates: product.nutriments?.carbohydrates || null,
  //     notes: this.notes,
  //     rating: this.newRating,
  //   };

  //   return food;
  // }

  async addFoodByBarcode(barcode: string): Promise<any | null> {
    const product = await this.firebaseService.fetchProductData(barcode);
    if (!product) {
      alert('Product not found');
      return null;
    }

    // Create food item with the comprehensive structure matching saveFood()
    const food = {
      ...this.firebaseService.createFoodItem(), // Start with the default structure

      // Basic info
      name: product.product_name || 'unknown',
      type: '', // You might want to determine this from product categories
      openfoodfactsid: barcode, // Store the barcode as OpenFoodFacts ID
      expirationdate: product.expiration_date || '',
      amount: this.amount || 1,
      available: this.amount || 1,
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

  async openPantrySettings() {
    const modal = await this.modalController.create({
      component: PantrySettingsModalComponent,
      componentProps: {
        nutritionService: this.nutritionService,
      },
      breakpoints: [0, 0.5, 1],
      initialBreakpoint: 1,
      canDismiss: true,
      showBackdrop: true,
      cssClass: 'pantry-settings-modal',
    });

    modal.onDidDismiss().then(async (result) => {
      if (result.data) {
        if (result.data.action === 'delete' || result.data.deleted === true) {
          localStorage.removeItem('pantry');
          localStorage.removeItem('pantryId');
          this.firebaseService.pantryId = '';
          this.resetPantryState();
        }
      }
    });
    await modal.present();
  }

  async deleteMyPantry() {
    await this.firebaseService.deletePantry();
    localStorage.removeItem('pantryId');
    this.firebaseService.pantryId = '';
    this.resetPantryState();
    // this.pantryCreated = false;
    // this.pantryItems = [];
    // this.allFoods = [];
    // this.filteredFoods = [];
    // this.name = '';
    // this.nick = '';
  }

  async editFoodItem(item: any) {
    console.log('Editing item:', item);

    try {
      const modal = await this.modalController.create({
        component: AddFoodModalComponent,
        componentProps: {
          food: item,
          isEditing: true,
        },
        cssClass: 'barcode-modal',
      });

      await modal.present();

      const { data } = await modal.onDidDismiss();
      if (data) {
        console.log('Edit data received:', data);

        const pantry = await this.firebaseService.getPantry();
        if (!pantry) {
          throw new Error('no pantry found');
        }

        await this.firebaseService.updateFoodInPantry(item, data);

        await this.loadPantryItems();

        const successAlert = await this.alertController.create({
          header: 'success',
          message: 'Food item updated!',
          buttons: ['OK'],
        });
        await successAlert.present();
      }
    } catch (error) {
      console.error('Error editing food item:', error);

      const errorAlert = await this.alertController.create({
        header: 'error',
        message: 'Failed to update food item. Please try again.',
        buttons: ['OK'],
      });
      await errorAlert.present();
    }
  }

  async deleteFoodItem(item: any) {
    console.log('Deleting item:', item);

    const alert = await this.alertController.create({
      header: 'delete food item',
      message: `Are you sure you want to delete "${item.name}"?`,
      buttons: [
        {
          text: 'cancel',
          role: 'cancel',
        },
        {
          text: 'delete',
          handler: async () => {
            try {
              await this.firebaseService.deleteFoodFromPantry(item);
              await this.loadPantryItems();

              const successAlert = await this.alertController.create({
                header: 'success',
                message: 'Food item deleted!',
                buttons: ['OK'],
              });
              await successAlert.present();
            } catch (error) {
              console.error('error deleting food item:', error);

              const errorAlert = await this.alertController.create({
                header: 'Error',
                message: 'Failed to delete food item. Please try again.',
                buttons: ['OK'],
              });
              await errorAlert.present();
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async eatFoodItem(item: any) {
    this.food = item;
    console.log('Current food object:', this.food);
    if (!this.food) {
      const alert = await this.alertController.create({
        header: 'missing food',
        message: 'No food item was selected.',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    const energykcal = this.nutritionService.getTotalCalories(this.food);
    if (energykcal <= 0) {
      const alert = await this.alertController.create({
        header: 'missing data',
        message: 'No valid energy value is available for this food item.',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    const kcalPer100g = this.food.nutriments['energy-kcal_100g'] || 0;
    const amount = this.food.amount || 0;
    const totalKcal = (kcalPer100g * amount) / 100;

    const eatenFood: EatenFood = {
      name: this.food.name,
      amount: this.food.amount,
      unit: this.food.unit,
      type: this.food.type,
      notes: this.food.notes,
      rating: this.food.rating,
      expirationdate: this.food.expirationdate,
      timestamp: Date.now(),
      nutriments: {
        'energy-kcal': this.food.nutriments?.['energy-kcal'] || 0,
        proteins: this.food.nutriments?.proteins || 0,
        fats: this.food.nutriments?.fats || 0,
        carbohydrates: this.food.nutriments?.carbohydrates || 0,
        sugars: this.food.nutriments?.sugars || 0,
        salts: this.food.nutriments?.salts || 0,
      },
      nutrition: {
        fat: this.food.nutrition?.fat || 0,
        'saturated-fat': this.food.nutrition?.['saturated-fat'] || 0,
        salt: this.food.nutrition?.salt || 0,
        sugar: this.food.nutrition?.sugar || 0,
      },
    };

    await this.nutritionService.logFood(eatenFood);
    const successAlert = await this.alertController.create({
      header: 'success',
      message: `"${this.food.name}" was added to your food log!`,
      buttons: ['OK'],
    });
    await successAlert.present();
  }

  filterMyPantry() {
    const term = this.searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredFoods = [...this.allFoods];
      return;
    }

    this.filteredFoods = (this.allFoods || []).filter((food: any) => {
      const searchFields = [
        food.name,
        food.type,
        food.notes,
        food.unit,
        food.vegan ? 'vegan' : '',
        food.vegetarian ? 'vegetarian' : '',
        food.halal ? 'halal' : '',
        food.kosher ? 'kosher' : '',
        food.amount ? `amount ${food.amount}` : '',
        food.available ? `available ${food.available}` : '',
        food.energykcal ? `calories ${food.energykcal}` : '',
        food.proteins ? `proteins ${food.proteins}` : '',
        food.fats ? `fats ${food.fats}` : '',
        food.sugars ? `sugars ${food.sugars}` : '',
        food.salts ? `salts ${food.salts}` : '',
        food.carbohydrates ? `carbohydrates ${food.carbohydrates}` : '',
      ]
        .filter(Boolean)
        .join(' ');

      return searchFields.toLowerCase().includes(term);
    });
  }

  sortFoods(foods: any[]) {
    if (!foods || foods.length === 0) return [];

    return [...foods].sort((a, b) => {
      switch (this.sortOption) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');

        case 'type':
          const typeCompare = (a.type || '').localeCompare(b.type || '');
          return typeCompare !== 0
            ? typeCompare
            : (a.name || '').localeCompare(b.name || '');

        case 'proteins':
          return (b.proteins || 0) - (a.proteins || 0);

        case 'energykcal':
          return (b.energykcal || 0) - (a.energykcal || 0);

        case 'rating':
          return (b.rating || 0) - (a.rating || 0);

        case 'expirationdate':
          const dateA = a.expirationdate
            ? new Date(a.expirationdate)
            : new Date('9999-12-31');
          const dateB = b.expirationdate
            ? new Date(b.expirationdate)
            : new Date('9999-12-31');
          return dateA.getTime() - dateB.getTime();

        case 'allergens':
          const allergenCountA = this.countAllergens(a);
          const allergenCountB = this.countAllergens(b);
          const allergenCompare = allergenCountB - allergenCountA;
          return allergenCompare !== 0
            ? allergenCompare
            : (a.name || '').localeCompare(b.name || '');

        case 'allergens_asc':
          const allergenCountA_asc = this.countAllergens(a);
          const allergenCountB_asc = this.countAllergens(b);
          const allergenCompare_asc = allergenCountA_asc - allergenCountB_asc;
          return allergenCompare_asc !== 0
            ? allergenCompare_asc
            : (a.name || '').localeCompare(b.name || '');

        default:
          return 0;
      }
    });
  }

  onSortOptionChange(event: any) {
    this.sortOption = event.detail.value;
    this.updateFilteredFoods();
  }

  updateFilteredFoods() {
    if (!this.searchTerm.trim()) {
      this.filteredFoods = this.sortFoods(this.pantryItems || []);
    } else {
      const searchLower = this.searchTerm.toLowerCase();

      const filtered = (this.pantryItems || []).filter(
        (item) =>
          item.name?.toLowerCase().includes(searchLower) ||
          item.type?.toLowerCase().includes(searchLower) ||
          item.notes?.toLowerCase().includes(searchLower)
      );

      this.filteredFoods = this.sortFoods(filtered);
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

  extract(nutrient: string, food: any): number {
    return this.nutritionService.extractNutritionValue(food, nutrient);
  }

  getCalories(food: any): number {
    return this.nutritionService.getTotalCalories(food);
  }
}
