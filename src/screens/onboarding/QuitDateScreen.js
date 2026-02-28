import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";
import PrimaryButton from "../../components/onboarding/PrimaryButton";
import { useOnboarding } from "../../OnboardingContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";



function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function QuitDateScreen({ navigation }) {
    const { t } = useTranslation();
    const { data, update } = useOnboarding();

    const [showPicker, setShowPicker] = useState(false);
    const [tempDate, setTempDate] = useState(() => {
    return data.quitDateISO ? new Date(data.quitDateISO) : new Date();
    });


  // local seçimi UI için tutuyoruz, kaynağı context
  const [selectedKey, setSelectedKey] = useState(() => {
    if (!data.quitDateISO) return null;
    const q = startOfDay(new Date(data.quitDateISO)).getTime();
    const today = startOfDay(new Date()).getTime();
    const tomorrow = startOfDay(new Date(Date.now() + 24 * 60 * 60 * 1000)).getTime();
    if (q === today) return "today";
    if (q === tomorrow) return "tomorrow";
    return "custom";
  });

  const canContinue = useMemo(() => !!data.quitDateISO, [data.quitDateISO]);

  const pickToday = () => {
    setSelectedKey("today");
    update({ quitDateISO: startOfDay(new Date()).toISOString() });
    setShowPicker(false);
  };

  const pickTomorrow = () => {
    setSelectedKey("tomorrow");
    update({ quitDateISO: startOfDay(new Date(Date.now() + 24 * 60 * 60 * 1000)).toISOString() });
    setShowPicker(false);
  };

 const pickCustom = () => {
  setSelectedKey("custom");
  setTempDate(data.quitDateISO ? new Date(data.quitDateISO) : new Date());
  setShowPicker(true);
};


  const dateText = useMemo(() => {
    if (!data.quitDateISO) return "-";
    try {
      return new Date(data.quitDateISO).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  }, [data.quitDateISO]);

  return (
    <OnboardingLayout
      navigation={navigation}
      step={2}
      total={4}
      canGoBack={true}
      footer={
        <PrimaryButton
          title={t('common.continue')}
          disabled={!canContinue}
          onPress={() => navigation.navigate("usageScreen")} // ✅ summary değil, sıradaki adım Usage
        />
      }
    >
      <Text style={styles.title}>{t('onboarding.step2_title')}</Text>
      <Text style={styles.subtitle}>{t('onboarding.step2_sub')}</Text>

      <View style={styles.list}>
        <SelectCard
          title="Today"
          subtitle={new Date().toLocaleDateString("tr-TR", { weekday: "long" })}
          selected={selectedKey === "today"}
          onPress={pickToday}
        />

        <SelectCard
          title="Tomorrow"
          subtitle={new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString("tr-TR", { weekday: "long" })}
          selected={selectedKey === "tomorrow"}
          onPress={pickTomorrow}
        />

        <SelectCard
          title="Choose a date"
          subtitle={selectedKey === "custom" ? dateText : "Select any date"}
          selected={selectedKey === "custom"}
          onPress={pickCustom}
        />
      </View>
        {showPicker && (
            <DateTimePicker
                value={tempDate}
                themeVariant="dark"
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={new Date()} // geçmiş tarih seçilmesin
                onChange={(event, selectedDate) => {
                if (Platform.OS === "android") setShowPicker(false);

                // Android: iptal edince selectedDate null gelebilir
                if (!selectedDate) return;

                const d = new Date(selectedDate);
                d.setHours(0, 0, 0, 0);

                setTempDate(d);
                update({ quitDateISO: d.toISOString() });
                }}
            />
        )}
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
});
