import { useState } from "react";
import { StyleSheet, Button, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useLocalSearchParams } from "expo-router";

export default function ConfirmScreen() {
  const localParams = useLocalSearchParams() as { cid?: string };
  const [isPurchased, setIsPurchased] = useState(false);

  async function retrieveCharge(cid: string) {
    try {
      const response = await fetch(`/api/charge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cid: localParams.cid }),
      });
      console.log({ response });
      if (response.ok) {
        setIsPurchased(true);
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">
          {isPurchased ? "支払いが完了しました" : "購入を確認してください"}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText>
          {isPurchased ? "この画面を閉じてください" : localParams.cid}
        </ThemedText>
        {!isPurchased && (
          <View style={styles.buttonContainer}>
            <Button
              title="購入する"
              onPress={async () => {
                if (localParams.cid) {
                  await retrieveCharge(localParams.cid);
                }
              }}
            />
          </View>
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: "center",
  },
});
