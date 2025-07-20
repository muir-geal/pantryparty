import { OnInit } from '@angular/core';
import { Component, inject, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-pantry-settings-modal',
  templateUrl: './pantry-settings-modal.component.html',
  styleUrls: ['./pantry-settings-modal.component.scss'],
  standalone: false,
})
export class PantrySettingsModalComponent  implements OnInit {

  firebaseService = inject(FirebaseService);
  name:string = '';
  nick:string = '';
  pantryCreated = true;
  pantryItems: any[] = [];

  constructor(private modalController: ModalController) {}

  ngOnInit() {}

    dismiss() {
    this.modalController.dismiss();
  }

async saveChanges() {
  await this.modalController.dismiss({
    action: 'edit',
    updatedName: this.name,
    updatedNick: this.nick
  });
}

async deleteMyPantry() {
    await this.modalController.dismiss({
      action: 'delete'
    });
  }
}
