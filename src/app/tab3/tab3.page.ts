import { Component, inject } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';
import { ModalController } from '@ionic/angular';
import { OpenFoodDetailModalComponent } from '../modals/open-food-detail-modal/open-food-detail-modal.component';
import { ReservefoodService } from '../services/reserve-food.service';
import { NutritionService } from '../services/nutrition.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page {
  sortOption: string = 'name';
  isReserved: boolean = false;
  onlyReservedShown: boolean = false;

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

  name: string = '';
  nick: string = '';

  constructor(
    private firebaseService: FirebaseService,
    private modalController: ModalController,
    private reservefoodService: ReservefoodService,
    private nutritionService: NutritionService
  ) {}

  searchTerm: string = '';
  allPantries: any[] = [];
  filteredPantries: any[] = [];
  processedPantries: Set<string> = new Set();

   async ngOnInit() {
    this.loadReservedToggleState();
    await this.loadPantries();
  }

  async loadPantries() {
    const pantriesObs = this.firebaseService.getPantries();
    pantriesObs.subscribe(async (pantries) => {
      this.allPantries = pantries || [];
      console.log('Sample pantry from Firebase:', this.allPantries[0]);
      console.log(
        'Sample food from Firebase:',
        this.allPantries[0]?.foods?.[0]
      );

      // Process package info for all foods in all pantries
      // await this.processAllFoodsPackageInfo();

     // Load reserved states first before filtering
this.loadReservedStates();
this.filterPantries();
this.updateFilteredPantries();
    });
  }

    // Lazy loading: only process pantry when accordion is opened
  async onAccordionOpen(pantry: any) {
    if (!this.processedPantries.has(pantry.id) && pantry.foods && pantry.foods.length > 0) {
      console.log(`Processing pantry ${pantry.id} for the first time...`);
      
      // Process foods in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < pantry.foods.length; i += batchSize) {
        const batch = pantry.foods.slice(i, i + batchSize);
        await Promise.all(
          batch.map((food: any) => this.ensurePackageInfo(food))
        );
      }
      
      this.processedPantries.add(pantry.id);
      console.log(`Finished processing pantry ${pantry.id}`);
    }
  }

 async processAllFoodsPackageInfo() {
    // Process each pantry and its foods
    for (const pantry of this.allPantries) {
      if (pantry.foods && pantry.foods.length > 0) {
        // Process foods in batches to avoid overwhelming the API
        const batchSize = 5;
        for (let i = 0; i < pantry.foods.length; i += batchSize) {
          const batch = pantry.foods.slice(i, i + batchSize);
          await Promise.all(
            batch.map((food: any) => this.ensurePackageInfo(food))
          );
        }
      }
    }
  }

  async ensurePackageInfo(food: any) {
    // If package info is missing but we have an OpenFoodFacts ID, fetch it
    if ((!food.package_size || !food.package_unit) && food.openfoodfactsid) {
      try {
        const packageInfo = await this.fetchPackageInfoFromBarcode(
          food.openfoodfactsid
        );
        if (packageInfo.size > 0) {
          food.package_size = packageInfo.size;
          food.package_unit = packageInfo.unit;

          // Optionally update in database (uncomment if you want to persist changes)
          // await this.firebaseService.updateFoodItem(food);
        }
      } catch (error) {
        console.warn(`Failed to fetch package info for ${food.name}:`, error);
      }
    }

    // Fallback: Use original amount/unit if no package info and no barcode
    if ((!food.package_size || !food.package_unit) && !food.openfoodfactsid) {
      food.package_size = food.amount || 0;
      food.package_unit = food.unit || '';
    }

    // Ensure available is a number to fix display issues
    if (food.available === undefined || food.available === null) {
      food.available = 0;
    } else {
      food.available = Number(food.available);
    }
  }

  loadReservedStates() {
    console.log('Loading reserved states...');
    const reservedItems = this.reservefoodService.loadReservedItems();
    console.log('Reserved items from storage:', reservedItems);
    console.log('Current filteredPantries:', this.filteredPantries);
    
    this.allPantries.forEach((pantry, pantryIndex) => {
      console.log(`Processing pantry ${pantryIndex}:`, pantry);
      pantry.foods?.forEach((food: any, foodIndex: number) => {
        const reservedItem = reservedItems.find(
          (item) => item.barcode === food.barcode
        );
        console.log(`Food ${foodIndex} (barcode: ${food.barcode}):`, {
          wasReserved: food.isReserved,
          shouldBeReserved: !!reservedItem,
          reservedItem,
        });

        if (reservedItem) {
          food.isReserved = reservedItem.isReserved;
          console.log(`Set food ${food.barcode} to reserved:`, food.isReserved);
       } else {
          food.isReserved = false; // Ensure non-reserved items are marked as false
        }
      });
    });

    console.log('Final allPantries after loading:', this.allPantries);
  }

  // Check if a pantry has any reserved items
  hasReservedItems(pantry: any): boolean {
    return pantry.foods?.some((food: any) => food.isReserved) || false;
  }

  // Toggle function for showing only reserved items
  toggleReservedOnly() {
  this.saveReservedToggleState(); // Save state to localStorage
  this.updateFilteredPantries();
  }

  // Save toggle state to localStorage
  saveReservedToggleState() {
    try {
      localStorage.setItem('onlyReservedShown', JSON.stringify(this.onlyReservedShown));
    } catch (error) {
      console.warn('Failed to save toggle state:', error);
    }
  }

  // Load toggle state from localStorage
  loadReservedToggleState() {
    try {
      const saved = localStorage.getItem('onlyReservedShown');
      if (saved !== null) {
        this.onlyReservedShown = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load toggle state:', error);
    }
  }


  filterPantries() {
    const term = this.searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredPantries = [...this.allPantries];
      return;
    }

    this.filteredPantries = this.allPantries
      .map((pantry) => {
        const matchingFoods = (pantry.foods || []).filter((food: any) =>
          [
            food.name,
            food.amount ? `amount ${food.amount}` : '',
            food.available ? `available ${food.available}` : '',
            food.expirationdate,
            food.notes,
            food.type,
            food.unit,
            food.package_unit,
            food.package_size ? `package ${food.package_size}` : '',
            food.vegan ? 'vegan' : '',
            food.vegetarian ? 'vegetarian' : '',
            food.halal ? 'halal' : '',
            food.kosher ? 'kosher' : '',

            // Updated to use the new nested nutriments structure
            food.nutriments?.['energy-kcal']
              ? `calories ${food.nutriments['energy-kcal']}`
              : '',
            food.nutriments?.['energy-kcal_100g']
              ? `calories100g ${food.nutriments['energy-kcal_100g']}`
              : '',
            food.nutriments?.proteins
              ? `proteins ${food.nutriments.proteins}`
              : '',
            food.nutriments?.proteins_100g
              ? `proteins100g ${food.nutriments.proteins_100g}`
              : '',
            food.nutriments?.fat ? `fats ${food.nutriments.fat}` : '',
            food.nutriments?.fat_100g
              ? `fats100g ${food.nutriments.fat_100g}`
              : '',
            food.nutriments?.sugars ? `sugars ${food.nutriments.sugars}` : '',
            food.nutriments?.sugars_100g
              ? `sugars100g ${food.nutriments.sugars_100g}`
              : '',
            food.nutriments?.salt ? `salt ${food.nutriments.salt}` : '',
            food.nutriments?.salt_100g
              ? `salt100g ${food.nutriments.salt_100g}`
              : '',
            food.nutriments?.carbohydrates
              ? `carbohydrates ${food.nutriments.carbohydrates}`
              : '',
            food.nutriments?.carbohydrates_100g
              ? `carbohydrates100g ${food.nutriments.carbohydrates_100g}`
              : '',
            food.nutriments?.['saturated-fat']
              ? `saturatedfat ${food.nutriments['saturated-fat']}`
              : '',
            food.nutriments?.sodium ? `sodium ${food.nutriments.sodium}` : '',

            // Additional searchable fields from your new structure
            food.allergens ? food.allergens.join(' ') : '',
            food.openfoodfactsid ? food.openfoodfactsid : '',
            food.footprint_grade ? `footprint ${food.footprint_grade}` : '',
          ]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(term))
        );

        return matchingFoods.length > 0
          ? { ...pantry, foods: matchingFoods }
          : null;
      })
      .filter(Boolean);
  }

  sortFoods(foods: any[]) {
    if (!foods || foods.length === 0) return [];

    return [...foods].sort((a, b) => {
      switch (this.sortOption) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');

        case 'type':
          // First sort by type, then by name as secondary sort
          const typeCompare = (a.type || '').localeCompare(b.type || '');
          return typeCompare !== 0
            ? typeCompare
            : (a.name || '').localeCompare(b.name || '');

        case 'proteins':
          // Updated to use the new nested structure
          const proteinsA = a.nutriments?.proteins || 0;
          const proteinsB = b.nutriments?.proteins || 0;
          return proteinsB - proteinsA;

        case 'energykcal':
          // Updated to use the new nested structure
          const energyA = a.nutriments?.['energy-kcal'] || 0;
          const energyB = b.nutriments?.['energy-kcal'] || 0;
          return energyB - energyA;

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

        // Additional sorting options for new structure
        case 'package_size':
          return (b.package_size || 0) - (a.package_size || 0);

        case 'available':
          return (b.available || 0) - (a.available || 0);

        case 'footprint':
          const footprintA = a.footprint_per_kg || 0;
          const footprintB = b.footprint_per_kg || 0;
          return footprintA - footprintB;

        default:
          return 0;
      }
    });
  }

  getPantries() {
    return this.firebaseService.getPantries();
  }

  async openFoodDetail(food: any) {
    console.log('Opening food detail for:', food);

    if (!food.package_size || !food.package_unit) {
      const info = await this.fetchPackageInfoFromBarcode(food.openfoodfactsid);
      food.package_size = info.size;
      food.package_unit = info.unit;
    }

    const modal = await this.modalController.create({
      component: OpenFoodDetailModalComponent,
      componentProps: { food },
      handle: true,
      breakpoints: [0, 0.5, 0.75, 1],
      initialBreakpoint: 0.5,
      showBackdrop: true,
      backdropDismiss: false,
      canDismiss: async (data?: any, role?: string) => {
        return role !== 'gesture';
      },
      cssClass: 'food-detail-modal',
    });

    modal.onWillDismiss().then((result) => {
      console.log('Modal dismissed with result:', result);
      const { someBoolean, foodId } = result.data || {};
      console.log('someBoolean:', someBoolean, 'foodId:', foodId);

      if (foodId) {
        for (const pantry of this.filteredPantries) {
          const foundFood = pantry.foods?.find(
            (f: any) => f.barcode === foodId
          );
          if (foundFood) {
            foundFood.isReserved = someBoolean;
            break;
          }
        }

        for (const pantry of this.filteredPantries) {
          const foodIndex = pantry.foods?.findIndex(
            (f: any) => f.barcode === foodId
          );
          if (foodIndex > -1) {
            pantry.foods[foodIndex].isReserved = someBoolean;
            pantry.foods = [...pantry.foods];
            break;
          }
        }
        this.reservefoodService.saveReservedItems(this.filteredPantries);
        this.updateFilteredPantries();
      }
    });

    await modal.present();
  }

  sortPantries(pantries: any[]) {
    if (!pantries || pantries.length === 0) return [];

    return [...pantries].sort((a, b) => {
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  onSortOptionChange(event: any) {
    this.sortOption = event.detail.value;
    this.updateFilteredPantries(); // Update the filtered pantries when sort changes
  }

  updateFilteredPantries() {
    let pantriesToProcess = this.allPantries;

    // Apply search filter first
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      pantriesToProcess = this.allPantries
        .map((pantry) => {
          const filteredItems = (pantry.foods || []).filter(
            (item: any) =>
              (item.name || '').toLowerCase().includes(searchLower) ||
              (item.type || '').toLowerCase().includes(searchLower) ||
              (item.notes || '').toLowerCase().includes(searchLower)
          );

          return filteredItems.length > 0
            ? { ...pantry, foods: filteredItems }
            : (pantry.name || '').toLowerCase().includes(searchLower)
            ? pantry
            : null;
        })
        .filter(Boolean);
    }

    // Apply reserved filter if toggle is on
    if (this.onlyReservedShown) {
      pantriesToProcess = pantriesToProcess
        .map((pantry) => {
          const reservedFoods = (pantry.foods || []).filter((food: any) => food.isReserved);
          return reservedFoods.length > 0
            ? { ...pantry, foods: reservedFoods }
            : null;
        })
        .filter(Boolean);
    }

    // Sort pantries and their foods
    this.filteredPantries = this.sortPantries(pantriesToProcess).map(
      (pantry) => ({
        ...pantry,
        foods: this.sortFoods(pantry.foods || []),
      })
    );
  }

  getCalories(food: any): number {
    return this.nutritionService.getTotalCalories(food);
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

  async fetchPackageInfoFromBarcode(
    barcode: string
  ): Promise<{ size: number; unit: string }> {
    const product = await this.firebaseService.fetchProductData(barcode);
    if (!product || !product.quantity) return { size: 0, unit: '' };

    // Example quantity strings: "500g", "1.5L"
    const match = product.quantity.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
    if (match) {
      return {
        size: parseFloat(match[1]),
        unit: match[2].toLowerCase(),
      };
    }

    return { size: 0, unit: '' };
  }

  getCalorieInfo(food: any) {
    return this.nutritionService.getCalorieInfo(food);
  }
}
