import { OnInit } from '@angular/core';
import { Component, inject, Input } from '@angular/core';
import { ModalController, AlertController } from '@ionic/angular';
import { FirebaseService } from '../../services/firebase.service';
import { NutritionService } from 'src/app/services/nutrition.service';

@Component({
  selector: 'app-pantry-settings-modal',
  templateUrl: './pantry-settings-modal.component.html',
  styleUrls: ['./pantry-settings-modal.component.scss'],
  standalone: false,
})
export class PantrySettingsModalComponent implements OnInit {
  firebaseService = inject(FirebaseService);

  @Input() currentName: string = '';
  @Input() currentNick: string = '';
  editName: string = '';
  editNick: string = '';
  isEditing: boolean = false;
  pantryCreated = true;
  pantryItems: any[] = [];

  newDailyLimit: number = 0;

  constructor(
    private modalController: ModalController,
    private alertController: AlertController,
    private nutritionService: NutritionService
  ) {}

  ngOnInit() {
    this.editName = this.currentName;
    this.editNick = this.currentNick;
    this.newDailyLimit = this.nutritionService.getDailyLimit();
  }

  dismiss() {
    this.modalController.dismiss();
  }

  setDailyLimit() {
    this.nutritionService.setDailyLimit(this.newDailyLimit);
  }

  getCurrentLimit(): number {
    return this.nutritionService.getDailyLimit();
  }

  enableEditing() {
    this.isEditing = true;
  }

  cancelEditing() {
    this.editName = this.currentName;
    this.editNick = this.currentNick;
    this.isEditing = false;
  }

  async saveChanges() {
    if (!this.editName.trim() || !this.editNick.trim()) {
      this.showAlert('error', 'Name and nickname cannot be empty.');
      return;
    }
    if (this.editNick !== this.currentNick) {
      const nickTaken = await this.checkNicknameAvailability(this.editNick);
      if (nickTaken) {
        this.showAlert('error', 'This nickname is already taken.');
        return;
      }
    }
    try {
      await this.firebaseService.updatePantryDetails(
        this.editName,
        this.editNick
      );
      this.modalController.dismiss({
        updated: true,
        name: this.editName,
        nick: this.editNick,
      });
      this.showAlert('success', 'Pantry updated successfully!');
    } catch (error) {
      console.error('Error updating pantry:', error);
      this.showAlert('error', 'Failed to update pantry. Please try again.');
    }
  }

  async checkNicknameAvailability(nick: string): Promise<boolean> {
    return await this.firebaseService.checkIfNickExists(nick);
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  async deletePantry() {
    const alert = await this.alertController.create({
      header: 'delete pantry',
      message:
        'Are you sure you want to delete this pantry? This action cannot be undone.',
      buttons: [
        {
          text: 'cancel',
          role: 'cancel',
        },
        {
          text: 'delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.firebaseService.deletePantry();
              localStorage.removeItem('pantry');

              this.modalController.dismiss({
                deleted: true,
              });
            } catch (error) {
              console.error('error deleting pantry:', error);
              this.showAlert(
                'error',
                'Failed to delete pantry. Please try again.'
              );
            }
          },
        },
      ],
    });
    await alert.present();
  }

  // async deleteMyPantry() {
  //     await this.modalController.dismiss({
  //       action: 'delete'
  //     });
  //   }
}
