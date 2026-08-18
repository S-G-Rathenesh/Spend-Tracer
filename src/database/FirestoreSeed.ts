import firestore from '@react-native-firebase/firestore';
import { Seed } from './Seed';

export class FirestoreSeed {
  /**
   * Run this once to seed the global Categories collection in Firestore.
   * Note: You will need to temporarily allow writes to the 'categories' collection in your firestore.rules
   * or run this using a Firebase Admin SDK. 
   * 
   * If running from the app, make sure your rules allow it:
   * match /categories/{categoryId} { allow read, write: if request.auth != null; }
   */
  static async seedCategories() {
    try {
      const batch = firestore().batch();
      const categoriesRef = firestore().collection('categories');

      for (const category of Seed.categories) {
        const docRef = categoriesRef.doc(category.id);
        batch.set(docRef, {
          name: category.name,
          icon: category.icon,
          color: category.color,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      await batch.commit();
      console.log('Successfully seeded Categories to Firestore!');
    } catch (error) {
      console.error('Error seeding Categories to Firestore:', error);
    }
  }
}
