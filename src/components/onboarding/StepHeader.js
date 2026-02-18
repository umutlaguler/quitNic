import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import ProgressBar from "./ProgressBar";

export default function StepHeader({
  navigation,
  step = 1,
  total = 4,
  canGoBack = true,
}) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.topRow}>
        <Pressable
          onPress={() => navigation.goBack()}
          disabled={!canGoBack}
          style={({ pressed }) => [
            styles.backBtn,
            (!canGoBack || pressed) && { opacity: 0.5 },
          ]}
          hitSlop={12}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <Text style={styles.stepText}>{`STEP ${step} OF ${total}`}</Text>

        {/* sağ tarafta hizalama için boşluk */}
        <View style={{ width: 44 }} />
      </View>

      <ProgressBar step={step} total={total} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  backText: { color: "#fff", fontSize: 26, marginTop: -2 },
  stepText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: "600",
  },
});
