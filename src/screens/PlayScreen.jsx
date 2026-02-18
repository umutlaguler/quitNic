import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const { width, height } = Dimensions.get("window");

// ---- Tasarım bütünlüğü (dark + turuncu aksan) ----
const THEME = {
  bg: "#0B0F14",
  panel: "#0E1520",
  metal1: "#141C28",
  metal2: "#243247",
  metal3: "#2F415D",
  edge: "#0F1722",
  shadow: "rgba(0,0,0,0.35)",

  accent: "#FF7A1A",
  accentSoft: "#FFB067",
  accentHot: "#FFD3A3",

  glow1: "rgba(255,122,26,0.28)",
  glow2: "rgba(255,176,103,0.18)",
};

// thresholds
const OPEN_SWIPE_UP = 40;
const LIGHT_SWIPE_DOWN = 45;
const CLOSE_SWIPE_DOWN = 35;

const ZIPPO_W = Math.min(270, width * 0.72);
const ZIPPO_H = ZIPPO_W * 1.35;
const LID_H = ZIPPO_H * 0.28;

export default function PlayScreen() {
  // "CLOSED" | "OPEN" | "LIT"
  const state = useSharedValue("CLOSED");

  // 0..1 anim values
  const lidOpen = useSharedValue(0);
  const flameOn = useSharedValue(0);

  // micro-motion values
  const lidKick = useSharedValue(0);
  const bodyBreath = useSharedValue(0);
  const flicker = useSharedValue(0);

  useEffect(() => {
    // Hafif "breathing" — çok minimal premium canlılık
    bodyBreath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // Alev flicker loop (alev sönükken opacity 0 olacağı için görünmez)
    flicker.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 90, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 110, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);

  const openLid = () => {
    "worklet";
    if (state.value !== "CLOSED") return;
    state.value = "OPEN";

    // mekanik kick
    lidKick.value = withSequence(
      withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 140, easing: Easing.out(Easing.quad) })
    );

    lidOpen.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
  };

  const lightFlame = () => {
    "worklet";
    if (state.value !== "OPEN") return;
    state.value = "LIT";

    // hızlı ignition
    flameOn.value = withSequence(
      withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) }),
      // küçük “settle”
      withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) })
    );
  };

  const closeLid = () => {
    "worklet";
    if (state.value === "CLOSED") return;

    // önce söndür
    flameOn.value = withTiming(0, { duration: 120, easing: Easing.out(Easing.quad) });

    // sonra kapağı kapat
    state.value = "CLOSED";
    lidOpen.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
  };

  // ---- Gestures ----
  const bodyPan = useMemo(() => {
    return Gesture.Pan().onEnd((e) => {
      const dy = e.translationY;

      // CLOSED -> swipe up => OPEN
      if (state.value === "CLOSED" && dy < -OPEN_SWIPE_UP) {
        openLid();
        return;
      }

      // OPEN -> swipe down (body) => LIT
      if (state.value === "OPEN" && dy > LIGHT_SWIPE_DOWN) {
        lightFlame();
        return;
      }
    });
  }, []);

  const lidPan = useMemo(() => {
    // "kapaktan tutup aşağı swipe" => kapan
    return Gesture.Pan().onEnd((e) => {
      const dy = e.translationY;
      if ((state.value === "OPEN" || state.value === "LIT") && dy > CLOSE_SWIPE_DOWN) {
        closeLid();
      }
    });
  }, []);

  // ---- Animated Styles ----
  const wrapStyle = useAnimatedStyle(() => {
    const breath = interpolate(bodyBreath.value, [0, 1], [0, 1]);
    const scale = 1 + breath * 0.008; // çok minimal
    const lift = -breath * 2;

    return {
      transform: [{ translateY: lift }, { scale }],
    };
  });

  const lidStyle = useAnimatedStyle(() => {
    const rot = interpolate(lidOpen.value, [0, 1], [0, -86]);
    const kick = interpolate(lidKick.value, [0, 1], [0, -3]);

    // pivot simulasyonu
    return {
      transform: [
        { translateX: -6 },
        { translateY: 10 },
        { rotateZ: `${rot + kick}deg` },
        { translateX: 6 },
        { translateY: -10 },
      ],
    };
  });

  const lidHighlightStyle = useAnimatedStyle(() => {
    const o = interpolate(lidOpen.value, [0, 1], [0.12, 0.2]);
    return { opacity: o };
  });

  const flameWrapStyle = useAnimatedStyle(() => {
    const o = flameOn.value;
    const pop = interpolate(flameOn.value, [0, 1], [0.3, 1]);
    const jig = interpolate(flicker.value, [0, 1], [-1.6, 1.6]);

    return {
      opacity: o,
      transform: [{ translateX: jig }, { scale: pop }],
    };
  });

  const outerFlameStyle = useAnimatedStyle(() => {
    // dış alev: flicker scale + hafif rotate
    const f = flicker.value;
    const s = interpolate(f, [0, 1], [0.98, 1.06]);
    const r = interpolate(f, [0, 1], [-2, 2]);
    const y = interpolate(f, [0, 1], [0.5, -0.5]);

    return {
      transform: [{ translateY: y }, { rotateZ: `${r}deg` }, { scaleY: s }, { scaleX: s * 0.98 }],
    };
  });

  const innerFlameStyle = useAnimatedStyle(() => {
    const f = flicker.value;
    const s = interpolate(f, [0, 1], [0.97, 1.04]);
    const r = interpolate(f, [0, 1], [2, -2]);

    return {
      transform: [{ rotateZ: `${r}deg` }, { scale: s }],
      opacity: interpolate(flameOn.value, [0, 1], [0, 0.95]),
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const o = interpolate(flameOn.value, [0, 1], [0, 1]);
    const pulse = interpolate(flicker.value, [0, 1], [0.95, 1.08]);

    return {
      opacity: o,
      transform: [{ scale: pulse }],
    };
  });

  const baseShadowStyle = useAnimatedStyle(() => {
    const o = interpolate(lidOpen.value, [0, 1], [0.22, 0.28]);
    return { opacity: o };
  });

  return (
    <View style={styles.screen}>
      <View style={styles.stage}>
        <Animated.View style={[styles.zippoWrap, wrapStyle]}>
          {/* Glow + Flame (kapak üstü) */}
          <Animated.View style={[styles.glowA, glowStyle]} />
          <Animated.View style={[styles.glowB, glowStyle]} />

          <Animated.View style={[styles.flameWrap, flameWrapStyle]}>
            <Animated.View style={[styles.flameOuter, outerFlameStyle]} />
            <Animated.View style={[styles.flameInner, innerFlameStyle]} />
            <View style={styles.flameCore} />
          </Animated.View>

          {/* Lid */}
          <GestureDetector gesture={lidPan}>
            <Animated.View style={[styles.lid, lidStyle]}>
              <View style={styles.lidTexture} />
              <Animated.View style={[styles.lidHighlight, lidHighlightStyle]} />
              <View style={styles.lidEdge} />
            </Animated.View>
          </GestureDetector>

          {/* Body */}
          <GestureDetector gesture={bodyPan}>
            <Animated.View style={styles.body}>
              <View style={styles.bodyTexture} />
              <View style={styles.bodyHighlightR} />
              <View style={styles.bodyHighlightL} />
              <View style={styles.hinge} />
              <View style={styles.strikeWheel} />
              <Animated.View style={[styles.baseShadow, baseShadowStyle]} />
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </View>
    </View>
  );
}

