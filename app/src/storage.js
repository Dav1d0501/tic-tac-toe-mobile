import AsyncStorage from "@react-native-async-storage/async-storage";

// Saves and loads the logged in user on the device

const USER_KEY = "user";

export const saveUser = async (user) => {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error("Error saving user", e);
  }
};

export const getUser = async () => {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Error reading user", e);
    return null;
  }
};

export const removeUser = async () => {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error("Error removing user", e);
  }
};
