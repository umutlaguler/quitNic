import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

export default function OptionCard({
  title,
  subtitle,
  icon,        // ReactNode
  selected,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={styles.left}>
        <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
          {icon}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>

      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 86,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  cardSelected: {
    borderColor: "rgba(45,107,255,0.55)",
    backgroundColor: "rgba(45,107,255,0.10)",
  },

  left: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },

  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  iconWrapSelected: {
    backgroundColor: "rgba(45,107,255,0.16)",
  },

  title: { color: "#fff", fontSize: 20, fontWeight: "700" },
  subtitle: { color: "rgba(255,255,255,0.55)", marginTop: 2, fontSize: 13 },

  radioOuter: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#2D6BFF",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#2D6BFF",
  },
});
