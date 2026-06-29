import AsyncStorage from "@react-native-async-storage/async-storage";

// Stores the logged in user on the device

const USER_KEY = "user";

// Saves the user to local storage
export const saveUser = async (user) => {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error("Error saving user", e);
  }
};

// Reads the saved user from local storage
export const getUser = async () => {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Error reading user", e);
    return null;
  }
};

// Clears the saved user from local storage
export const removeUser = async () => {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error("Error removing user", e);
  }
};
