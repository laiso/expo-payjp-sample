"use dom";

import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";

const PAYJP_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYJP_PUBLIC_KEY;

type Token = {
  id: string;
};

type Payjp = {
  createToken: (element: any, data?: any, options?: any) => Promise<Token>;
  elements: () => any;
};

declare global {
  interface Window {
    Payjp: (key: string, options?: any) => Payjp;
  }
}

type FormEvent = {
  empty: boolean;
  complete: boolean;
  error: {
    type: string;
    message: string;
    code: string;
  } | null;
  brand: string;
};

export default function CreditCardForm({
  onTokenized,
  onError,
  dom,
}: {
  onTokenized: (token: string) => void;
  onError: (error: any) => void;
  dom: import("expo/dom").DOMProps;
}) {
  const [payjp, setPayjp] = useState<Payjp | null>(null);
  const [cardElement, setCardElement] = useState<any | null>(null);
  
  const [isNumberComplete, setIsNumberComplete] = useState(false);
  const [isExpiryComplete, setIsExpiryComplete] = useState(false);
  const [isCvcComplete, setIsCvcComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.pay.jp/v2/pay.js";
    script.onload = () => {
      if (!PAYJP_PUBLIC_KEY) {
        throw new Error(
          "EXPO_PUBLIC_PAYJP_PUBLIC_KEY is not defined. Please set it in .env"
        );
      }
      const payjpInstance = window.Payjp(PAYJP_PUBLIC_KEY);
      setPayjp(payjpInstance);

      const elements = payjpInstance.elements();
      const numberElement = elements.create("cardNumber");
      const expiryElement = elements.create("cardExpiry");
      const cvcElement = elements.create("cardCvc");

      const handleNumberChange = (event: FormEvent) => {
        setErrorMessage(event.error ? event.error.message : null);
        setIsNumberComplete(event.complete);
      };

      const handleExpiryChange = (event: FormEvent) => {
        setErrorMessage(event.error ? event.error.message : null);
        setIsExpiryComplete(event.complete);
      };

      const handleCvcChange = (event: FormEvent) => {
        setErrorMessage(event.error ? event.error.message : null);
        setIsCvcComplete(event.complete);
      };

      numberElement.on("change", handleNumberChange);
      expiryElement.on("change", handleExpiryChange);
      cvcElement.on("change", handleCvcChange);

      numberElement.mount("#number-form");
      expiryElement.mount("#expiry-form");
      cvcElement.mount("#cvc-form");

      setCardElement(numberElement);
    };

    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (payjp && cardElement) {
      try {
        const token = await payjp.createToken(cardElement);
        console.log({token});
        onTokenized(token.id);
      } catch (error) {
        onError(error);
      }
    }
  }

  return (
    <div style={styles.container}>
      <form onSubmit={onSubmit}>
        <div style={styles.row}>
          <div id="number-form" style={styles.cardElement}></div>
        </div>
        <div style={styles.row}>
          <div id="expiry-form" style={styles.cardElement}></div>
          <div id="cvc-form" style={styles.cardElement}></div>
        </div>
        {errorMessage && <div style={styles.errorMessage}>{errorMessage}</div>}
        <div style={styles.buttonContainer}>
          <button
            type="submit"
            disabled={!(isNumberComplete && isExpiryComplete && isCvcComplete)}
            style={styles.button}
          >
            支払う
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    display: "flex",
    flexDirection: "row",
  },
  cardElement: {
    width: "100%",
    height: 40,
    paddingTop: 8,
    paddingBottom: 8,
  },
  buttonContainer: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  button: {
    width: "100%",
    height: 50,
    fontSize: 16,
  },
  errorMessage: {
    color: "red",
    paddingTop: 8,
  },
});
