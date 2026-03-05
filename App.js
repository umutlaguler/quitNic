import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import OnboardingNavigator from "./src/navigation/OnboardingNavigator";
import HomeScreen from "./src/screens/HomeScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import { OnboardingProvider } from "./src/OnboardingContext";
import { STORAGE_KEYS } from "./src/storage/keys";
import PlayScreen from "./src/screens/PlayScreen";
import { PostHog } from 'posthog-react-native';

// ✅ PostHog'u dışarı aktarıyoruz (DİKKAT: export ekledik)
export const posthog = new PostHog('phc_pycDtIYtVBRhY4fgDR0Ke4UN4ldYdjkHYXngyTM9itv', {
  host: 'https://us.i.posthog.com'
});

const Root = createNativeStackNavigator();

export default function App() {
  const [booting, setBooting] = useState(true);
  const [initialRoute, setInitialRoute] = useState("OnboardingFlow");

  useEffect(() => {
    // Uygulama açılış event'i
    posthog.capture('app_open');
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const done = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE);
        setInitialRoute(done === "1" ? "homeScreen" : "OnboardingFlow");
      } catch {
        setInitialRoute("OnboardingFlow");
      } finally {
        setBooting(false);
      }
    };
    init();
  }, []);

  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0B1220", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <OnboardingProvider>
        <NavigationContainer>
          <Root.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
            <Root.Screen name="OnboardingFlow" component={OnboardingNavigator} />
            <Root.Screen name="homeScreen" component={HomeScreen} />
            <Root.Screen name="settingsScreen" component={SettingsScreen} />
            <Root.Screen name="playScreen" component={PlayScreen} />
          </Root.Navigator>
        </NavigationContainer>
      </OnboardingProvider>
    </GestureHandlerRootView>
  );
}