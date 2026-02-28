import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Pressable,
  Modal,
  Platform,
  I18nManager,
} from "react-native";
import PrimaryButton from "../components/onboarding/PrimaryButton";
import { useOnboarding } from "../OnboardingContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import DateTimePicker from "@react-native-community/datetimepicker";
import { DAILY_MESSAGES } from "../notifications/messages";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

const NOTIF_ENABLED_KEY = "daily_reminder_enabled_v1";
const NOTIF_TIME_KEY = "daily_reminder_time_v1"; 
const NOTIF_ID_KEY = "daily_reminder_id_v1";
const ANDROID_CHANNEL_ID = "daily-reminder";

function pad2(n) { return String(n).padStart(2, "0"); }
function pickRandomMessage(list) {
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}
function parseTimeStr(s) {
  if (!s || typeof s !== "string" || !s.includes(":")) return { hour: 9, minute: 0 };
  const [hh, mm] = s.split(":");
  const hour = Math.min(23, Math.max(0, Number(hh)));
  const minute = Math.min(59, Math.max(0, Number(mm)));
  return { hour: Number.isFinite(hour) ? hour : 9, minute: Number.isFinite(minute) ? minute : 0 };
}
function formatTimeStr(hour, minute) { return `${pad2(hour)}:${pad2(minute)}`; }

