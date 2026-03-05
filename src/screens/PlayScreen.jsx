import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Dimensions, TouchableOpacity, SafeAreaView } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";

const { width } = Dimensions.get("window");

const THEME = {
  bg: "#0B0F14",
  panel: "#0E1520",
  metal1: "#141C28",
  metal2: "#243247",
  edge: "#0F1722",
  accent: "#FF7A1A",
  accentSoft: "#FFB067",
  accentHot: "#FFD3A3",
  glow1: "rgba(255,122,26,0.28)",
  glow2: "rgba(255,176,103,0.18)",
  tutorialThumb: "rgba(255, 255, 255, 0.15)", // Başparmak rengi
};

const ZIPPO_W = Math.min(270, width * 0.72);
const ZIPPO_H = ZIPPO_W * 1.35;
const LID_H = ZIPPO_H * 0.28;

export default function PlayScreen() {
  const navigation = useNavigation();
  const soundsRef = useRef({ open: null, light: null, close: null });

  const [tutorialStep, setTutorialStep] = useState(0);

  const state = useSharedValue("CLOSED");
  const lidOpen = useSharedValue(0);
  const flameOn = useSharedValue(0);
  const lidKick = useSharedValue(0);
  const bodyBreath = useSharedValue(0);
  const flicker = useSharedValue(0);

  // Rehber Animasyon Değerleri
  const thumbY = useSharedValue(0);
  const thumbOpacity = useSharedValue(0);
  const waveScale = useSharedValue(1);

  useEffect(() => {
    async function setupAudio() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          shouldDuckAndroid: true,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          staysActiveInBackground: false,
        });
        const { sound: openSnd } = await Audio.Sound.createAsync(require("../../assets/sounds/open.mp3"));
        const { sound: lightSnd } = await Audio.Sound.createAsync(require("../../assets/sounds/light.mp3"));
        const { sound: closeSnd } = await Audio.Sound.createAsync(require("../../assets/sounds/close.mp3"));
        soundsRef.current = { open: openSnd, light: lightSnd, close: closeSnd };
      } catch (e) { console.log("Ses yükleme hatası:", e); }
    }
    setupAudio();

    bodyBreath.value = withRepeat(withSequence(withTiming(1, { duration: 1800 }), withTiming(0, { duration: 1800 })), -1, true);
    flicker.value = withRepeat(withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 110 })), -1, true);

    return () => { Object.values(soundsRef.current).forEach(s => s?.unloadAsync()); };
  }, []);

  // Yeni Başparmak Animasyon Döngüsü
  useEffect(() => {
    if (tutorialStep >= 3) {
      thumbOpacity.value = withTiming(0);
      return;
    }

    thumbOpacity.value = withTiming(1);
    
    // Dalga efekti (Modern rehber)
    waveScale.value = withRepeat(withSequence(withTiming(1.5, { duration: 800 }), withTiming(1, { duration: 0 })), -1, false);

    if (tutorialStep === 0) { // Kapak Aç
      thumbY.value = withRepeat(withSequence(withTiming(40, { duration: 0 }), withTiming(-60, { duration: 1200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })), -1, false);
    } else if (tutorialStep === 1) { // Çakmak Yak
      thumbY.value = withRepeat(withSequence(withTiming(-20, { duration: 0 }), withTiming(60, { duration: 1200 })), -1, false);
    } else if (tutorialStep === 2) { // Kapat
      thumbY.value = -130;
      thumbOpacity.value = withRepeat(withSequence(withTiming(1, { duration: 500 }), withTiming(0.4, { duration: 500 })), -1, true);
    }
  }, [tutorialStep]);

  const playSound = async (type) => {
    try {
      const soundInstance = soundsRef.current[type];
      if (soundInstance) {
        await soundInstance.stopAsync();
        await soundInstance.setPositionAsync(0);
        await soundInstance.playAsync();
      }
    } catch (error) { console.log("Hata:", error); }
  };

  const openLid = () => {
    "worklet";
    if (state.value !== "CLOSED") return;
    state.value = "OPEN";
    runOnJS(playSound)('open');
    if (tutorialStep === 0) runOnJS(setTutorialStep)(1);

    lidKick.value = withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 140 }));
    lidOpen.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
  };

  const lightFlame = () => {
    "worklet";
    if (state.value !== "OPEN") return;
    state.value = "LIT";
    runOnJS(playSound)('light');
    if (tutorialStep === 1) runOnJS(setTutorialStep)(2);

    flameOn.value = withSequence(withTiming(1, { duration: 160 }), withTiming(1, { duration: 120 }));
  };

  const closeLid = () => {
    "worklet";
    if (state.value === "CLOSED") return;
    runOnJS(playSound)('close');
    if (tutorialStep === 2) runOnJS(setTutorialStep)(3);

    flameOn.value = withTiming(0, { duration: 120 });
    state.value = "CLOSED";
    lidOpen.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
  };

  const bodyPan = useMemo(() => Gesture.Pan().onEnd((e) => {
    if (state.value === "CLOSED" && e.translationY < -40) openLid();
    else if (state.value === "OPEN" && e.translationY > 45) lightFlame();
  }), [tutorialStep]);

  const lidPan = useMemo(() => Gesture.Pan().onEnd((e) => {
    if ((state.value === "OPEN" || state.value === "LIT") && e.translationY > 35) closeLid();
  }), [tutorialStep]);

  // Animasyonlu Stiller
  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -bodyBreath.value * 2 }, { scale: 1 + bodyBreath.value * 0.008 }]
  }));

  const lidStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -6 }, { translateY: 10 },
      { rotateZ: `${interpolate(lidOpen.value, [0, 1], [0, -86]) + interpolate(lidKick.value, [0, 1], [0, -3])}deg` },
      { translateX: 6 }, { translateY: -10 }
    ],
  }));

  const flameWrapStyle = useAnimatedStyle(() => ({
    opacity: flameOn.value,
    transform: [{ translateX: interpolate(flicker.value, [0, 1], [-1.6, 1.6]) }, { scale: interpolate(flameOn.value, [0, 1], [0.3, 1]) }]
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: flameOn.value,
    transform: [{ scale: interpolate(flicker.value, [0, 1], [0.95, 1.08]) }]
  }));

  const thumbAnimationStyle = useAnimatedStyle(() => ({
    opacity: thumbOpacity.value,
    transform: [{ translateY: thumbY.value }]
  }));

  const waveAnimationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: waveScale.value }],
    opacity: interpolate(waveScale.value, [1, 1.5], [0.6, 0])
  }));

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>

      <View style={styles.stage}>
        <Animated.View style={[styles.zippoWrap, wrapStyle]}>
          
          {/* MODERN BAŞPARMAK REHBERİ */}
          {tutorialStep < 3 && (
            <Animated.View style={[styles.thumbContainer, thumbAnimationStyle]} pointerEvents="none">
              <Animated.View style={[styles.guideWave, waveAnimationStyle]} />
              <View style={styles.thumbGraphic}>
                <View style={styles.thumbNail} />
              </View>
            </Animated.View>
          )}

          <Animated.View style={[styles.glowA, glowStyle]} />
          <Animated.View style={[styles.glowB, glowStyle]} />
          
          <Animated.View style={[styles.flameWrap, flameWrapStyle]}>
            <View style={styles.flameOuter} /><View style={styles.flameInner} /><View style={styles.flameCore} />
          </Animated.View>

          <GestureDetector gesture={lidPan}>
            <Animated.View style={[styles.lid, lidStyle]}>
              <View style={styles.lidTexture} /><View style={styles.lidEdge} />
            </Animated.View>
          </GestureDetector>

          <GestureDetector gesture={bodyPan}>
            <Animated.View style={styles.body}>
              <View style={styles.bodyTexture} /><View style={styles.hinge} /><View style={styles.strikeWheel} />
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.bg },
  header: { position: 'absolute', top: 20, left: 20, zIndex: 100 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
  stage: { flex: 1, alignItems: "center", justifyContent: "center" },
  zippoWrap: { width: ZIPPO_W, height: ZIPPO_H, alignItems: "center", justifyContent: "flex-end" },
  
  // Modern Başparmak Tasarımı
  thumbContainer: { position: 'absolute', zIndex: 300, bottom: '45%', alignItems: 'center' },
  thumbGraphic: {
    width: 55,
    height: 85,
    backgroundColor: THEME.tutorialThumb,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  thumbNail: {
    width: 30,
    height: 35,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  guideWave: {
    position: 'absolute',
    top: -10,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: THEME.accent,
  },

  glowA: { position: "absolute", top: -42, width: ZIPPO_W * 0.85, height: ZIPPO_W * 0.85, borderRadius: 999, backgroundColor: THEME.glow1 },
  glowB: { position: "absolute", top: -20, width: ZIPPO_W * 0.62, height: ZIPPO_W * 0.62, borderRadius: 999, backgroundColor: THEME.glow2 },
  flameWrap: { position: "absolute", top: -24, width: ZIPPO_W * 0.22, height: ZIPPO_W * 0.34, alignItems: "center", justifyContent: "flex-end" },
  flameOuter: { width: "100%", height: "100%", backgroundColor: THEME.accent, borderRadius: 999 },
  flameInner: { position: "absolute", bottom: 8, width: "62%", height: "62%", backgroundColor: THEME.accentSoft, borderRadius: 999 },
  flameCore: { position: "absolute", bottom: 12, width: "32%", height: "32%", backgroundColor: THEME.accentHot, borderRadius: 999, opacity: 0.85 },
  lid: { position: "absolute", top: 0, width: ZIPPO_W, height: LID_H, borderRadius: 18, backgroundColor: THEME.metal1, borderWidth: 1, borderColor: THEME.edge, overflow: "hidden" },
  lidTexture: { ...StyleSheet.absoluteFillObject, backgroundColor: THEME.metal2, opacity: 0.16 },
  lidEdge: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2, backgroundColor: "#0A0F16", opacity: 0.6 },
  body: { width: ZIPPO_W, height: ZIPPO_H - 10, borderRadius: 24, backgroundColor: THEME.metal1, borderWidth: 1, borderColor: THEME.edge, overflow: "hidden" },
  bodyTexture: { ...StyleSheet.absoluteFillObject, backgroundColor: THEME.panel, opacity: 0.45 },
  hinge: { position: "absolute", left: 10, top: LID_H - 2, width: 28, height: 18, borderRadius: 8, backgroundColor: "#0A0E14", opacity: 0.55 },
  strikeWheel: { position: "absolute", top: LID_H + 8, left: 18, width: 42, height: 14, borderRadius: 7, backgroundColor: "#0A0E14", opacity: 0.35 },
});