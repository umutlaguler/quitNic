import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./storage/keys";

const OnboardingContext = createContext(null);

const DEFAULT_DATA = {
  productType: null,   // "cigarettes" | "vaping" | "heated_tobacco"
  quitDateISO: null,   // ISO string
  dailyCost: null,     // number ($/day)
};

export function OnboardingProvider({ children }) {
  const [data, setData] = useState(DEFAULT_DATA);
  const [hydrated, setHydrated] = useState(false);

  // 1) App açılınca AsyncStorage’dan oku (hydrate)
  useEffect(() => {
    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DATA);
        if (raw) {
          const parsed = JSON.parse(raw);
          setData({ ...DEFAULT_DATA, ...parsed });
        }
      } catch (e) {
        // bozuk json vs olursa default ile devam
        setData(DEFAULT_DATA);
      } finally {
        setHydrated(true);
      }
    };
    hydrate();
  }, []);

  // 2) Data değişince AsyncStorage’a yaz (persist)
  useEffect(() => {
    if (!hydrated) return; // hydrate olmadan yazma, yoksa default overwrite eder
    const persist = async () => {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEYS.ONBOARDING_DATA,
          JSON.stringify(data)
        );
      } catch (e) {
        // storage dolu vs — burada istersen log alırız
      }
    };
    persist();
  }, [data, hydrated]);

  const update = (patch) => {
    setData((prev) => ({ ...prev, ...patch }));
  };

  const resetAll = async () => {
    setData(DEFAULT_DATA);
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_DONE);
    } catch {}
  };

  const markOnboardingDone = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, "1");
    } catch {}
  };

  const value = useMemo(
    () => ({
      data,
      update,
      hydrated,
      resetAll,
      markOnboardingDone,
    }),
    [data, hydrated]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
