import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-open-food-detail-modal',
  templateUrl: './open-food-detail-modal.component.html',
  styleUrls: ['./open-food-detail-modal.component.scss'],
  standalone: false,
})
export class OpenFoodDetailModalComponent {
  @Input() food: any;

  isReserved = false;

  constructor(private modalController: ModalController) {}

ngOnInit() {
  this.isReserved = !!this.food?.isReserved;
}

dismiss() {
  this.modalController.dismiss({
    someBoolean: this.isReserved,
    foodId: this.food?.barcode,
  }, 'confirm');
}

// ionViewWillLeave() {

// }

  reserveFood()
  {
  this.isReserved = !this.isReserved;
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