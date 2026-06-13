import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';

export interface UserProfile {
  userId: string;
  baselineAnnualKg: number;
  createdAt: string;
}

export interface CarbonEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  rawText: string;
  category: 'transport' | 'food' | 'energy' | 'shopping';
  subtype: string;
  quantity: number;
  unit: string;
  co2eKg: number;
  estimated: boolean;
  createdAt: string;
}

export interface IDataStore {
  saveProfile(userId: string, baselineAnnualKg: number): Promise<UserProfile>;
  getProfile(userId: string): Promise<UserProfile | null>;
  saveEntry(userId: string, entry: Omit<CarbonEntry, 'id' | 'userId' | 'createdAt'>): Promise<CarbonEntry>;
  getEntries(userId: string): Promise<CarbonEntry[]>;
  deleteEntry(userId: string, entryId: string): Promise<boolean>;
}

// In-Memory implementation
class InMemoryDataStore implements IDataStore {
  private profiles = new Map<string, UserProfile>();
  private entries = new Map<string, CarbonEntry[]>();

  async saveProfile(userId: string, baselineAnnualKg: number): Promise<UserProfile> {
    const profile: UserProfile = {
      userId,
      baselineAnnualKg,
      createdAt: new Date().toISOString()
    };
    this.profiles.set(userId, profile);
    return profile;
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    return this.profiles.get(userId) || null;
  }

  async saveEntry(userId: string, entryData: Omit<CarbonEntry, 'id' | 'userId' | 'createdAt'>): Promise<CarbonEntry> {
    const entryId = Math.random().toString(36).substring(2, 11);
    const entry: CarbonEntry = {
      ...entryData,
      id: entryId,
      userId,
      createdAt: new Date().toISOString()
    };
    const userEntries = this.entries.get(userId) || [];
    userEntries.push(entry);
    this.entries.set(userId, userEntries);
    return entry;
  }

  async getEntries(userId: string): Promise<CarbonEntry[]> {
    return this.entries.get(userId) || [];
  }

  async deleteEntry(userId: string, entryId: string): Promise<boolean> {
    const userEntries = this.entries.get(userId) || [];
    const index = userEntries.findIndex(e => e.id === entryId);
    if (index === -1) return false;
    userEntries.splice(index, 1);
    this.entries.set(userId, userEntries);
    return true;
  }
}

// Firestore implementation
class FirestoreDataStore implements IDataStore {
  private db: Firestore;

  constructor() {
    // Avoid double initialization
    if (getApps().length === 0) {
      initializeApp({
        projectId: process.env.GCP_PROJECT_ID || 'promptwars-499219'
      });
    }
    this.db = getFirestore();
    this.db.settings({ ignoreUndefinedProperties: true });
  }

  async saveProfile(userId: string, baselineAnnualKg: number): Promise<UserProfile> {
    const profile: UserProfile = {
      userId,
      baselineAnnualKg,
      createdAt: new Date().toISOString()
    };
    await this.db.collection('users').doc(userId).set({ profile });
    return profile;
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    const doc = await this.db.collection('users').doc(userId).get();
    if (!doc.exists) return null;
    const data = doc.data();
    return data?.profile || null;
  }

  async saveEntry(userId: string, entryData: Omit<CarbonEntry, 'id' | 'userId' | 'createdAt'>): Promise<CarbonEntry> {
    const docRef = this.db.collection('users').doc(userId).collection('entries').doc();
    const entry: CarbonEntry = {
      ...entryData,
      id: docRef.id,
      userId,
      createdAt: new Date().toISOString()
    };
    await docRef.set(entry);
    return entry;
  }

  async getEntries(userId: string): Promise<CarbonEntry[]> {
    const snapshot = await this.db.collection('users').doc(userId).collection('entries').orderBy('date', 'desc').get();
    const list: CarbonEntry[] = [];
    snapshot.forEach((doc: QueryDocumentSnapshot) => {
      list.push(doc.data() as CarbonEntry);
    });
    return list;
  }

  async deleteEntry(userId: string, entryId: string): Promise<boolean> {
    const docRef = this.db.collection('users').doc(userId).collection('entries').doc(entryId);
    const doc = await docRef.get();
    if (!doc.exists) return false;
    await docRef.delete();
    return true;
  }
}

// Choose datastore implementation
let datastore: IDataStore;

if (process.env.NODE_ENV === 'test') {
  console.log('Datastore: Using local IN-MEMORY database (Test mode)');
  datastore = new InMemoryDataStore();
} else {
  try {
    console.log('Datastore: Attempting Firestore native initialization...');
    datastore = new FirestoreDataStore();
  } catch (err) {
    console.warn('Datastore: Firestore failed to initialize, falling back to IN-MEMORY datastore.', err);
    datastore = new InMemoryDataStore();
  }
}

export { datastore };
