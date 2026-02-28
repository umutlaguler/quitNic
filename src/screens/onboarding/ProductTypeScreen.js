import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";
import PrimaryButton from "../../components/onboarding/PrimaryButton";
import OptionCard from "../../components/onboarding/OptionCard";
import { useOnboarding } from "../../OnboardingContext";
import { useTranslation } from "react-i18next";


const icons = {
  cigarettes: require("../../../assets/smoking.png"),
  vaping: require("../../../assets/vape.png"),
  heated_tobacco: require("../../../assets/air.png"),
};

export default function ProductTypeScreen({ navigation }) {
  const { t } = useTranslation();
  const { data, update } = useOnboarding();
  const selected = data.productType;

  return (
    <OnboardingLayout
      navigation={navigation}
      step={1}
      total={4}
      canGoBack={false}
      footer={
        <PrimaryButton
          title={t('common.continue')}
          disabled={!selected}
          onPress={() => navigation.navigate("quitDateScreen")}
        />
      }
    >
      <Text style={styles.title}>{t('onboarding.step1_title')}</Text>
      <Text style={styles.subtitle}>{t('onboarding.step1_sub')}</Text>

      <View style={styles.list}>
        <OptionCard
          title="Cigarettes"
          subtitle="Traditional tobacco"
          icon={<Image source={icons.cigarettes} style={styles.icon} resizeMode="contain" />}
          selected={selected === "cigarettes"}
          onPress={() => update({ productType: "cigarettes" })}
        />

        <OptionCard
          title="Vaping"
          subtitle="E-cigarettes or pods"
          icon={<Image source={icons.vaping} style={styles.icon} resizeMode="contain" />}
          selected={selected === "vaping"}
          onPress={() => update({ productType: "vaping" })}
        />

        <OptionCard
          title="Heated Tobacco"
          subtitle="IQOS and similar devices"
          icon={<Image source={icons.heated_tobacco} style={styles.icon} resizeMode="contain" />}
          selected={selected === "heated_tobacco"}
          onPress={() => update({ productType: "heated_tobacco" })}
        />
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  title: { color: "#fff", fontSize: 28, fontWeight: "700" },
  subtitle: { color: "rgba(255,255,255,0.7)", marginTop: 8, fontSize: 14 },
  list: { marginTop: 22, gap: 12 },
  icon: { width: 26, height: 26 },
});
