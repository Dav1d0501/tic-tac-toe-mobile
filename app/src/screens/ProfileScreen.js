import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";

import { SERVER_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useAuth();
  const { colors, mode, toggleTheme } = useTheme();
  const { t, lang, toggleLanguage } = useLanguage();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [profile, setProfile] = useState(user);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Loads the latest profile from the server so stats are up to date
  const fetchProfile = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/users/profile/${user._id}`);
      const data = await res.json();
      if (res.ok) setProfile(data);
    } catch (err) {
      console.error("Error fetching profile", err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Sends a field change to the server and updates the saved user
  const saveProfileField = async (patch) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/users/update-profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Error", data.message || "Failed to update profile");
        return false;
      }
      await updateUser(patch);
      setProfile((p) => ({ ...p, ...patch }));
      return true;
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Connection error while updating profile");
      return false;
    }
  };

  // Opens the camera, then saves the photo as the avatar
  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert("Permission needed", "Camera access is required to take a photo.");
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled) {
      const dataUrl = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const ok = await saveProfileField({ avatar: dataUrl });
      if (ok) Alert.alert("Success", "Profile photo updated!");
    }
  };

  // Opens the photo gallery, then saves the chosen image as the avatar
  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert("Permission needed", "Gallery access is required to pick a photo.");
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled) {
      const dataUrl = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const ok = await saveProfileField({ avatar: dataUrl });
      if (ok) Alert.alert("Success", "Profile photo updated!");
    }
  };

  // Lets the user choose where the photo comes from
  const changePhoto = () => {
    Alert.alert("Change Photo", "Choose a source", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Gallery", onPress: pickFromGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const openEditModal = () => {
    setEditUsername(profile?.username || "");
    setEditEmail(profile?.email || "");
    setShowEditModal(true);
  };

  // Saves the edited username and email
  const handleSaveProfile = async () => {
    if (!editUsername.trim()) return Alert.alert("Invalid", "Username cannot be empty");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail)) {
      return Alert.alert("Invalid email", "Please enter a valid email address");
    }
    const ok = await saveProfileField({
      username: editUsername.trim(),
      email: editEmail.trim(),
    });
    if (ok) {
      setShowEditModal(false);
      Alert.alert("Success", "Profile updated!");
    }
  };

  // Permanently deletes the account after the user types DELETE
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") return;
    try {
      const res = await fetch(`${SERVER_URL}/api/users/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id }),
      });
      if (res.ok) {
        setShowDeleteModal(false);
        await logout();
      } else {
        Alert.alert("Error", "Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      Alert.alert("Error", "Connection error");
    }
  };

  const wins = profile?.wins ?? 0;
  const losses = profile?.losses ?? 0;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const initial = (profile?.username || "?").charAt(0).toUpperCase();
  const avatar = profile?.avatar;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color={colors.accent} />
          <Text style={styles.backText}>{t("back")}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("myProfile")}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <View style={styles.avatarCard}>
          <TouchableOpacity onPress={changePhoto} activeOpacity={0.8}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={18} color={colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.username}>{profile?.username || "Guest"}</Text>
          <Text style={styles.email}>{profile?.email || ""}</Text>
          <TouchableOpacity onPress={changePhoto}>
            <Text style={styles.changePhoto}>{t("changePhoto")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.success }]}>{wins}</Text>
            <Text style={styles.statLabel}>{t("wins")}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.dangerText }]}>{losses}</Text>
            <Text style={styles.statLabel}>{t("losses")}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.accent }]}>{winRate}%</Text>
            <Text style={styles.statLabel}>{t("winRate")}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.themeBtn} onPress={toggleTheme}>
          <Ionicons name={mode === "dark" ? "sunny" : "moon"} size={18} color={colors.text} />
          <Text style={styles.themeBtnText}>
            {mode === "dark" ? t("switchLight") : t("switchDark")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.themeBtn} onPress={toggleLanguage}>
          <Ionicons name="language" size={18} color={colors.text} />
          <Text style={styles.themeBtnText}>
            {lang === "en" ? "עברית" : "English"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editBtn} onPress={openEditModal}>
          <Ionicons name="create-outline" size={18} color={colors.onAccent} />
          <Text style={styles.editBtnText}>{t("editProfile")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={colors.text} />
          <Text style={styles.logoutText}>{t("logout")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteModal(true)}>
          <Ionicons name="trash-outline" size={18} color={colors.dangerText} />
          <Text style={styles.deleteText}>{t("deleteAccount")}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("editProfile")}</Text>
            <Text style={styles.label}>{t("username")}</Text>
            <TextInput
              style={styles.input}
              value={editUsername}
              onChangeText={setEditUsername}
              placeholder={t("username")}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
            />
            <Text style={styles.label}>{t("email")}</Text>
            <TextInput
              style={styles.input}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder={t("email")}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowEditModal(false)}>
                <Text style={styles.secondaryBtnText}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveProfile}>
                <Text style={styles.primaryBtnText}>{t("save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: colors.danger }]}>{t("dangerZone")}</Text>
            <Text style={styles.warnText}>{t("deleteConfirmText")}</Text>
            <TextInput
              style={[styles.input, { textAlign: "center" }]}
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              placeholder={t("typeDelete")}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="characters"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation("");
                }}
              >
                <Text style={styles.secondaryBtnText}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={deleteConfirmation !== "DELETE"}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: deleteConfirmation === "DELETE" ? colors.danger : colors.textMuted },
                ]}
                onPress={handleDeleteAccount}
              >
                <Text style={styles.primaryBtnText}>{t("confirm")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: { width: 70, flexDirection: "row", alignItems: "center", gap: 4 },
    backText: { color: c.accent, fontWeight: "600", fontSize: 15 },
    headerTitle: { color: c.text, fontSize: 20, fontWeight: "700" },
    avatarCard: { alignItems: "center", marginTop: 10 },
    avatar: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { color: c.onAccent, fontSize: 48, fontWeight: "900" },
    cameraBadge: {
      position: "absolute",
      right: 0,
      bottom: 0,
      backgroundColor: c.modalBg,
      borderRadius: 16,
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    username: { color: c.text, fontSize: 26, fontWeight: "800", marginTop: 14 },
    email: { color: c.textMuted, fontSize: 15, marginTop: 4 },
    changePhoto: { color: c.accent, fontWeight: "600", marginTop: 8 },
    statsRow: { flexDirection: "row", gap: 12 },
    statBox: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 14,
      paddingVertical: 18,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    statValue: { fontSize: 26, fontWeight: "900" },
    statLabel: { color: c.textMuted, marginTop: 4, fontSize: 13 },
    themeBtn: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.card,
      borderRadius: 12,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    themeBtnText: { color: c.text, fontWeight: "700", fontSize: 16 },
    editBtn: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 14,
    },
    editBtnText: { color: c.onAccent, fontWeight: "800", fontSize: 16 },
    logoutBtn: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.subtle,
      borderRadius: 12,
      paddingVertical: 14,
    },
    logoutText: { color: c.text, fontWeight: "700", fontSize: 16 },
    deleteBtn: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.subtle,
      borderColor: c.danger,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 14,
    },
    deleteText: { color: c.dangerText, fontWeight: "700", fontSize: 16 },
    label: { color: c.textSecondary, fontSize: 13, marginBottom: 6, marginTop: 4 },
    input: {
      backgroundColor: c.inputBg,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: c.text,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.inputBorder,
    },
    warnText: { color: c.textSecondary, textAlign: "center", marginBottom: 12 },
    modalOverlay: {
      flex: 1,
      backgroundColor: c.modalOverlay,
      justifyContent: "center",
      padding: 24,
    },
    modalContent: {
      backgroundColor: c.modalBg,
      borderRadius: 16,
      padding: 22,
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    modalTitle: { color: c.text, fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 16 },
    modalActions: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 8 },
    secondaryBtn: {
      flex: 1,
      backgroundColor: c.subtle,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    secondaryBtnText: { color: c.text, fontWeight: "700" },
    primaryBtn: { flex: 1, backgroundColor: c.accent, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
    primaryBtnText: { color: c.onAccent, fontWeight: "800" },
  });

export default ProfileScreen;
