import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Onboarding</Text>
      <Button title="Devam et (Home)" onPress={() => navigation.navigate("Home")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "600" },
});
