import { Component, inject } from '@angular/core';
import { FirebaseService } from '../services/firebase.service';
import { ModalController } from '@ionic/angular';
import { OpenFoodDetailModalComponent } from '../open-food-detail-modal/open-food-detail-modal.component';
import { ReservefoodService } from '../services/reserve-food.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page {

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

  name:string = '';
  nick:string = '';

  constructor(private firebaseService: FirebaseService, private modalController: ModalController, private reservefoodService: ReservefoodService) {}

  searchTerm: string = '';
  allPantries: any[] = [];
  filteredPantries: any[] = [];

  isReserved: boolean = false;

  ngOnInit() {
  this.loadPantries();
  }

async loadPantries() {
  const pantriesObs = this.firebaseService.getPantries();
  pantriesObs.subscribe((pantries) => {
    this.allPantries = pantries || [];
    console.log('Sample pantry from Firebase:', this.allPantries[0]);
    console.log('Sample food from Firebase:', this.allPantries[0]?.foods?.[0]);
    this.filterPantries();
    this.updateFilteredPantries();
    this.loadReservedStates();
  });
}

loadReservedStates() {
  console.log('Loading reserved states...');
  const reservedItems = this.reservefoodService.loadReservedItems();
  console.log('Reserved items from storage:', reservedItems);
  console.log('Current filteredPantries:', this.filteredPantries);
  this.filteredPantries.forEach((pantry, pantryIndex) => {
    console.log(`Processing pantry ${pantryIndex}:`, pantry);
    pantry.foods?.forEach((food: any, foodIndex: number) => {
      const reservedItem = reservedItems.find(item => item.barcode === food.barcode);
      console.log(`Food ${foodIndex} (barcode: ${food.barcode}):`, {
        wasReserved: food.isReserved,
        shouldBeReserved: !!reservedItem,
        reservedItem
      });
      
      if (reservedItem) {
        food.isReserved = reservedItem.isReserved;
        console.log(`Set food ${food.barcode} to reserved:`, food.isReserved);
      }
    });
  });
  
  console.log('Final filteredPantries after loading:', this.filteredPantries);
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
          food.vegan ? 'vegan' : '',
          food.vegetarian ? 'vegetarian' : '',
          food.halal ? 'halal' : '',
          food.kosher ? 'kosher' : '',
          food.energykcal ? `calories ${food.energykcal}` : '',
          food.proteins ? `proteins ${food.proteins}` : '',
          food.fats ? `fats ${food.fats}` : '',
          food.sugars ? `sugars ${food.sugars}` : '',
          food.salts ? `salts ${food.salts}` : '',
          food.carbohydrates ? `carbohydrates ${food.carbohydrates}` : '',
        ]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(term))
      );

      return matchingFoods.length > 0 ? { ...pantry, foods: matchingFoods } : null;
    })
    .filter(Boolean);
}

  getPantries()
  {
    return this.firebaseService.getPantries();
  }


async openFoodDetail(food: any) {
  console.log('Opening food detail for:', food);
  
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
    const foundFood = pantry.foods?.find((f: any) => f.barcode === foodId);
    if (foundFood) {
      foundFood.isReserved = someBoolean;
      break;
    }
  }
      
for (const pantry of this.filteredPantries) {
  const foodIndex = pantry.foods?.findIndex((f: any) => f.barcode === foodId);
  if (foodIndex > -1) {
    pantry.foods[foodIndex].isReserved = someBoolean;
    pantry.foods = [...pantry.foods];
    break;
  }
}
        this.reservefoodService.saveReservedItems(this.filteredPantries);
    }
  });

  await modal.present();
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
  if (!this.searchTerm.trim()) {
    this.filteredPantries = this.sortPantries(this.allPantries).map(pantry => ({
      ...pantry,
      foods: this.sortFoods(pantry.foods || []) // ← fix here
    }));
  } else {
    const searchLower = this.searchTerm.toLowerCase();

    this.filteredPantries = this.sortPantries(this.allPantries)
      .map(pantry => {
        const filteredItems = (pantry.foods || []).filter((item: any) =>
          (item.name || '').toLowerCase().includes(searchLower) ||
          (item.type || '').toLowerCase().includes(searchLower) ||
          (item.notes || '').toLowerCase().includes(searchLower)
        );

        const sortedItems = this.sortFoods(filteredItems);

        return {
          ...pantry,
          foods: sortedItems // ← fix here too
        };
      })
      .filter(pantry =>
        (pantry.name || '').toLowerCase().includes(searchLower) ||
        pantry.foods.length > 0
      );
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
}

