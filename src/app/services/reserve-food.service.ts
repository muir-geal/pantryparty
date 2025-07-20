import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ReservefoodService {
  private readonly STORAGE_KEY = 'reservedItems';

  constructor() {}

  saveReservedItems(pantries: any[]) {
    const reservedItems: any[] = [];
    
    pantries.forEach(pantry => {
      pantry.foods?.forEach((food: any) => {
        if (food.isReserved) {
          reservedItems.push({
            barcode: food.barcode,
            isReserved: true
          });
        }
      });
    });
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reservedItems));
    console.log('Reserved items saved:', reservedItems);
  }

  loadReservedItems(): any[] {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      const items = saved ? JSON.parse(saved) : [];
      console.log('Reserved items loaded:', items);
      return items;
    } catch (error) {
      console.error('Error loading reserved items:', error);
      return [];
    }
  }

  clearReservedItems() {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('Reserved items cleared');
  }

  isItemReserved(barcode: string): boolean {
    const reservedItems = this.loadReservedItems();
    return reservedItems.some(item => item.barcode === barcode);
  }

  toggleReservation(barcode: string, isReserved: boolean) {
    const reservedItems = this.loadReservedItems();
    const existingIndex = reservedItems.findIndex(item => item.barcode === barcode);
    
    if (isReserved) {
      if (existingIndex === -1) {
        reservedItems.push({ barcode, isReserved: true });
      }
    } else {
      if (existingIndex > -1) {
        reservedItems.splice(existingIndex, 1);
      }
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reservedItems));
  }
}