import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'bistro_jwt_token';
const LANG_KEY = 'bistro_app_lang';
const THEME_KEY = 'bistro_app_theme';

// Sensitive auth JWT is stored in hardware-backed SecureStore (Keychain on iOS, Keystore on Android)
export async function saveToken(token) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// Non-sensitive UI preferences (like language) use ordinary AsyncStorage
export async function saveLang(lang) {
  await AsyncStorage.setItem(LANG_KEY, lang);
}

export async function getLang() {
  const val = await AsyncStorage.getItem(LANG_KEY);
  return val === 'id' ? 'id' : 'en';
}

export async function saveTheme(theme) {
  await AsyncStorage.setItem(THEME_KEY, theme);
}

export async function getTheme() {
  const val = await AsyncStorage.getItem(THEME_KEY);
  return val === 'dark' ? 'dark' : 'light';
}
