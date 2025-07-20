import { Component, importProvidersFrom, inject, OnInit } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';
import { Firestore, doc, setDoc, deleteDoc, getDoc } from '@angular/fire/firestore';
import { BarcodeScanner, type BarcodesScannedEvent, BarcodeFormat, LensFacing } from '@capacitor-mlkit/barcode-scanning';
import { AddFoodModalComponent } from '../add-food-modal/add-food-modal.component';
import { ModalController } from '@ionic/angular';
import { AlertController } from '@ionic/angular';
import { PantrySettingsModalComponent } from '../pantry-settings-modal/pantry-settings-modal.component';
import { NutritionService } from '../services/nutrition.service';
import { EatenFood } from '../models/eaten-food';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss'],
  standalone: false,
})
export class Tab4Page {

  firebaseService = inject(FirebaseService);
  name:string = '';
  nick:string = '';
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

     sortOptions = [
    { value: 'name', label: 'alphabetically' },
    { value: 'type', label: 'type' },
    { value: 'proteins', label: 'proteins (high to low)' },
    { value: 'energykcal', label: 'calories (high to low)' },
    { value: 'allergens', label: 'allergens (most to least)' },
    { value: 'allergens_asc', label: 'allergens (least to most)' },
    { value: 'expirationdate', label: 'expiration date' },
    { value: 'rating', label: 'Rating (high to low)' }
  ];

 constructor(private firestore: Firestore, private modalController: ModalController, private alertController: AlertController, private nutritionService: NutritionService) {}

 async ngOnInit() {
  // await this.firebaseService.deleteMyTestPantries('testy');
  // await this.firebaseService.deleteMyTestPantries('0');

const savedId = localStorage.getItem('pantry');
  if (savedId) {
    this.firebaseService.pantryId = savedId;
    await this.firebaseService.loadPantry();

    const pantry = this.firebaseService.getPantry();
    if (pantry) {
      this.name = pantry.name;
      this.nick = pantry.nick;
      this.pantryCreated = true;
      this.pantryItems = pantry.foods || [];
      this.allFoods = pantry.foods || [];
      this.filteredFoods = [...this.allFoods];
    }
  }
  this.loadPantryItems();
 }

