// import { createClient } from "@supabase/supabase-js";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import * as SecureStore from 'expo-secure-store';
// import * as aesjs from 'aes-js';
// import 'react-native-get-random-values';

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteItemAsync, getItemAsync } from 'expo-secure-store';
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';

const SupabaseAuthStorage = {
  getItem: async (key: string) => {
    const value = await AsyncStorage.getItem(key);
    if (value) return value;
    if (Platform.OS === 'web') return null;

    const legacyValue = await getItemAsync(key);
    if (legacyValue) {
      await AsyncStorage.setItem(key, legacyValue);
      await deleteItemAsync(key);
    }
    return legacyValue;
  },
  setItem: (key: string, value: string) => {
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    return AsyncStorage.removeItem(key);
  },
};

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://cmtfxsntlfoxgcznanpe.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
  console.warn('Missing Supabase URL env; using built-in project URL.');
}

if (
  !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.VITE_SUPABASE_ANON_KEY
) {
  console.warn('Missing Supabase anon key env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SupabaseAuthStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// As Expo's SecureStore does not support values larger than 2048
// bytes, an AES-256 key is generated and stored in SecureStore, while
// it is used to encrypt/decrypt values stored in AsyncStorage.
// class LargeSecureStore {
//   private async _encrypt(key: string, value: string) {
//     const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));

//     const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
//     const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

//     await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));

//     return aesjs.utils.hex.fromBytes(encryptedBytes);
//   }

//   private async _decrypt(key: string, value: string) {
//     const encryptionKeyHex = await SecureStore.getItemAsync(key);
//     if (!encryptionKeyHex) {
//       return encryptionKeyHex;
//     }

//     const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(encryptionKeyHex), new aesjs.Counter(1));
//     const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));

//     return aesjs.utils.utf8.fromBytes(decryptedBytes);
//   }

//   async getItem(key: string) {
//     const encrypted = await AsyncStorage.getItem(key);
//     if (!encrypted) { return encrypted; }

//     return await this._decrypt(key, encrypted);
//   }

//   async removeItem(key: string) {
//     await AsyncStorage.removeItem(key);
//     await SecureStore.deleteItemAsync(key);
//   }

//   async setItem(key: string, value: string) {
//     const encrypted = await this._encrypt(key, value);

//     await AsyncStorage.setItem(key, encrypted);
//   }
// }

// import {
//   SUPABASE_URL as supabaseUrl,
//   SUPABASE_PUBLISHABLE_KEY as supabasePublishableKey,
// } from "react-native-dotenv";

// export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
//   auth: {
//     storage: new LargeSecureStore(), // Disable this to work on web
//     autoRefreshToken: true,
//     persistSession: true,
//     detectSessionInUrl: false,
//   },
// });

// For debugging
// import { createClient } from "@supabase/supabase-js";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import * as SecureStore from 'expo-secure-store';
// import * as aesjs from 'aes-js';
// import 'react-native-get-random-values';

// // As Expo's SecureStore does not support values larger than 2048
// // bytes, an AES-256 key is generated and stored in SecureStore, while
// // it is used to encrypt/decrypt values stored in AsyncStorage.
// class LargeSecureStore {
//   private async _encrypt(key: string, value: string) {
//     const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));

//     const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
//     const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

//     if (Platform.OS === 'web') {
//       // On web, SecureStore is not available, so we use AsyncStorage for both
//       // the encryption key and the encrypted value.
//       await AsyncStorage.setItem(key + '_enc_key', aesjs.utils.hex.fromBytes(encryptionKey));
//       return aesjs.utils.hex.fromBytes(encryptedBytes);
//     } else {
//       // On native, use SecureStore for the encryption key.
//       await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
//       return aesjs.utils.hex.fromBytes(encryptedBytes);
//     }
//   }

//   private async _decrypt(key: string, value: string) {
//     let encryptionKeyHex;
//     if (Platform.OS === 'web') {
//       // On web, retrieve the encryption key from AsyncStorage.
//       encryptionKeyHex = await AsyncStorage.getItem(key + '_enc_key');
//       if (!encryptionKeyHex) {
//         return encryptionKeyHex;
//       }
//     } else {
//       // On native, retrieve the encryption key from SecureStore.
//       encryptionKeyHex = await SecureStore.getItemAsync(key);
//       if (!encryptionKeyHex) {
//         return encryptionKeyHex;
//       }
//     }

//     const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(encryptionKeyHex), new aesjs.Counter(1));
//     const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));

//     return aesjs.utils.utf8.fromBytes(decryptedBytes);
//   }

//   async getItem(key: string) {
//     const encrypted = await AsyncStorage.getItem(key);
//     if (!encrypted) { return encrypted; }

//     return await this._decrypt(key, encrypted);
//   }

//   async removeItem(key: string) {

//     if (Platform.OS === 'web') {
//       // On web, remove both the encrypted value and the encryption key from AsyncStorage.
//       await AsyncStorage.removeItem(key);
//       await AsyncStorage.removeItem(key + '_enc_key');
//     } else {
//       await AsyncStorage.removeItem(key);
//       await SecureStore.deleteItemAsync(key);
//     }
//   }

//   async setItem(key: string, value: string) {
//     const encrypted = await this._encrypt(key, value);

//     await AsyncStorage.setItem(key, encrypted);
//   }
// }

// import {
//   SUPABASE_URL as supabaseUrl,
//   SUPABASE_PUBLISHABLE_KEY as supabasePublishableKey,
// } from "react-native-dotenv";
// import { Platform } from "react-native";

// export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
//   auth: {
//     storage: new LargeSecureStore(),
//     autoRefreshToken: true,
//     persistSession: true,
//     detectSessionInUrl: false,
//   },
// });
