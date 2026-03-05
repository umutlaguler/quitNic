import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Image,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Vibration,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useOnboarding } from "../OnboardingContext";
import { useTranslation } from "react-i18next";
// Eski hali: import analytics from '@react-native-firebase/analytics';
import { getAnalytics, logEvent } from '@react-native-firebase/analytics';

// ✅ Dinamik Mesaj Fonksiyonu
const getPanicMessage = (seconds) => {
  if (seconds > 80) return "Deep breaths. You're just starting, stay with me.";
  if (seconds > 65) return "The first minute is the hardest. You're doing great.";
  if (seconds > 50) return "Halfway there! Notice how the intensity is shifting.";
  if (seconds > 35) return "You are stronger than a 90-second urge. Keep holding.";
  if (seconds > 15) return "Almost through the peak. Just a little longer.";
  if (seconds > 0)  return "The finish line is right there. Don't let go now!";
  return "You did it. The urge is losing its power.";
};

const LUNGS = {
  first: require("../../assets/firstStageLung.png"),
  second: require("../../assets/secondStageLung.png"),
  third: require("../../assets/thirdStageLung.png"),
};

const CRAVING_LOGS_KEY = "craving_logs_v1";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatMoneyUSD(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "$0";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n)}`;
  }
}

function formatDuration(ms) {
  const totalHours = Math.max(0, Math.floor(ms / (1000 * 60 * 60)));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return `${days}d ${hours}h`;
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatShortDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  } catch {
    return "";
  }
}

async function loadCravingLogs() {
  try {
    const raw = await AsyncStorage.getItem(CRAVING_LOGS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function appendCravingLog(entry) {
  try {
    const arr = await loadCravingLogs();
    const next = [entry, ...arr].slice(0, 200);
    await AsyncStorage.setItem(CRAVING_LOGS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { data, update } = useOnboarding();
  const now = Date.now();

  // -------------------------
  // EMERGENCY PANIC STATE
  // -------------------------
  const [panicOpen, setPanicOpen] = useState(false);
  const [panicSeconds, setPanicSeconds] = useState(90);
  const [isHolding, setIsHolding] = useState(false);
  const [panicSuccess, setPanicSuccess] = useState(false);
  const [showRetryMsg, setShowRetryMsg] = useState(false);
  const timerRef = useRef(null);

  // -------------------------
  // MEVCUT STATE'LER
  // -------------------------
  const [recent, setRecent] = useState([]);
  const [cravingOpen, setCravingOpen] = useState(false);
  const [intensity, setIntensity] = useState(3);
  const [note, setNote] = useState("");
  const [supportOpen, setSupportOpen] = useState(false);

  const quitDate = useMemo(() => {
    if (!data.quitDateISO) return null;
    return startOfDay(new Date(data.quitDateISO));
  }, [data.quitDateISO]);

  const totalSmokeFreeMs = useMemo(() => {
    if (!quitDate) return 0;
    return Math.max(0, now - quitDate.getTime());
  }, [quitDate, now]);

  const streakStart = useMemo(() => {
    const iso = data.streakStartISO || data.quitDateISO;
    if (!iso) return null;
    return startOfDay(new Date(iso));
  }, [data.streakStartISO, data.quitDateISO]);

  const streakMs = useMemo(() => {
    if (!streakStart) return 0;
    return Math.max(0, now - streakStart.getTime());
  }, [streakStart, now]);

  const smokeFreeDays = useMemo(() => {
    return Math.floor(streakMs / (1000 * 60 * 60 * 24));
  }, [streakMs]);

  const dailyCost = useMemo(() => {
    const n = Number(data.dailyCost);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [data.dailyCost]);

  const moneySaved = useMemo(() => {
    const totalDaysExact = totalSmokeFreeMs / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.round(totalDaysExact * dailyCost));
  }, [totalSmokeFreeMs, dailyCost]);

  const productLabel = useMemo(() => {
    if (data.productType === "cigarettes") return "Cigarettes";
    if (data.productType === "vaping") return "Vaping";
    if (data.productType === "heated_tobacco") return "Heated Tobacco";
    return "Your product";
  }, [data.productType]);

  const stageKey = useMemo(() => {
    if (smokeFreeDays < 15) return "first";
    if (smokeFreeDays < 30) return "second";
    return "third";
  }, [smokeFreeDays]);

  const stageLabel = useMemo(() => {
    if (stageKey === "first") return "Stage 1: Detox (0–14 days)";
    if (stageKey === "second") return "Stage 2: Recovery (15–29 days)";
    return "Stage 3: Restoration (30+ days)";
  }, [stageKey]);

  const refreshRecent = async () => {
    const logs = await loadCravingLogs();
    setRecent(logs.slice(0, 3));
  };

  useEffect(() => {
    refreshRecent();
  }, []);

  const openCraving = () => {
    setIntensity(3);
    setNote("");
    setCravingOpen(true);
  };

  const closeCraving = () => setCravingOpen(false);

  const EMOJIS = [
    { v: 1, e: "😌", t: "Easy" },
    { v: 2, e: "🙂", t: "Mild" },
    { v: 3, e: "😐", t: "Medium" },
    { v: 4, e: "😣", t: "Hard" },
    { v: 5, e: "😫", t: "Very hard" },
  ];

  const saveCraving = async (outcome) => {
    const entry = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAtISO: new Date().toISOString(),
      intensity: panicOpen ? 5 : intensity,
      note: panicOpen ? "Emergency Panic Mode - Completed Reset" : note?.trim() || "",
      outcome,
    };

    const nextLogs = await appendCravingLog(entry);
    if (nextLogs) setRecent(nextLogs.slice(0, 3));

    if (outcome === "smoked") {
      const todayISO = startOfDay(new Date()).toISOString();
      update({
        streakStartISO: todayISO,
        lastSlipISO: todayISO,
      });
      closeCraving();
      resetPanic(); 
      setTimeout(() => setSupportOpen(true), 200);
      return;
    }
    closeCraving();
    resetPanic();
  };

  // -------------------------
  // EMERGENCY TIMER LOGIC (WITH VIBRATION & DYNAMIC MSGS)
  // -------------------------
  const openPanicModal = () => {
    resetPanic();
    setPanicOpen(true);
  };

  const startPanicTimer = () => {
    setIsHolding(true);
    setShowRetryMsg(false);
    
    // ✅ Basıldığı an yumuşak titreşim
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10); 
    } else {
      Vibration.vibrate(40);
    }

    timerRef.current = setInterval(() => {
      setPanicSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setPanicSuccess(true);
          setIsHolding(false);
          // ✅ Bittiğinde başarı titreşimi
          Vibration.vibrate([0, 100, 50, 100]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopPanicTimer = () => {
    setIsHolding(false);
    clearInterval(timerRef.current);
    if (panicSeconds > 0 && !panicSuccess) {
      setShowRetryMsg(true);
    }
  };

  const resetPanic = () => {
    clearInterval(timerRef.current);
    setPanicOpen(false);
    setPanicSeconds(90);
    setPanicSuccess(false);
    setShowRetryMsg(false);
    setIsHolding(false);
  };
 const handlePlayGamePress = async () => {
  try {
    const { getAnalytics, logEvent } = require('@react-native-firebase/analytics');
    const { getApp } = require('@react-native-firebase/app');
    
    // Uygulama hazır mı kontrol et, değilse sessizce geç
    const app = getApp(); 
    if (app) {
      logEvent(getAnalytics(app), 'zippo_play_game_click', {
        smoke_free_days_count: smokeFreeDays
      });
    }
  } catch (e) {
    console.log("Loglama atlandı, Firebase hazır değil.");
  }

  navigation.navigate("playScreen");
};

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bigTitle}>{smokeFreeDays} {t('home.days_free')}</Text>
            <Text style={styles.smallSub}>{stageLabel}</Text>
          </View>
          <View>
            <Pressable
              onPress={() => navigation.navigate("settingsScreen")}
              style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.85 }]}
              hitSlop={12}
            >
              <Text style={styles.settingsIcon}>⚙</Text>
              <Text style={styles.settingsText}>Settings</Text>
            </Pressable>
            <Pressable
              onPress={handlePlayGamePress}
              style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.85 }]}
              hitSlop={12}
            >
              <Text style={styles.settingsIcon}>🎮</Text>
              <Text style={styles.settingsText}>Play Game</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.lungWrap}>
          <Image style={styles.lungImage} source={LUNGS[stageKey]} resizeMode="contain" />
        </View>

        <View style={styles.cardsRow}>
          <StatCard
            label={t('home.money_saved')}
            value={formatMoneyUSD(moneySaved)}
            sub={`Baseline: ${formatMoneyUSD(dailyCost)}/day`}
            subColor="green"
          />
          <StatCard
            label={t('home.daily_cost')}
            value={formatMoneyUSD(dailyCost)}
            sub="per day"
            subColor="muted"
          />
        </View>

        <View style={styles.list}>
          <ListRow leftTitle={t('home.spend_avoided')} rightValue={formatMoneyUSD(moneySaved)} iconText="$" />
          <Divider />
          <ListRow leftTitle={t('home.life_regained')} rightValue={formatDuration(totalSmokeFreeMs)} iconText="⏱" />
        </View>

        {/* --- PANIC BUTTON --- */}
        <Pressable 
          style={({ pressed }) => [styles.panicBtn, pressed && { opacity: 0.9 }]} 
          onPress={openPanicModal}
        >
          <Text style={styles.panicBtnText}>🚨 EMERGENCY: I WANT TO SMOKE</Text>
        </Pressable>

        {/* CTA */}
        <Pressable style={styles.ctaBtn} onPress={openCraving}>
          <View style={styles.ctaIcon}>
            <Text style={styles.ctaIconText}>＋</Text>
          </View>
          <Text style={styles.ctaText}>{t('home.log_craving')}</Text>
        </Pressable>

        {/* Recent activity */}
        <View style={styles.recentWrap}>
          <Text style={styles.recentTitle}>{t('home.recent_activity')}</Text>
          {recent.length === 0 ? (
            <View style={styles.recentEmpty}>
              <Text style={styles.recentEmptyText}>{t('home.no_activity')}</Text>
            </View>
          ) : (
            <View style={styles.recentList}>
              {recent.map((x) => (
                <View key={x.id} style={styles.recentItem}>
                  <View style={styles.recentLeft}>
                    <View style={styles.recentBadge}>
                      <Text style={styles.recentBadgeText}>{x.outcome === "made_it" ? "✓" : "•"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recentLine1}>
                        {formatShortDate(x.createdAtISO)} • {formatTime(x.createdAtISO)} • Intensity {x.intensity}/5
                      </Text>
                      {!!x.note && <Text numberOfLines={1} style={styles.recentNote}>{x.note}</Text>}
                    </View>
                  </View>
                  <Text style={[styles.recentRight, x.outcome === "made_it" && { color: "rgba(0,255,160,0.85)" }, x.outcome === "smoked" && { color: "rgba(255,255,255,0.55)" }]}>
                    {x.outcome === "made_it" ? "Got through" : "Slip"}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.quote}>{t('home.quote')}</Text>
        <Text style={styles.footerHint}>Tracking: {productLabel}</Text>
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* -------------------------
          EMERGENCY PANIC MODAL (UPDATED WITH DYNAMIC TEXT)
      -------------------------- */}
      <Modal visible={panicOpen} transparent animationType="fade" onRequestClose={resetPanic}>
        <View style={styles.modalOverlay}>
          <View style={styles.panicModalCard}>
            {!panicSuccess ? (
              <>
                <Text style={styles.panicModalTitle}>Stay Calm. We're here.</Text>
                
                {/* Dinamik mesaj alanı - Sabit yükseklik korundu */}
                <View style={{ height: 60, justifyContent: 'center' }}>
                    <Text style={styles.panicModalSub}>
                        {getPanicMessage(panicSeconds)}
                    </Text>
                </View>

                <View style={styles.panicTimerContainer}>
                  <Text style={styles.panicCountdown}>{panicSeconds}s</Text>
                  
                  <Pressable
                    onPressIn={startPanicTimer}
                    onPressOut={stopPanicTimer}
                    style={({ pressed }) => [
                      styles.holdCircle,
                      isHolding && styles.holdCircleActive,
                      pressed && { transform: [{ scale: 0.95 }] }
                    ]}
                  >
                    <Text style={styles.holdText}>{isHolding ? "RELAX & BREATHE" : "HOLD TO START"}</Text>
                  </Pressable>
                </View>

                {showRetryMsg && (
                  <Text style={styles.retryMsg}>
                    Don't let go! The craving is temporary, your progress is permanent.
                  </Text>
                )}

                <Pressable onPress={resetPanic} style={styles.panicCancelBtn}>
                  <Text style={styles.panicCancelText}>I changed my mind</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.panicModalTitle}>Time's up.</Text>
                <Text style={styles.panicModalSub}>
                  You've given your brain a 90-second reset. Usually, the peak of the craving has passed now. How do you feel?
                </Text>

                <View style={styles.panicActionRow}>
                  <Pressable 
                    onPress={() => saveCraving("made_it")} 
                    style={[styles.panicResultBtn, { backgroundColor: "#00C853" }]}
                  >
                    <Text style={styles.panicResultText}>Better, I won't smoke</Text>
                  </Pressable>

                  <Pressable 
                    onPress={() => saveCraving("smoked")} 
                    style={[styles.panicResultBtn, { backgroundColor: "rgba(255,255,255,0.1)" }]}
                  >
                    <Text style={styles.panicResultText}>Still need it, I'll smoke</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* -------------------------
          MEVCUT MODALLAR (Craving & Support)
      -------------------------- */}
      <Modal visible={cravingOpen} transparent animationType="fade" onRequestClose={closeCraving}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('craving_modal.title')}</Text>
                <Pressable onPress={closeCraving} hitSlop={12}><Text style={styles.modalClose}>✕</Text></Pressable>
              </View>
              <Text style={styles.modalSub}>{t('craving_modal.subtitle')}</Text>
              <View style={styles.emojiRow}>
                {EMOJIS.map((x) => (
                  <Pressable key={x.v} onPress={() => setIntensity(x.v)} style={[styles.emojiChip, intensity === x.v && styles.emojiChipSelected]}>
                    <Text style={styles.emoji}>{x.e}</Text>
                    <Text style={styles.emojiLabel}>{x.t}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput value={note} onChangeText={setNote} placeholder={t('craving_modal.note_placeholder')} placeholderTextColor="rgba(255,255,255,0.35)" multiline style={styles.noteInput} />
              <View style={styles.actionRow}>
                <Pressable onPress={() => saveCraving("smoked")} style={styles.leftBtn}><Text style={styles.leftBtnText}>{t('craving_modal.i_smoked')} {data.productType}</Text></Pressable>
                <Pressable onPress={() => saveCraving("made_it")} style={styles.rightBtn}><Text style={styles.rightBtnText}>{t('craving_modal.i_made_it')} </Text></Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={supportOpen} transparent animationType="fade" onRequestClose={() => setSupportOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.supportCard}>
            <Text style={styles.supportTitle}>{t('breathing.title')}</Text>
            <Text style={styles.supportSub}>{t('breathing.subtitle')}</Text>
            <View style={styles.breathCard}>
              <Text style={styles.breathTitle}>30-second reset</Text>
              <View style={styles.breathSteps}>
                <BreathStep label="Inhale" value="4s" /><BreathStep label="Hold" value="4s" /><BreathStep label="Exhale" value="6s" />
              </View>
            </View>
            <Pressable onPress={() => setSupportOpen(false)} style={styles.supportBtn}><Text style={styles.supportBtnText}>{t('breathing.finish')}</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({ label, value, sub, subColor = "muted" }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {!!sub && <Text style={[styles.statSub, subColor === "green" && { color: "rgba(0,255,160,0.75)" }, subColor === "muted" && { color: "rgba(255,255,255,0.55)" }]}>{sub}</Text>}
    </View>
  );
}

function ListRow({ leftTitle, rightValue, iconText }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}><Text style={styles.rowIconText}>{iconText}</Text></View>
        <Text style={styles.rowTitle}>{leftTitle}</Text>
      </View>
      <Text style={styles.rowRight}>{rightValue}</Text>
    </View>
  );
}

function Divider() { return <View style={styles.divider} />; }
function BreathStep({ label, value }) {
  return (
    <View style={styles.breathStep}>
      <Text style={styles.breathStepLabel}>{label}</Text>
      <Text style={styles.breathStepValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B1220" },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  bigTitle: { color: "#fff", fontSize: 34, fontWeight: "900" },
  smallSub: { color: "rgba(255,255,255,0.55)", marginTop: 6, fontSize: 13 },
  settingsBtn: { marginBottom: 4, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  settingsIcon: { color: "#2D6BFF", fontSize: 18, fontWeight: "900" },
  settingsText: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "800" },
  lungWrap: { marginTop: 18, alignItems: "center", justifyContent: "center" },
  lungImage: { width: "60%", height: 260 },
  cardsRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  statCard: { flex: 1, borderRadius: 18, padding: 16, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  statLabel: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  statValue: { color: "#fff", fontSize: 28, fontWeight: "900", marginTop: 10 },
  statSub: { marginTop: 8, fontSize: 12, fontWeight: "800" },
  list: { marginTop: 14, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", overflow: "hidden" },
  row: { paddingHorizontal: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.25)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  rowIconText: { color: "#2D6BFF", fontWeight: "900" },
  rowTitle: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "700" },
  rowRight: { color: "#fff", fontSize: 14, fontWeight: "900" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)" },

  panicBtn: {
    marginTop: 20,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#FF416C",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FF4B2B",
    shadowColor: "#FF416C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  panicBtnText: { color: "#fff", fontSize: 15, fontWeight: "900", letterSpacing: 0.5 },
  panicModalCard: { width: "100%", borderRadius: 24, padding: 24, backgroundColor: "#0B1220", borderWidth: 2, borderColor: "#FF416C" },
  panicModalTitle: { color: "#fff", fontSize: 22, fontWeight: "900", textAlign: "center" },
  panicModalSub: { color: "rgba(255,255,255,0.7)", marginTop: 12, fontSize: 14, textAlign: "center", lineHeight: 20 },
  panicTimerContainer: { alignItems: "center", marginVertical: 30 },
  panicCountdown: { color: "#FF416C", fontSize: 48, fontWeight: "900", marginBottom: 20 },
  holdCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 65, 108, 0.1)",
    borderWidth: 4,
    borderColor: "#FF416C",
    alignItems: "center",
    justifyContent: "center",
  },
  holdCircleActive: { backgroundColor: "#FF416C", transform: [{ scale: 1.05 }] },
  holdText: { color: "#fff", fontSize: 14, fontWeight: "900", textAlign: "center" },
  retryMsg: { color: "#FFB300", textAlign: "center", fontWeight: "700", marginBottom: 15, paddingHorizontal: 10 },
  panicCancelBtn: { marginTop: 10, padding: 10 },
  panicCancelText: { color: "rgba(255,255,255,0.4)", textAlign: "center", fontWeight: "700" },
  panicActionRow: { gap: 12, marginTop: 20 },
  panicResultBtn: { height: 55, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  panicResultText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  ctaBtn: { marginTop: 14, height: 58, borderRadius: 18, backgroundColor: "#2D6BFF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 },
  ctaIcon: { width: 26, height: 26, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  ctaIconText: { color: "#fff", fontWeight: "900", fontSize: 16, marginTop: -1 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  recentWrap: { marginTop: 20 },
  recentTitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "900", letterSpacing: 0.4, marginBottom: 10 },
  recentEmpty: { borderRadius: 18, padding: 14, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  recentEmptyText: { color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 18, fontWeight: "700" },
  recentList: { borderRadius: 18, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", overflow: "hidden" },
  recentItem: { paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  recentLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, paddingRight: 10 },
  recentBadge: { width: 28, height: 28, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.25)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  recentBadgeText: { color: "#2D6BFF", fontWeight: "900" },
  recentLine1: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "800" },
  recentNote: { color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 4, fontWeight: "700" },
  recentRight: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "900" },
  quote: { marginTop: 20, textAlign: "center", color: "rgba(255,255,255,0.5)", fontStyle: "italic", lineHeight: 18 },
  footerHint: { marginTop: 10, textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: "800" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  modalCard: { width: "100%", borderRadius: 18, padding: 16, backgroundColor: "#0B1220", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  modalClose: { color: "rgba(255,255,255,0.65)", fontSize: 18, fontWeight: "900" },
  modalSub: { color: "rgba(255,255,255,0.70)", marginTop: 10, fontSize: 13 },
  emojiRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  emojiChip: { flex: 1, borderRadius: 16, paddingVertical: 10, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  emojiChipSelected: { borderColor: "rgba(45,107,255,0.55)", backgroundColor: "rgba(45,107,255,0.12)" },
  emoji: { fontSize: 22 },
  emojiLabel: { marginTop: 6, color: "rgba(255,255,255,0.70)", fontSize: 11, fontWeight: "800" },
  noteInput: { marginTop: 10, minHeight: 90, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12, color: "#fff", backgroundColor: "rgba(0,0,0,0.25)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", fontSize: 14, fontWeight: "600", textAlignVertical: "top" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  leftBtn: { flex: 1, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", alignItems: "center", justifyContent: "center" },
  leftBtnText: { color: "rgba(255,255,255,0.88)", fontWeight: "900" },
  rightBtn: { flex: 1, height: 52, borderRadius: 16, backgroundColor: "#2D6BFF", alignItems: "center", justifyContent: "center" },
  rightBtnText: { color: "#fff", fontWeight: "900" },
  supportCard: { width: "100%", borderRadius: 18, padding: 16, backgroundColor: "#0B1220", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  supportTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  supportSub: { color: "rgba(255,255,255,0.70)", marginTop: 8, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  breathCard: { marginTop: 12, borderRadius: 18, padding: 14, backgroundColor: "rgba(45,107,255,0.10)", borderWidth: 1, borderColor: "rgba(45,107,255,0.18)" },
  breathTitle: { color: "#fff", fontWeight: "900", fontSize: 14 },
  breathSteps: { flexDirection: "row", gap: 10, marginTop: 10 },
  breathStep: { flex: 1, borderRadius: 16, paddingVertical: 10, backgroundColor: "rgba(0,0,0,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  breathStepLabel: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "800" },
  breathStepValue: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 4 },
  supportBtn: { marginTop: 12, height: 52, borderRadius: 16, backgroundColor: "#2D6BFF", alignItems: "center", justifyContent: "center" },
  supportBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});