  async add() {
  if (this.name != '' && this.nick != '') {
    const pantryAdded = await this.firebaseService.addPantry(this.name, this.nick);
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

  getPantries()
  {
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
  const existingItem = pantry?.foods?.find((item: any) => item.barcode === barcode);

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
      const listener = await BarcodeScanner.addListener('barcodesScanned', async (event: any) => {
        console.log('Barcode detected:', event.barcodes[0]?.rawValue);
        await listener.remove();
        resolve(event.barcodes[0]?.rawValue || null);
      });

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

async addFoodByBarcode(barcode: string): Promise<any | null> {
  const product = await this.firebaseService.fetchProductData(barcode);
  if (!product) {
    alert('Product not found');
    return null;
  }

  const food = {
    type: '',
    barcode: barcode,
    name: product.product_name || 'unknown',
    expirationdate: product.expiration_date || '',
    amount: this.amount,
    available: this.amount,
    unit: '',
    vegan: product.labels_tags?.includes('en:vegan') || false,
    vegetarian: product.labels_tags?.includes('en:vegetarian') || false,
    halal: product.labels_tags?.includes('en:halal') || false,
    kosher: product.labels_tags?.includes('en:kosher') || false,
    opened: false,
    allergens: (product.allergens_tags || []).map((a: string) => a.replace('en:', '')),
    image: product.image_front_small_url || product.image_url || '',
    energykcal: product.nutriments?.['energy-kcal'] || null,
    proteins: product.nutriments?.proteins || null,
    fats: product.nutriments?.fat || null,
    sugars: product.nutriments?.sugars || null,
    salts: product.nutriments?.salt || null,
    carbohydrates: product.nutriments?.carbohydrates || null,
    notes: this.notes,
    rating: this.newRating,
  };

  return food;
}

async openPantrySettings()
{
  const modal = await this.modalController.create({
    component: PantrySettingsModalComponent,
    breakpoints: [0, 0.5, 1],
    initialBreakpoint: 1,
    canDismiss: true,
    showBackdrop: true,
    cssClass: 'pantry-settings-modal',
  });

modal.onDidDismiss().then(async (result) => {
  if (result.data) {
  if (result.data.action === 'delete') {
      await this.deleteMyPantry();
    }
  }
});

await modal.present();
}

async deleteMyPantry() {
  await this.firebaseService.deletePantry();
  this.pantryCreated = false;
  this.pantryItems = [];
  this.allFoods = [];
  this.filteredFoods = []; 
  this.name = '';
  this.nick = '';
  localStorage.removeItem('pantry');
}

async editFoodItem(item: any) {
  console.log('Editing item:', item);
  
  try {
    const modal = await this.modalController.create({
      component: AddFoodModalComponent,
      componentProps: { 
        food: item,
        isEditing: true
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
        buttons: ['OK']
      });
      await successAlert.present();
    }
  } catch (error) {
    console.error('Error editing food item:', error);
    
    const errorAlert = await this.alertController.create({
      header: 'error',
      message: 'Failed to update food item. Please try again.',
      buttons: ['OK']
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
        role: 'cancel'
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
              buttons: ['OK']
            });
            await successAlert.present();
          } catch (error) {
            console.error('error deleting food item:', error);

            const errorAlert = await this.alertController.create({
              header: 'Error',
              message: 'Failed to delete food item. Please try again.',
              buttons: ['OK']
            });
            await errorAlert.present();
          }
        }
      }
    ]
  });
  
  await alert.present();
}

async eatFoodItem() {
  if (!this.food || !this.food.energykcal) {
    alert("No valid energykcal value available.");
    return;
  }

  const eatenFood: EatenFood = {
    name: this.food.name,
    amount: this.food.amount,
    unit: this.food.unit,
    type: this.food.type,
    notes: this.food.notes,
    rating: this.food.rating,
    expirationdate: this.food.expirationdate,
    energykcal: this.food.energykcal,
    proteins: this.food.proteins,
    fats: this.food.fats,
    sugars: this.food.sugars,
    salts: this.food.salts,
    carbohydrates: this.food.carbohydrates,
    timestamp: Date.now()
  };

  await this.nutritionService.logFood(eatenFood);
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
      food.carbohydrates ? `carbohydrates ${food.carbohydrates}` : ''
    ].filter(Boolean).join(' ');
    
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
          return typeCompare !== 0 ? typeCompare : (a.name || '').localeCompare(b.name || '');

        case 'proteins':
          return (b.proteins || 0) - (a.proteins || 0);

        case 'energykcal':
          return (b.energykcal || 0) - (a.energykcal || 0);

        case 'rating':
          return (b.rating || 0) - (a.rating || 0);

        case 'expirationdate':
          const dateA = a.expirationdate ? new Date(a.expirationdate) : new Date('9999-12-31');
          const dateB = b.expirationdate ? new Date(b.expirationdate) : new Date('9999-12-31');
          return dateA.getTime() - dateB.getTime();

      case 'allergens':
        const allergenCountA = this.countAllergens(a);
        const allergenCountB = this.countAllergens(b);
        const allergenCompare = allergenCountB - allergenCountA;
        return allergenCompare !== 0 ? allergenCompare : (a.name || '').localeCompare(b.name || '');

      case 'allergens_asc':
        const allergenCountA_asc = this.countAllergens(a);
        const allergenCountB_asc = this.countAllergens(b);
        const allergenCompare_asc = allergenCountA_asc - allergenCountB_asc;
        return allergenCompare_asc !== 0 ? allergenCompare_asc : (a.name || '').localeCompare(b.name || '');

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
      
      const filtered = (this.pantryItems || []).filter(item => 
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