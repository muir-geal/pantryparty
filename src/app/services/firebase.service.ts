import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  arrayUnion,
  collection,
  collectionData,
  deleteDoc,
  doc,
  documentId,
  FieldValue,
  Firestore,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { EatenFood } from '../models/eaten-food';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  database: string = 'pantries_bplutka';

  firestore = inject(Firestore);
  itemCollection = collection(this.firestore, this.database);
  q = query(this.itemCollection, orderBy('name', 'asc'));
  pantries$ = collectionData<any>(this.q, { idField: 'id' });

  pantryId: any = null;
  pantry: any = null;

  constructor() {
    // if (localStorage.getItem('pantry')) {
    //   this.pantryId = localStorage.getItem('pantry');
    //   this.loadPantry();
    // }
    const storedPantryId = localStorage.getItem('pantryId');
    if (storedPantryId) {
      this.pantryId = storedPantryId;
      this.loadPantry();
    }
  }

  getPantries() {
    return this.pantries$;
  }

  // !!!!!!!!!!!!!!!! PLUTKA GET PAnTRY ORIGINAL CODE !!!!!!!!!!!!!!!!!!!!!!
  // getPantry()
  // {
  //   if (this.pantry)
  //   {
  //     return this.pantry.data();
  //   }
  //   return null;
  // }
  // !!!!!!!!!!!!!!!!!! PLUTKA GET PAnTRY ORIGINAL CODE !!!!!!!!!!!!!!!!!!!!!!

  getPantry() {
    if (this.pantry) {
      return {
        id: this.pantry.id,
        ...this.pantry.data(),
      };
    }
    return null;
  }

  async addPantry(name: string, nick: string) {
    const q = query(this.itemCollection, where('nick', '==', nick));
    const c = await getCountFromServer(q);
    if (c.data().count <= 0) {
      let doc = await addDoc(this.itemCollection, {
        name: name,
        nick: nick,
        foods: [],
      });
      this.pantryId = doc.id;
      localStorage.setItem('pantryId', this.pantryId);
      this.loadPantry();
      return true;
    } else {
      alert('this nickname is already taken');
    }
    return false;
  }

  deletePantry() {
    if (this.pantry) {
      deleteDoc(doc(this.itemCollection, this.pantry.id));
      this.pantryId = null;
      this.pantry = null;
      this.updateLocalstorage();
    }
  }

  //unter Tab4 in OnInit():
  async deleteMyTestPantries(nick: string) {
    const q = query(this.itemCollection, where('nick', '==', nick));
    const snapshot = await getDocs(q);

    snapshot.forEach(async (docSnap) => {
      await deleteDoc(doc(this.itemCollection, docSnap.id));
      console.log(`Deleted pantry with ID: ${docSnap.id}`);
    });
  }

  async addFoodToPantry(name: string = '') {
    let date = new Date();
    /*
    type: sweet, drink, fruit, vegetable, meat, fish, dairy, snacks, bread, pasta, other
    unit: pcs, ml, g
    */

    let food = [
      {
        type: '',
        openfoodfactsid: '',
        name: name,
        expirationdate: '',
        amount: 3, // Anzahl
        available: 0, // Verfügbare Anzahl für andere
        unit: '',
        vegan: false,
        vegetarian: false,
        halal: false,
        kosher: false,
        opened: false, // Bereits geöffnet
        // Achtung: Array sieht anders aus und muss erst umformattiert werden: "allergens": "en:eggs,en:milk,en:nuts,en:peanuts,en:soybeans",
        allergens: [
          'eggs',
          'milk',
          'nuts',
          'peanuts',
          'soybeans', // Gluten wird auch erfasst !
        ],
        image:
          'https://images.openfoodfacts.net/images/products/590/095/131/1505/front_en.22.400.jpg', // image_url
        nutrition: {
          fat: 1,
          'saturated-fat': 2,
          salt: 3,
          sugar: 5,
        },
        nutriments: {
          // Direkt und komplett aus der Datenbank übernehmen!!!
          carbohydrates: 60,
          carbohydrates_100g: 60,
          carbohydrates_serving: 30,
          carbohydrates_unit: 'g',
          carbohydrates_value: 60,
          energy: 2050,
          'energy-kcal': 490,
          'energy-kcal_100g': 490,
          'energy-kcal_serving': 245,
          'energy-kcal_unit': 'kcal',
          'energy-kcal_value': 490,
          'energy-kcal_value_computed': 481.8,
          energy_100g: 2050,
          energy_serving: 1020,
          energy_unit: 'kcal',
          energy_value: 490,
          fat: 23,
          fat_100g: 23,
          fat_serving: 11.5,
          fat_unit: 'g',
          fat_value: 23,
          'fruits-vegetables-legumes-estimate-from-ingredients_100g': 0,
          'fruits-vegetables-legumes-estimate-from-ingredients_serving': 0,
          'fruits-vegetables-nuts-estimate-from-ingredients_100g': 23.3998372395833,
          'fruits-vegetables-nuts-estimate-from-ingredients_serving': 23.3998372395833,
          'nova-group': 4,
          'nova-group_100g': 4,
          'nova-group_serving': 4,
          'nutrition-score-fr': 29,
          'nutrition-score-fr_100g': 29,
          proteins: 8.7,
          proteins_100g: 8.7,
          proteins_serving: 4.35,
          proteins_unit: 'g',
          proteins_value: 8.7,
          salt: 0.5125,
          salt_100g: 0.5125,
          salt_serving: 0.256,
          salt_unit: 'g',
          salt_value: 0.5125,
          'saturated-fat': 7.6,
          'saturated-fat_100g': 7.6,
          'saturated-fat_serving': 3.8,
          'saturated-fat_unit': 'g',
          'saturated-fat_value': 7.6,
          sodium: 0.205,
          sodium_100g: 0.205,
          sodium_serving: 0.102,
          sodium_unit: 'g',
          sodium_value: 0.205,
          sugars: 51,
          sugars_100g: 51,
          sugars_serving: 25.5,
          sugars_unit: 'g',
          sugars_value: 51,
        },
        nutriments_estimated: {
          // Direkt und komplett aus der Datenbank übernehmen!!!
          alcohol_100g: 0,
          'beta-carotene_100g': 0.000018182296875,
          calcium_100g: 0.138080336197917,
          carbohydrates_100g: 48.1250444986979,
          cholesterol_100g: 0.0118826829427083,
          copper_100g: 0.000264851529296875,
          'energy-kcal_100g': 514.854478125,
          'energy-kj_100g': 2145.67711458333,
          energy_100g: 2145.67711458333,
          fat_100g: 30.8920875976562,
          fiber_100g: 3.5584171875,
          fructose_100g: 0.122569052734375,
          galactose_100g: 0.0268321875,
          glucose_100g: 1.16506964192708,
          iodine_100g: 0.000025657981770833,
          iron_100g: 0.00231698139322917,
          lactose_100g: 5.8569109765625,
          magnesium_100g: 0.0775468709635417,
          maltose_100g: 0.0605023860677083,
          manganese_100g: 0.000522436313802083,
          'pantothenic-acid_100g': 0.00109595176432292,
          phosphorus_100g: 0.21808725390625,
          phylloquinone_100g: 0.000003457614127604,
          polyols_100g: 0.921666666666667,
          potassium_100g: 0.447520827083333,
          proteins_100g: 9.4388619921875,
          salt_100g: 0.367516123697917,
          'saturated-fat_100g': 13.4074091276042,
          selenium_100g: 0.000013018509420572,
          sodium_100g: 0.145451198958333,
          starch_100g: 2.4762890625,
          sucrose_100g: 29.8261643652344,
          sugars_100g: 43.7868928580729,
          'vitamin-a_100g': 0.000021440048255208,
          'vitamin-b12_100g': 2.95717766927083e-7,
          'vitamin-b1_100g': 0.000139111572265625,
          'vitamin-b2_100g': 0.00014940764453125,
          'vitamin-b6_100g': 0.000129688240885417,
          'vitamin-b9_100g': 0.000030953725911458,
          'vitamin-c_100g': 0.000920490364583333,
          'vitamin-d_100g': 8.01393756510417e-7,
          'vitamin-e_100g': 0.00127954946354167,
          'vitamin-pp_100g': 0.00258839755533854,
          water_100g: 5.01070466927082,
          zinc_100g: 0.00130470161328125,
        },
        nutriscore_grade: 'e', // Direkt aus der Datenbank übernehmen!!!
        footprint_per_kg: 0.0001,
        footprint_grade: 'a',
        notes: 'Legga!', // Persönliche Notizen
        rating: 5, // Pers. Rating von 1-5
      },
    ];

    if (this.pantry) {
      await updateDoc(doc(this.itemCollection, this.pantry.id), {
        foods: arrayUnion(...food),
      });
      this.loadPantry();
    }
  }

  createFoodItem(): any {
    return {
      name: '',
      type: '',
      openfoodfactsid: '',
      expirationdate: '',
      amount: 1,
      available: 0,
      unit: '',
      vegan: false,
      vegetarian: false,
      halal: false,
      kosher: false,
      opened: false,
      allergens: [],
      image: '',
      nutrition: {
        fat: 0,
        'saturated-fat': 0,
        salt: 0,
        sugar: 0,
      },
      nutriments: {
        carbohydrates: 0,
        carbohydrates_100g: 0,
        carbohydrates_serving: 0,
        carbohydrates_unit: 'g',
        carbohydrates_value: 0,
        energy: 0,
        'energy-kcal': 0,
        'energy-kcal_100g': 0,
        'energy-kcal_serving': 0,
        'energy-kcal_unit': 'kcal',
        'energy-kcal_value': 0,
        'energy-kcal_value_computed': 0,
        energy_100g: 0,
        energy_serving: 0,
        energy_unit: 'kcal',
        energy_value: 0,
        fat: 0,
        fat_100g: 0,
        fat_serving: 0,
        fat_unit: 'g',
        fat_value: 0,
        proteins: 0,
        proteins_100g: 0,
        proteins_serving: 0,
        proteins_unit: 'g',
        proteins_value: 0,
        salt: 0,
        salt_100g: 0,
        salt_serving: 0,
        salt_unit: 'g',
        salt_value: 0,
        'saturated-fat': 0,
        'saturated-fat_100g': 0,
        'saturated-fat_serving': 0,
        'saturated-fat_unit': 'g',
        'saturated-fat_value': 0,
        sodium: 0,
        sodium_100g: 0,
        sodium_serving: 0,
        sodium_unit: 'g',
        sodium_value: 0,
        sugars: 0,
        sugars_100g: 0,
        sugars_serving: 0,
        sugars_unit: 'g',
        sugars_value: 0,
      },
      nutriments_estimated: {
        alcohol_100g: 0,
        calcium_100g: 0,
        fat_100g: 0,
        fiber_100g: 0,
        iron_100g: 0,
        magnesium_100g: 0,
        potassium_100g: 0,
        proteins_100g: 0,
        salt_100g: 0,
        'saturated-fat_100g': 0,
        sodium_100g: 0,
        sugars_100g: 0,
        'vitamin-c_100g': 0,
        water_100g: 0,
        zinc_100g: 0,
      },
      footprint_per_kg: 0,
      footprint_grade: '',
      notes: '',
      rating: 0,
    };
  }

  updateLocalstorage() {
    if (this.pantry) {
      localStorage.setItem('pantryId', this.pantryId);
    } else {
      localStorage.removeItem('pantryId');
    }
  }

  // async loadPantry() {
  //   this.pantry = await getDoc(doc(this.itemCollection, this.pantryId));
  //   this.updateLocalstorage();
  // }

  async loadPantry() {
    if (!this.pantryId || this.pantryId.trim() === '') {
      console.log('Pantry ID not set yet, user may not be authenticated');
      return;
    }

    this.pantry = await getDoc(doc(this.itemCollection, this.pantryId));
    this.updateLocalstorage();
  }

  async fetchProductData(barcode: string) {
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const data = await response.json();

      if (data.status === 1) {
        return data.product;
      } else {
        console.warn('Product not found in OpenFoodFacts');
        return null;
      }
    } catch (error) {
      console.error('Error fetching product data:', error);
      return null;
    }
  }

  async updatePantryWithFood(pantryId: string, food: any) {
    const pantryDocRef = doc(this.itemCollection, pantryId);
    await updateDoc(pantryDocRef, {
      foods: arrayUnion(food),
    });
  }

  async updatePantryDetails(name: string, nick: string) {
    if (!this.pantryId) {
      throw new Error('No pantry ID set');
    }
    try {
      const pantryDoc = doc(this.firestore, this.database, this.pantryId);
      await updateDoc(pantryDoc, {
        name: name,
        nick: nick,
      });

      if (this.pantry) {
        this.pantry.name = name;
        this.pantry.nick = nick;
      }
      return true;
    } catch (error) {
      console.error('Error updating pantry:', error);
      throw error;
    }
  }

  async updateFoodInPantry(oldFoodItem: any, newFoodItem: any) {
    if (!this.pantry) {
      throw new Error('No pantry loaded');
    }

    try {
      console.log('Updating food item from:', oldFoodItem);
      console.log('Updating food item to:', newFoodItem);

      // Get the current pantry document
      const pantryRef = doc(this.itemCollection, this.pantry.id);
      const pantryDoc = await getDoc(pantryRef);

      if (!pantryDoc.exists()) {
        throw new Error('Pantry document not found');
      }

      const pantryData = pantryDoc.data();
      const currentFoods = pantryData['foods'] || [];

      console.log('Current foods count:', currentFoods.length);

      // Find the index of the food item to update
      const foodIndex = currentFoods.findIndex((food: any) => {
        const barcodeMatch = food.barcode === oldFoodItem.barcode;
        const nameMatch = food.name === oldFoodItem.name;
        const amountMatch = food.amount === oldFoodItem.amount;
        const ratingMatch = food.rating === oldFoodItem.rating;

        // If barcode exists, use it as primary identifier
        if (food.barcode && oldFoodItem.barcode) {
          return barcodeMatch && nameMatch && amountMatch;
        }

        // Otherwise use name, amount, and rating combination
        return nameMatch && amountMatch && ratingMatch;
      });

      console.log('Found food at index:', foodIndex);

      if (foodIndex === -1) {
        throw new Error('Food item not found in pantry');
      }

      // Update the food at the found index
      const updatedFoods = [...currentFoods];
      updatedFoods[foodIndex] = newFoodItem;

      console.log('Updated foods count:', updatedFoods.length);

      // Update the document with the updated foods array
      await updateDoc(pantryRef, {
        foods: updatedFoods,
      });

      // Reload the pantry to get the updated data
      await this.loadPantry();

      console.log('Food item updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating food in pantry:', error);
      throw error;
    }
  }

  async deleteFoodFromPantry(foodItem: any) {
    if (!this.pantry) {
      throw new Error('No pantry loaded');
    }

    try {
      console.log('Attempting to delete food item:', foodItem);

      // Get the current pantry document
      const pantryRef = doc(this.itemCollection, this.pantry.id);
      const pantryDoc = await getDoc(pantryRef);

      if (!pantryDoc.exists()) {
        throw new Error('Pantry document not found');
      }

      const pantryData = pantryDoc.data();
      const currentFoods = pantryData['foods'] || [];

      console.log('Current foods count:', currentFoods.length);
      console.log('Current foods:', currentFoods);

      // Find the index of the food item to delete
      // We'll use multiple criteria to find the exact match
      const foodIndex = currentFoods.findIndex((food: any) => {
        const barcodeMatch = food.barcode === foodItem.barcode;
        const nameMatch = food.name === foodItem.name;
        const amountMatch = food.amount === foodItem.amount;
        const ratingMatch = food.rating === foodItem.rating;

        // If barcode exists, use it as primary identifier
        if (food.barcode && foodItem.barcode) {
          return barcodeMatch && nameMatch && amountMatch;
        }

        // Otherwise use name, amount, and rating combination
        return nameMatch && amountMatch && ratingMatch;
      });

      console.log('Found food at index:', foodIndex);

      if (foodIndex === -1) {
        throw new Error('Food item not found in pantry');
      }

      // Remove the food at the found index
      const updatedFoods = currentFoods.filter(
        (food: any, index: number) => index !== foodIndex
      );

      console.log('Updated foods count:', updatedFoods.length);

      // Update the document with the filtered foods array
      await updateDoc(pantryRef, {
        foods: updatedFoods,
      });

      // Reload the pantry to get the updated data
      await this.loadPantry();

      console.log('Food item deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting food from pantry:', error);
      throw error;
    }
  }

  async eatFood(food: any) {
    if (!this.pantry) return;

    const pantryRef = doc(this.firestore, this.database, this.pantry.id);

    const eatenFood = {
      ...food,
      timestamp: Date.now(),
    };

    await updateDoc(pantryRef, {
      eatenToday: arrayUnion(eatenFood),
    });

    await this.loadPantry();
  }

  async logEatenFood(food: EatenFood) {
    if (!this.pantryId) return;

    const pantryRef = doc(this.itemCollection, this.pantryId);
    const pantrySnap = await getDoc(pantryRef);

    if (!pantrySnap.exists()) {
      console.error('Pantry not found');
      return;
    }

    const pantryData = pantrySnap.data();
    const eatenFoods = Array.isArray(pantryData?.['eatenFoods'])
      ? [...pantryData['eatenFoods']]
      : [];

    eatenFoods.push(food);

    try {
      await updateDoc(pantryRef, {
        eatenFoods: eatenFoods,
      });

      await this.loadPantry();
    } catch (err) {
      console.error('Failed to log eaten food:', err);
    }
  }

  async checkIfNickExists(nick: string): Promise<boolean> {
    try {
      const q = query(this.itemCollection, where('nick', '==', nick));
      const c = await getCountFromServer(q);
      return c.data().count > 0;
    } catch (error) {
      console.error('error checking nickname:', error);
      return false;
    }
  }
}
