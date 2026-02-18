import React from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import StepHeader from "./StepHeader";

export default function OnboardingLayout({
  navigation,
  step,
  total = 4,
  canGoBack = true,
  children,
  footer, // alttaki sabit alan (buton)
}) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <StepHeader
            navigation={navigation}
            step={step}
            total={total}
            canGoBack={canGoBack}
          />
        </View>

        <View style={styles.content}>{children}</View>

        {!!footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B1220" },
  container: { flex: 1, backgroundColor: "#0B1220" },

  header: { paddingHorizontal: 20, paddingTop: 10 },
  content: { flex: 1, paddingHorizontal: 20, marginTop: 24 },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#0B1220",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
});