export default function SettingsScreen({ navigation }) {
  const { t } = useTranslation();
  const { resetAll } = useOnboarding();

  const [hydrated, setHydrated] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [timeStr, setTimeStr] = useState("09:00");
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);

  const LANGUAGES = [
    { label: "English", code: "en", icon: "🇺🇸" },
    { label: "Türkçe", code: "tr", icon: "🇹🇷" },
    { label: "Français", code: "fr", icon: "🇫🇷" },
    { label: "العربية", code: "ar", icon: "🇦🇪" },
  ];

  const pickerDate = useMemo(() => {
    const { hour, minute } = parseTimeStr(timeStr);
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d;
  }, [timeStr]);

  useEffect(() => {
    const setupChannel = async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
          name: "Daily Reminder",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
    };
    setupChannel();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [enabledRaw, savedTime] = await Promise.all([
          AsyncStorage.getItem(NOTIF_ENABLED_KEY),
          AsyncStorage.getItem(NOTIF_TIME_KEY),
        ]);
        setReminderEnabled(enabledRaw === "1");
        if (savedTime) setTimeStr(savedTime);
      } finally {
        setHydrated(true);
      }
    };
    load();
  }, []);

  const changeLanguage = async (lng) => {
    const isRTL = lng === "ar";
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
    }
    await i18n.changeLanguage(lng);
    await AsyncStorage.setItem("user-language", lng);
    setShowLangModal(false);
  };

  const cancelExistingReminder = async () => {
    const id = await AsyncStorage.getItem(NOTIF_ID_KEY);
    if (id) {
      try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
      await AsyncStorage.removeItem(NOTIF_ID_KEY);
    }
  };

  const scheduleDailyReminder = async (hour, minute) => {
    await cancelExistingReminder();
    const message = pickRandomMessage(DAILY_MESSAGES);
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: t('home.log_craving'), body: message },
      trigger: { type: "daily", hour, minute },
    });
    await AsyncStorage.setItem(NOTIF_ID_KEY, id);
    return id;
  };

  const onToggleReminder = async (next) => {
    if (!hydrated) return;
    if (next) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        setReminderEnabled(false);
        await AsyncStorage.setItem(NOTIF_ENABLED_KEY, "0");
        return;
      }
      setReminderEnabled(true);
      await AsyncStorage.setItem(NOTIF_ENABLED_KEY, "1");
      setShowTimeModal(true);
      setShowPicker(true);
      return;
    }
    setReminderEnabled(false);
    await AsyncStorage.setItem(NOTIF_ENABLED_KEY, "0");
    await cancelExistingReminder();
  };

  const onConfirmTime = async () => {
    try {
      const { hour, minute } = parseTimeStr(timeStr);
      await AsyncStorage.setItem(NOTIF_TIME_KEY, timeStr);
      if (reminderEnabled) { await scheduleDailyReminder(hour, minute); }
    } finally {
      setShowPicker(false);
      setShowTimeModal(false);
    }
  };

  const doReset = async () => {
    setConfirmResetOpen(false);
    await cancelExistingReminder();
    await AsyncStorage.setItem(NOTIF_ENABLED_KEY, "0");
    setReminderEnabled(false);
    await resetAll();
    navigation.reset({ index: 0, routes: [{ name: "OnboardingFlow" }] });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.title')}</Text>
      <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>

      {/* Dil Seçim Kartı */}
      <View style={styles.card}>
        <Pressable onPress={() => setShowLangModal(true)} style={styles.row}>
          <View style={styles.iconBox}><Text style={styles.iconText}>🌐</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{t('settings.language')}</Text>
            <Text style={styles.timeValue}>
              {LANGUAGES.find(l => l.code === i18n.language)?.label || "English"}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      {/* Hatırlatıcı Kartı */}
      <View style={[styles.card, { marginTop: 12 }]}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{t('settings.reminder_title')}</Text>
            <Text style={styles.cardSub}>{t('settings.reminder_sub')}</Text>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={onToggleReminder}
            trackColor={{ false: "rgba(255,255,255,0.15)", true: "rgba(45,107,255,0.55)" }}
            thumbColor={reminderEnabled ? "#2D6BFF" : "#B0B6C3"}
          />
        </View>
        <View style={styles.divider} />
        <Pressable
          onPress={() => reminderEnabled && (setShowTimeModal(true), setShowPicker(true))}
          style={[styles.timeRow, !reminderEnabled && { opacity: 0.45 }]}
        >
          <View style={styles.iconBox}><Text style={styles.iconText}>⏰</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.timeTitle}>{t('settings.reminder_time')}</Text>
            <Text style={styles.timeValue}>{timeStr}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      {/* Reset Kartı */}
      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.cardTitle}>{t('settings.onboarding_title')}</Text>
        <Text style={styles.cardSub}>{t('settings.onboarding_sub')}</Text>
        <View style={{ marginTop: 14 }}>
          <PrimaryButton title={t('settings.reset_btn')} onPress={() => setConfirmResetOpen(true)} />
        </View>
      </View>

      {/* Dil Seçim Modalı */}
      <Modal visible={showLangModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings.language')}</Text>
            <View style={{ marginTop: 16, gap: 8 }}>
              {LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  onPress={() => changeLanguage(lang.code)}
                  style={[styles.langItem, i18n.language === lang.code && styles.langItemActive]}
                >
                  <Text style={styles.langIcon}>{lang.icon}</Text>
                  <Text style={styles.langLabel}>{lang.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setShowLangModal(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalBtnGhostText}>{t('common.done')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Saat Seçim Modalı */}
      <Modal visible={showTimeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings.choose_time')}</Text>
            <View style={{ marginTop: 12 }}>
              {showPicker && (
                <DateTimePicker
                  value={pickerDate}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  themeVariant="dark"
                  onChange={(event, date) => {
                    if (date) setTimeStr(formatTimeStr(date.getHours(), date.getMinutes()));
                    if (Platform.OS === "android") onConfirmTime();
                  }}
                />
              )}
            </View>
            {Platform.OS === "ios" && (
              <View style={styles.modalBtns}>
                <Pressable onPress={() => setShowTimeModal(false)} style={styles.modalBtnGhost}>
                  <Text style={styles.modalBtnGhostText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable onPress={onConfirmTime} style={styles.modalBtnPrimary}>
                  <Text style={styles.modalBtnPrimaryText}>{t('common.save')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Reset Onay Modalı */}
      <Modal visible={confirmResetOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings.onboarding_title') || "Reset?"}</Text>
            <Text style={[styles.cardSub, {marginBottom: 10}]}>{t('settings.onboarding_sub')}</Text>
            <View style={styles.modalBtns}>
              <Pressable onPress={() => setConfirmResetOpen(false)} style={styles.modalBtnGhost}>
                <Text style={styles.modalBtnGhostText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable onPress={doReset} style={styles.modalBtnDanger}>
                <Text style={styles.modalBtnPrimaryText}>{t('settings.reset_btn')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80, paddingHorizontal: 20, backgroundColor: "#0B1220" },
  title: { color: "#fff", fontSize: 26, fontWeight: "900", textAlign: I18nManager.isRTL ? 'right' : 'left' },
  subtitle: { color: "rgba(255,255,255,0.55)", marginTop: 8, fontSize: 13, textAlign: I18nManager.isRTL ? 'right' : 'left' },
  card: { marginTop: 18, borderRadius: 18, padding: 16, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  row: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: "center", gap: 12 },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "900", textAlign: I18nManager.isRTL ? 'right' : 'left' },
  cardSub: { color: "rgba(255,255,255,0.55)", marginTop: 6, fontSize: 13, lineHeight: 18, textAlign: I18nManager.isRTL ? 'right' : 'left' },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginTop: 14, marginBottom: 10 },
  timeRow: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: "center", gap: 12, paddingVertical: 10 },
  iconBox: { width: 34, height: 34, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" },
  iconText: { color: "#2D6BFF", fontWeight: "900" },
  timeTitle: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "800", textAlign: I18nManager.isRTL ? 'right' : 'left' },
  timeValue: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 2, textAlign: I18nManager.isRTL ? 'right' : 'left' },
  chevron: { color: "rgba(255,255,255,0.35)", fontSize: 22, transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  modalCard: { width: "100%", borderRadius: 18, padding: 16, backgroundColor: "#0B1220", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "900", textAlign: I18nManager.isRTL ? 'right' : 'left' },
  modalBtns: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 16 },
  modalBtnGhost: { flex: 1, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  modalBtnGhostText: { color: "rgba(255,255,255,0.85)", fontWeight: "900" },
  modalBtnPrimary: { flex: 1, height: 52, borderRadius: 16, backgroundColor: "#2D6BFF", alignItems: "center", justifyContent: "center" },
  modalBtnPrimaryText: { color: "#fff", fontWeight: "900" },
  modalBtnDanger: { flex: 1, height: 52, borderRadius: 16, backgroundColor: "rgba(255,70,70,0.85)", alignItems: "center", justifyContent: "center" },
  langItem: { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row', alignItems: "center", padding: 16, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)" },
  langItemActive: { borderColor: "#2D6BFF", borderWidth: 1, backgroundColor: "rgba(45,107,255,0.1)" },
  langIcon: { fontSize: 20, [I18nManager.isRTL ? 'marginLeft' : 'marginRight']: 12 },
  langLabel: { color: "#fff", fontSize: 16, fontWeight: "700", flex: 1, textAlign: I18nManager.isRTL ? 'right' : 'left' },
  modalCloseBtn: { marginTop: 20, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)" },
});