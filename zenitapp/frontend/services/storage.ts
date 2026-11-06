import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * expo-secure-store no funciona en web; para esa plataforma caemos a
 * localStorage. En dispositivos reales (lo que realmente importa acá)
 * los tokens quedan en el keychain/keystore del sistema.
 */
async function setItem(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStorage = {
  getAccessToken: () => getItem("zenit_access_token"),
  getRefreshToken: () => getItem("zenit_refresh_token"),
  async setTokens(accessToken: string, refreshToken: string) {
    await setItem("zenit_access_token", accessToken);
    await setItem("zenit_refresh_token", refreshToken);
  },
  async clear() {
    await deleteItem("zenit_access_token");
    await deleteItem("zenit_refresh_token");
  },
};
