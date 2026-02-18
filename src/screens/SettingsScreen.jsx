import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Pressable,
  Modal,
  Platform,
} from "react-native";
import PrimaryButton from "../components/onboarding/PrimaryButton";
import { useOnboarding } from "../OnboardingContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import DateTimePicker from "@react-native-community/datetimepicker";
import { DAILY_MESSAGES } from "../notifications/messages";

const NOTIF_ENABLED_KEY = "daily_reminder_enabled_v1";
const NOTIF_TIME_KEY = "daily_reminder_time_v1"; // "HH:MM"
const NOTIF_ID_KEY = "daily_reminder_id_v1";
const ANDROID_CHANNEL_ID = "daily-reminder";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function pad2(n) {
  return String(n).padStart(2, "0");
}
function pickRandomMessage(list) {
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

function parseTimeStr(s) {
  if (!s || typeof s !== "string" || !s.includes(":")) return { hour: 9, minute: 0 };
  const [hh, mm] = s.split(":");
  const hour = Math.min(23, Math.max(0, Number(hh)));
  const minute = Math.min(59, Math.max(0, Number(mm)));
  return {
    hour: Number.isFinite(hour) ? hour : 9,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

function formatTimeStr(hour, minute) {
  return `${pad2(hour)}:${pad2(minute)}`;
}

export default function SettingsScreen({ navigation }) {
  const { resetAll } = useOnboarding();

  const [hydrated, setHydrated] = useState(false);

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [timeStr, setTimeStr] = useState("09:00");
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const pickerDate = useMemo(() => {
    const { hour, minute } = parseTimeStr(timeStr);
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d;
  }, [timeStr]);

  // ✅ Android channel (iOS'ta harmless)
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

  // ---- hydrate saved settings
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

  // ---- helpers
  const cancelExistingReminder = async () => {
    const id = await AsyncStorage.getItem(NOTIF_ID_KEY);
    if (id) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {}
      await AsyncStorage.removeItem(NOTIF_ID_KEY);
    }
  };

  // ✅ FIX: trigger format (type DAILY)
  const scheduleDailyReminder = async (hour, minute) => {
  await cancelExistingReminder();

  const message = pickRandomMessage(DAILY_MESSAGES);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Daily check-in",
      body: message,
    },
    trigger: {
      type: "daily",   // iOS için daha güvenli
      hour,
      minute,
    },
  });

  await AsyncStorage.setItem(NOTIF_ID_KEY, id);
  return id;
};

  const ensurePermission = async () => {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.status === "granted") return true;

    const req = await Notifications.requestPermissionsAsync();
    return req.status === "granted";
  };

  // ---- actions
  const onToggleReminder = async (next) => {
    if (!hydrated) return;

    if (next) {
      const ok = await ensurePermission();
      if (!ok) {
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
    console.log("SAVE CLICKED ✅", timeStr);

    try {
      const { hour, minute } = parseTimeStr(timeStr);

      await AsyncStorage.setItem(NOTIF_TIME_KEY, timeStr);

      if (reminderEnabled) {
        const id = await scheduleDailyReminder(hour, minute);
        console.log("SCHEDULED ✅", { id, hour, minute });
      } else {
        console.log("Reminder disabled, not scheduling");
      }
    } catch (e) {
      console.log("SAVE ERROR ❌", e);
    } finally {
      setShowPicker(false);
      setShowTimeModal(false);
    }
  };

  const onResetPress = () => setConfirmResetOpen(true);

  const doReset = async () => {
    setConfirmResetOpen(false);

    await cancelExistingReminder();
    await AsyncStorage.setItem(NOTIF_ENABLED_KEY, "0");

    setReminderEnabled(false);

    await resetAll();

    navigation.reset({
      index: 0,
      routes: [{ name: "OnboardingFlow" }],
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Customize your experience.</Text>

      {/* Reminder card */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Daily reminder</Text>
            <Text style={styles.cardSub}>
              Get one notification per day to stay consistent.
            </Text>
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
          onPress={() => {
            if (!reminderEnabled) return;
            setShowTimeModal(true);
            setShowPicker(true);
          }}
          style={({ pressed }) => [
            styles.timeRow,
            !reminderEnabled && { opacity: 0.45 },
            pressed && reminderEnabled && { opacity: 0.9 },
          ]}
        >
          <View style={styles.iconBox}>
            <Text style={styles.iconText}>⏰</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.timeTitle}>Reminder time</Text>
            <Text style={styles.timeValue}>{timeStr}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      {/* Reset card */}
      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.cardTitle}>Onboarding</Text>
        <Text style={styles.cardSub}>
          Reset your setup. This will remove your saved progress.
        </Text>

        <View style={{ marginTop: 14 }}>
          <PrimaryButton title="Reset onboarding" onPress={onResetPress} />
        </View>
      </View>

      {/* --- Time modal */}
      <Modal
        visible={showTimeModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowTimeModal(false);
          setShowPicker(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose a time</Text>
            <Text style={styles.modalSub}>We’ll send one reminder every day.</Text>

            <View style={{ marginTop: 12 }}>
              {showPicker && (
                <DateTimePicker
                  value={pickerDate}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  themeVariant="dark"
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === "android" && event?.type === "dismissed") {
                      setShowPicker(false);
                      setShowTimeModal(false);
                      return;
                    }
                    if (!selectedDate) return;

                    const h = selectedDate.getHours();
                    const m = selectedDate.getMinutes();
                    setTimeStr(formatTimeStr(h, m));

                    if (Platform.OS === "android") {
                      setTimeout(() => onConfirmTime(), 0);
                    }
                  }}
                />
              )}
            </View>

            {/* ✅ iOS'ta butonların rahat basılması için minik boşluk */}
            <View style={{ height: 12 }} />

            {Platform.OS === "ios" ? (
              <View style={styles.modalBtns}>
                <Pressable
                  onPress={() => {
                    setShowTimeModal(false);
                    setShowPicker(false);
                  }}
                  style={({ pressed }) => [styles.modalBtnGhost, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.modalBtnGhostText}>Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={onConfirmTime}
                  style={({ pressed }) => [styles.modalBtnPrimary, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.modalBtnPrimaryText}>Save</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* --- Reset confirm modal */}
      <Modal
        visible={confirmResetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmResetOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reset onboarding?</Text>
            <Text style={styles.modalSub}>
              All achievements and saved progress will be removed. Are you sure?
            </Text>

            <View style={styles.modalBtns}>
              <Pressable
                onPress={() => setConfirmResetOpen(false)}
                style={({ pressed }) => [styles.modalBtnGhost, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={doReset}
                style={({ pressed }) => [styles.modalBtnDanger, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.modalBtnPrimaryText}>Yes, reset</Text>
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
  title: { color: "#fff", fontSize: 26, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.55)", marginTop: 8, fontSize: 13 },

  card: {
    marginTop: 18,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  cardSub: { color: "rgba(255,255,255,0.55)", marginTop: 6, fontSize: 13, lineHeight: 18 },

  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginTop: 14, marginBottom: 10 },

  timeRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { color: "#2D6BFF", fontWeight: "900" },
  timeTitle: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "800" },
  timeValue: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 2 },
  chevron: { color: "rgba(255,255,255,0.35)", fontSize: 22, marginTop: -2 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    width: "100%",
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  modalSub: { color: "rgba(255,255,255,0.65)", marginTop: 8, fontSize: 13, lineHeight: 18 },

  modalBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalBtnGhost: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnGhostText: { color: "rgba(255,255,255,0.85)", fontWeight: "900" },

  modalBtnPrimary: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#2D6BFF",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnDanger: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,70,70,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnPrimaryText: { color: "#fff", fontWeight: "900" },
});
