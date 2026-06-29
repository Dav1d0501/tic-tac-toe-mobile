import { createContext, useContext, useEffect, useState } from "react";
import { getUser, saveUser, removeUser } from "../storage";
import socket from "../socket";

// Holds the logged in user and shares it across screens
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Loads the saved user on startup
  useEffect(() => {
    (async () => {
      const stored = await getUser();
      if (stored) setUser(stored);
      setLoading(false);
    })();
  }, []);

  // Announces the user online whenever the socket connects
  useEffect(() => {
    const announce = () => {
      if (user && user._id) socket.emit("user_connected", user._id);
    };
    socket.on("connect", announce);
    announce();
    return () => socket.off("connect", announce);
  }, [user]);

  // Saves the user after login or register
  const login = async (userData) => {
    await saveUser(userData);
    setUser(userData);
    if (userData && userData._id) socket.emit("user_connected", userData._id);
  };

  // Updates some user fields without re-login
  const updateUser = async (patch) => {
    const next = { ...(user || {}), ...patch };
    await saveUser(next);
    setUser(next);
  };

  const logout = async () => {
    await removeUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
