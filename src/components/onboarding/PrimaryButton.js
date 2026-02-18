import React, { useEffect, useRef } from "react";
import { Pressable, Text, StyleSheet, Animated } from "react-native";

export default function PrimaryButton({ title = "Next", onPress, disabled }) {
  const opacity = useRef(new Animated.Value(disabled ? 0.5 : 1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: disabled ? 0.5 : 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [disabled]);

  return (
    <Animated.View style={{ opacity }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          pressed && !disabled && { transform: [{ scale: 0.985 }] },
        ]}
      >
        <Text style={styles.text}>{title} →</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2D6BFF",
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
