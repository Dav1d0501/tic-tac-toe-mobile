import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LANG_KEY = "app_lang";

// All UI text in both languages, looked up by key
const translations = {
  en: {
    welcome: "Welcome,",
    playLocal: "Play Local",
    playComputer: "Play vs Computer",
    playOnline: "Play Online",
    profile: "Profile",
    logout: "Logout",
    back: "Back",
    menu: "Menu",
    cancel: "Cancel",
    save: "Save",
    confirm: "Confirm",

    welcomeBack: "Welcome back!",
    createAccount: "Create Account",
    enterDetails: "Please enter your details",
    joinArena: "Join the arena today",
    username: "Username",
    email: "Email",
    password: "Password",
    playerName: "Player Name",
    login: "Log in",
    register: "Register",
    noAccount: "Don't have an account? ",
    haveAccount: "Already have an account? ",
    signUp: "Sign Up",
    loginLink: "Login",
    passwordHint: "Needs: 8+ chars, 1 Uppercase, 1 Number, 1 Special character",

    arena: "Arena",
    createRoom: "Create Room",
    roomName: "Room Name...",
    createPlay: "Create & Play",
    availableRooms: "Available Rooms",
    noRooms: "No active rooms. Be the first!",
    noMatch: "No rooms match your search",
    searchRooms: "Search rooms...",
    full: "FULL",
    join: "JOIN",
    friends: "Friends",
    noFriends: "You have no friends yet. Play a game to add some!",
    champion: "Champion:",
    wins: "Wins",

    backToLobby: "Back to Lobby",
    backToMenu: "Back to Menu",
    manVsMachine: "Man vs Machine",
    room: "Room",
    localGame: "Local Game (1 Phone)",
    boardSize: "Board Size:",
    difficulty: "Difficulty:",
    easy: "Easy",
    hard: "Hard",
    firstTurn: "First Turn:",
    meX: "Me (X)",
    pcX: "PC (X)",

    you: "You",
    vs: "VS",
    classic: "Classic Tic Tac Toe",
    turn: "Turn:",
    newGame: "New Game",
    youWon: "You Won!",
    youLost: "You Lost",
    draw: "It's a Draw!",
    winner: "Winner",
    opponentFled: "Opponent Left",
    areFriends: "You are friends",
    add: "Add",
    startConversation: "Start the conversation!",
    typeMessage: "Type a message...",
    send: "Send",

    myProfile: "My Profile",
    changePhoto: "Change Photo",
    losses: "Losses",
    winRate: "Win Rate",
    switchLight: "Switch to Light Mode",
    switchDark: "Switch to Dark Mode",
    editProfile: "Edit Profile",
    deleteAccount: "Delete Account",
    dangerZone: "Danger Zone",
    deleteConfirmText: "Are you sure you want to delete your account?",
    typeDelete: "Type DELETE",
  },
  he: {
    welcome: "ברוך הבא,",
    playLocal: "משחק מקומי",
    playComputer: "נגד המחשב",
    playOnline: "משחק מקוון",
    profile: "פרופיל",
    logout: "התנתקות",
    back: "חזרה",
    menu: "תפריט",
    cancel: "ביטול",
    save: "שמירה",
    confirm: "אישור",

    welcomeBack: "ברוך שובך!",
    createAccount: "יצירת חשבון",
    enterDetails: "אנא הזן את פרטיך",
    joinArena: "הצטרף לזירה היום",
    username: "שם משתמש",
    email: "אימייל",
    password: "סיסמה",
    playerName: "שם שחקן",
    login: "התחברות",
    register: "הרשמה",
    noAccount: "אין לך חשבון? ",
    haveAccount: "כבר יש לך חשבון? ",
    signUp: "הרשמה",
    loginLink: "התחברות",
    passwordHint: "נדרש: 8+ תווים, אות גדולה, מספר ותו מיוחד",

    arena: "זירה",
    createRoom: "יצירת חדר",
    roomName: "שם החדר...",
    createPlay: "צור ושחק",
    availableRooms: "חדרים זמינים",
    noRooms: "אין חדרים פעילים. היה הראשון!",
    noMatch: "אין חדרים שתואמים לחיפוש",
    searchRooms: "חיפוש חדרים...",
    full: "מלא",
    join: "הצטרף",
    friends: "חברים",
    noFriends: "אין לך חברים עדיין. שחק משחק כדי להוסיף!",
    champion: "אלוף:",
    wins: "ניצחונות",

    backToLobby: "חזרה ללובי",
    backToMenu: "חזרה לתפריט",
    manVsMachine: "אדם נגד מכונה",
    room: "חדר",
    localGame: "משחק מקומי (טלפון אחד)",
    boardSize: "גודל לוח:",
    difficulty: "רמת קושי:",
    easy: "קל",
    hard: "קשה",
    firstTurn: "תור ראשון:",
    meX: "אני (X)",
    pcX: "מחשב (X)",

    you: "אתה",
    vs: "נגד",
    classic: "איקס עיגול קלאסי",
    turn: "תור:",
    newGame: "משחק חדש",
    youWon: "ניצחת!",
    youLost: "הפסדת",
    draw: "תיקו!",
    winner: "מנצח",
    opponentFled: "היריב עזב",
    areFriends: "אתם חברים",
    add: "הוסף",
    startConversation: "התחילו לשוחח!",
    typeMessage: "הקלד הודעה...",
    send: "שלח",

    myProfile: "הפרופיל שלי",
    changePhoto: "שנה תמונה",
    losses: "הפסדים",
    winRate: "אחוז ניצחון",
    switchLight: "מצב יום",
    switchDark: "מצב לילה",
    editProfile: "עריכת פרופיל",
    deleteAccount: "מחיקת חשבון",
    dangerZone: "אזור מסוכן",
    deleteConfirmText: "האם אתה בטוח שברצונך למחוק את החשבון?",
    typeDelete: "הקלד DELETE",
  },
};

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState("en");

  // Load the saved language once when the app starts
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(LANG_KEY);
      if (saved === "en" || saved === "he") setLang(saved);
    })();
  }, []);

  // Switch between English and Hebrew and remember the choice
  const toggleLanguage = async () => {
    const next = lang === "en" ? "he" : "en";
    setLang(next);
    await AsyncStorage.setItem(LANG_KEY, next);
  };

  // Returns the text for a key in the current language
  const t = (key) => translations[lang][key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext;
