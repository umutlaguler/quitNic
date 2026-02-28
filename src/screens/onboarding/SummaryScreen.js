import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";
import PrimaryButton from "../../components/onboarding/PrimaryButton";
import { useOnboarding } from "../../OnboardingContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../storage/keys"; // yolun sende buysa
import { useTranslation } from "react-i18next";


function formatDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function formatMoneyUSD(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "-";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    // Intl bazı ortamlarda sorun çıkarırsa fallback
    return `$${n.toFixed(2)}`;
  }
}

function mapProductType(x) {
  if (x === "cigarettes") return "Cigarettes";
  if (x === "vaping") return "Vaping";
  if (x === "heated_tobacco") return "Heated Tobacco";
  return "-";
}

export default function SummaryScreen({ navigation }) {
  const { t } = useTranslation();
  const { data, markOnboardingDone } = useOnboarding();
  const quitDateText = useMemo(() => formatDate(data.quitDateISO), [data.quitDateISO]);
  const dailySpendText = useMemo(() => formatMoneyUSD(data.dailyCost), [data.dailyCost]);

  const canContinue = useMemo(() => {
    return !!data.productType && !!data.quitDateISO && typeof data.dailyCost === "number" && data.dailyCost > 0;
  }, [data.productType, data.quitDateISO, data.dailyCost]);

const finish = async () => {
  console.log("FINISH CLICKED ✅");
  console.log("DONE KEY:", STORAGE_KEYS?.ONBOARDING_DONE);

  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, "1");
    const done = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE);
    console.log("DONE FLAG AFTER SET:", done);

    navigation.getParent()?.reset({
      index: 0,
      routes: [{ name: "homeScreen" }],
    });
  } catch (e) {
    console.log("ASYNCSTORAGE ERROR ❌", e);
  }
};

  return (
    <OnboardingLayout
      navigation={navigation}
      step={4}
      total={4}
      canGoBack={true}
      footer={
        <PrimaryButton
          title={t('common.save')}
          disabled={!canContinue}
          onPress={finish}
        />
      }
    >
      <Text style={styles.title}>{t('onboarding.summary_title')}</Text>
      <Text style={styles.subtitle}>{t('onboarding.summary_sub')}</Text>

      <View style={styles.card}>
        <SummaryRow
          label={t('onboarding.product_label')}
          value={mapProductType(data.productType)}
          onEdit={() => navigation.navigate("productTypeScreen")}
        />
        <Divider />
        <SummaryRow
          label={t('onboarding.date_label')}
          value={quitDateText}
          onEdit={() => navigation.navigate("quitDateScreen")}
        />
        <Divider />
        <SummaryRow
          label={t('onboarding.cost_label')}
          value={dailySpendText}
          onEdit={() => navigation.navigate("usageScreen")}
        />
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>You can change these later</Text>
        <Text style={styles.noteText}>
          We’ll use this to calculate savings and track your progress.
        </Text>
      </View>
    </OnboardingLayout>
  );
}

function SummaryRow({ label, value, onEdit }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>

      <Pressable onPress={onEdit} style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.85 }]}>
        <Text style={styles.editText}>Edit</Text>
      </Pressable>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  title: { color: "#fff", fontSize: 28, fontWeight: "700" },
  subtitle: { color: "rgba(255,255,255,0.7)", marginTop: 8, fontSize: 14 },

  card: {
    marginTop: 22,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },

  label: { color: "rgba(255,255,255,0.55)", fontSize: 12, marginBottom: 6 },
  value: { color: "#fff", fontSize: 18, fontWeight: "700" },

  editBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  editText: { color: "rgba(255,255,255,0.75)", fontWeight: "700", fontSize: 13 },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  noteCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(45,107,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(45,107,255,0.18)",
  },
  noteTitle: { color: "#fff", fontWeight: "800", fontSize: 14, marginBottom: 6 },
  noteText: { color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 18 },
});
