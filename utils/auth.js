import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'ama_jwt_token';
const USER_KEY = 'ama_user_data';

export async function saveAuth(token, user) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getToken() {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export async function getUser() {
  const data = await AsyncStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export async function clearAuth() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

export async function isLoggedIn() {
  const token = await getToken();
  return !!token;
}