// ---- Styles ----
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  stage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.bg,
  },

  zippoWrap: {
    width: ZIPPO_W,
    height: ZIPPO_H,
    alignItems: "center",
    justifyContent: "flex-end",
  },

  // ---------- Flame ----------
  glowA: {
    position: "absolute",
    top: -42,
    width: ZIPPO_W * 0.85,
    height: ZIPPO_W * 0.85,
    borderRadius: 999,
    backgroundColor: THEME.glow1,
  },
  glowB: {
    position: "absolute",
    top: -20,
    width: ZIPPO_W * 0.62,
    height: ZIPPO_W * 0.62,
    borderRadius: 999,
    backgroundColor: THEME.glow2,
  },
  flameWrap: {
    position: "absolute",
    top: -24,
    width: ZIPPO_W * 0.22,
    height: ZIPPO_W * 0.34,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  // dış alev: damla formu
  flameOuter: {
    width: "100%",
    height: "100%",
    backgroundColor: THEME.accent,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderBottomLeftRadius: 160,
    borderBottomRightRadius: 160,
  },
  // iç alev: daha küçük, daha açık
  flameInner: {
    position: "absolute",
    bottom: 8,
    width: "62%",
    height: "62%",
    backgroundColor: THEME.accentSoft,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderBottomLeftRadius: 140,
    borderBottomRightRadius: 140,
  },
  // alev çekirdeği: sıcak beyazımsı (abartmadan)
  flameCore: {
    position: "absolute",
    bottom: 12,
    width: "32%",
    height: "32%",
    backgroundColor: THEME.accentHot,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderBottomLeftRadius: 120,
    borderBottomRightRadius: 120,
    opacity: 0.85,
  },

  // ---------- Lid ----------
  lid: {
    position: "absolute",
    top: 0,
    width: ZIPPO_W,
    height: LID_H,
    borderRadius: 18,
    backgroundColor: THEME.metal1,
    borderWidth: 1,
    borderColor: THEME.edge,
    overflow: "hidden",
  },
  lidTexture: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.metal2,
    opacity: 0.16,
  },
  lidHighlight: {
    position: "absolute",
    left: -ZIPPO_W * 0.25,
    top: -40,
    width: ZIPPO_W * 0.8,
    height: LID_H + 80,
    backgroundColor: "#FFFFFF",
    opacity: 0.16,
    transform: [{ rotateZ: "16deg" }],
  },
  lidEdge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#0A0F16",
    opacity: 0.6,
  },

  // ---------- Body ----------
  body: {
    width: ZIPPO_W,
    height: ZIPPO_H - 10,
    borderRadius: 24,
    backgroundColor: THEME.metal1,
    borderWidth: 1,
    borderColor: THEME.edge,
    overflow: "hidden",
  },
  bodyTexture: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.panel,
    opacity: 0.45,
  },
  bodyHighlightR: {
    position: "absolute",
    right: -ZIPPO_W * 0.28,
    top: -60,
    width: ZIPPO_W * 0.75,
    height: ZIPPO_H * 1.1,
    backgroundColor: "#FFFFFF",
    opacity: 0.08,
    transform: [{ rotateZ: "-14deg" }],
  },
  bodyHighlightL: {
    position: "absolute",
    left: -ZIPPO_W * 0.42,
    top: -40,
    width: ZIPPO_W * 0.55,
    height: ZIPPO_H,
    backgroundColor: "#FFFFFF",
    opacity: 0.05,
    transform: [{ rotateZ: "10deg" }],
  },
  hinge: {
    position: "absolute",
    left: 10,
    top: LID_H - 2,
    width: 28,
    height: 18,
    borderRadius: 8,
    backgroundColor: "#0A0E14",
    opacity: 0.55,
  },
  // zippo hissi için küçük detay: strike wheel (soyut)
  strikeWheel: {
    position: "absolute",
    top: LID_H + 8,
    left: 18,
    width: 42,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#0A0E14",
    opacity: 0.35,
  },
  baseShadow: {
    position: "absolute",
    bottom: -14,
    left: 16,
    right: 16,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#000",
  },
});
