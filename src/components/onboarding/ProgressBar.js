import React from "react";
import { View, StyleSheet } from "react-native";

export default function ProgressBar({ step = 1, total = 4 }) {
  const pct = Math.max(0, Math.min(1, total ? step / total : 0));

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2D6BFF",
  },
});
