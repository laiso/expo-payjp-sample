import { Button, Image, Platform, StyleSheet } from "react-native";

import { HelloWave } from "@/components/HelloWave";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import CreditCardForm from "@/components/ui/CreditCardForm";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";

const PAYJP_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYJP_PUBLIC_KEY;

export default function HomeScreen() {
  async function sendToken(token: string) {
    try {
      const response = await fetch(`/api/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
      if (response.ok) {
        const tds = await response.json();
        await WebBrowser.openBrowserAsync(tds.redirectUrl, {
          dismissButtonStyle: "close",
        });
        // router.push(tds.redirectUrl);
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">CreditCardForm</ThemedText>
        <CreditCardForm
          onTokenized={sendToken}
          onError={console.error}
          dom={{
            scrollEnabled: false,
            matchContents: true,
          }}
        />
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center", // Possible values: 'flex-start', 'flex-end', 'center', 'stretch', 'baseline'
    gap: 8,
    padding: 16,
    // height: "100%",
    // backgroundColor: "blue",
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
});
