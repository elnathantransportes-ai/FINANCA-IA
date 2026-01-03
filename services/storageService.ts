import { db } from '../firebase';
import { ref, set, get, child, push, remove, onValue, Unsubscribe } from "firebase/database";
import { Transaction, Goal } from '../types';

const SESSION_KEY = 'finanvoice_current_session';
const USER_ID_KEY = 'finanvoice_current_uid';

// Helper to create a consistent ID from credentials
const generateUserId = (name: string, pin: string) => {
  // CRITICAL FIX: Firebase keys cannot contain '/', '.', '#', '$', '[', or ']'
  // btoa generates '/' and '+'. We MUST replace them.
  const rawId = btoa(unescape(encodeURIComponent(`${name.trim().toLowerCase()}:${pin.trim()}`)));
  return rawId.replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '');
};

export const storageService = {
  // Check if user exists and login
  login: async (name: string, pin: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const uid = generateUserId(name, pin);
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${uid}/profile`));

      if (snapshot.exists()) {
        localStorage.setItem(SESSION_KEY, name);
        localStorage.setItem(USER_ID_KEY, uid);
        return { success: true };
      } else {
        return { success: false, message: 'Nome ou PIN incorretos.' };
      }
    } catch (error) {
      console.error(error);
      return { success: false, message: 'Erro de conexão com o servidor.' };
    }
  },

  // Register new user
  register: async (name: string, pin: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const uid = generateUserId(name, pin);
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${uid}/profile`));

      if (snapshot.exists()) {
        return { success: false, message: 'Este usuário já existe. Tente fazer login.' };
      }

      // Create user profile
      await set(ref(db, `users/${uid}/profile`), {
        name: name,
        createdAt: new Date().toISOString()
      });

      localStorage.setItem(SESSION_KEY, name);
      localStorage.setItem(USER_ID_KEY, uid);
      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, message: 'Erro ao criar conta.' };
    }
  },

  // Session Management
  getSession: (): string | null => {
    return localStorage.getItem(SESSION_KEY);
  },

  getUid: (): string | null => {
    return localStorage.getItem(USER_ID_KEY);
  },

  clearSession: () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_ID_KEY);
  },

  // Real-time Listener for Transactions
  subscribeTransactions: (callback: (data: Transaction[]) => void): Unsubscribe => {
    const uid = storageService.getUid();
    if (!uid) return () => {};

    const dbRef = ref(db, `users/${uid}/transactions`);
    
    const handler = (snapshot: any) => {
       if (snapshot.exists()) {
         const data = snapshot.val();
         // Convert object {key: val} to array [{id: key, ...val}]
         const list = Object.keys(data).map(key => ({
           ...data[key],
           id: key
         }));
         callback(list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
       } else {
         callback([]);
       }
    };

    return onValue(dbRef, handler);
  },

  // Real-time Listener for Goal
  subscribeGoal: (callback: (data: Goal | null) => void): Unsubscribe => {
    const uid = storageService.getUid();
    if (!uid) return () => {};
    
    const dbRef = ref(db, `users/${uid}/goal`);
    return onValue(dbRef, (snapshot) => {
        callback(snapshot.exists() ? snapshot.val() : null);
    });
  },

  // Save Transaction (Push generates a new ID automatically)
  saveTransaction: async (transaction: Transaction): Promise<void> => {
    const uid = storageService.getUid();
    if (!uid) return;

    const txRef = push(ref(db, `users/${uid}/transactions`));
    const newTx = {
      ...transaction,
      id: txRef.key // Ensure the ID matches the database key
    };

    await set(txRef, newTx);
  },

  // Delete Transaction
  deleteTransaction: async (id: string): Promise<void> => {
    const uid = storageService.getUid();
    if (!uid) return;
    await remove(ref(db, `users/${uid}/transactions/${id}`));
  },

  saveGoal: async (goal: Goal): Promise<void> => {
      const uid = storageService.getUid();
      if (!uid) return;
      await set(ref(db, `users/${uid}/goal`), goal);
  }
};