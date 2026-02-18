import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";
import PrimaryButton from "../../components/onboarding/PrimaryButton";
import { useOnboarding } from "../../OnboardingContext";

export default function UsageScreen({ navigation }) {
  const { data, update } = useOnboarding();

  const [mode, setMode] = useState(() => {
    if (typeof data.dailyCost === "number" && data.dailyCost > 0) return "amount";
    return null;
  });

  const [dailyCostText, setDailyCostText] = useState(() => {
    return data.dailyCost ? String(data.dailyCost) : "";
  });

  const canContinue = useMemo(() => {
    if (mode !== "amount") return false;
    const n = Number(dailyCostText.replace(",", "."));
    return Number.isFinite(n) && n > 0;
  }, [mode, dailyCostText]);

  const commitDailyCost = () => {
    const n = Number(dailyCostText.replace(",", "."));
    if (Number.isFinite(n) && n > 0) {
      update({ dailyCost: n });
    }
  };

  return (
    <OnboardingLayout
      navigation={navigation}
      step={3}
      total={4}
      canGoBack={true}
      footer={
        <PrimaryButton
          title="Continue"
          disabled={!canContinue}
          onPress={() => {
            commitDailyCost();
            navigation.navigate("summaryScreen");
          }}
        />
      }
    >
      <Text style={styles.title}>Daily spending</Text>
      <Text style={styles.subtitle}>
        On average, how much do you spend per day for cigarettes?
      </Text>

      <View style={styles.list}>
        <SelectCard
          title="Enter amount ($/day)"
          subtitle="Fastest option"
          selected={mode === "amount"}
          onPress={() => setMode("amount")}
        />

        {mode === "amount" && (
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Daily spend ($)</Text>
            <TextInput
              value={dailyCostText}
              onChangeText={(t) => {
                // sadece rakam + , .
                const cleaned = t.replace(/[^0-9.,]/g, "");
                setDailyCostText(cleaned);
              }}
              onBlur={commitDailyCost}
              placeholder="e.g. 70"
              placeholderTextColor="rgba(255,255,255,0.35)"
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <Text style={styles.hint}>
              Tip: If you don’t know, just estimate. You can change later.
            </Text>
          </View>
        )}
      </View>
    </OnboardingLayout>
  );
}

function SelectCard({ title, subtitle, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      </View>

      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { color: "#fff", fontSize: 28, fontWeight: "700" },
  subtitle: { color: "rgba(255,255,255,0.7)", marginTop: 8, fontSize: 14 },

  list: { marginTop: 22, gap: 12 },

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
  cardTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  cardSubtitle: { color: "rgba(255,255,255,0.55)", marginTop: 2, fontSize: 13 },

  radioOuter: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: { borderColor: "#2D6BFF" },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#2D6BFF",
  },

  inputCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  inputLabel: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginBottom: 8 },
  input: {
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    fontSize: 18,
    fontWeight: "700",
  },
  hint: { color: "rgba(255,255,255,0.45)", marginTop: 10, fontSize: 12 },
});
