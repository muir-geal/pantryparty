import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { environment } from 'src/environments/environment';
import { AddFoodModalComponent } from './add-food-modal/add-food-modal.component';
import { FormsModule } from '@angular/forms';
import { OpenFoodDetailModalComponent } from './open-food-detail-modal/open-food-detail-modal.component';
import { PantrySettingsModalComponent } from './pantry-settings-modal/pantry-settings-modal.component';

@NgModule({
  declarations: [AppComponent, AddFoodModalComponent, OpenFoodDetailModalComponent, PantrySettingsModalComponent],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule, FormsModule],
  providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  provideFirebaseApp(() => initializeApp(environment.firebase)),
  provideFirestore(() => getFirestore()),
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }