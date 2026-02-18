import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProductTypeScreen from "../screens/onboarding/ProductTypeScreen";
import QuitDateScreen from "../screens/onboarding/QuitDateScreen";
import UsageScreen from "../screens/onboarding/UsageScreen";
import SummaryScreen from "../screens/onboarding/SummaryScreen.js";

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="productTypeScreen" component={ProductTypeScreen} />
      <Stack.Screen name="quitDateScreen" component={QuitDateScreen} />
      <Stack.Screen name="usageScreen" component={UsageScreen} />
      <Stack.Screen name="summaryScreen" component={SummaryScreen} />
    </Stack.Navigator>
  );
}
