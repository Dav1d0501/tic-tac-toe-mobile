// Address of the backend server. Use your PC LAN IP, not localhost, so a phone can reach it
export const SERVER_URL =
  process.env.EXPO_PUBLIC_SERVER_URL || "http://192.168.1.203:3001";
