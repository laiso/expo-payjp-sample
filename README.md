# Expoアプリでpayjp.js v2を使い独自のカードフォームを作成する

## はじめに：ExpoでもPAY.JP SDKを使いたい！
Expoアプリでカードフォームを組み込む際には、通常PAY.JP SDK React Nativeプラグインを利用します。
しかし、ExpoのManaged workflowでは、ネイティブモジュールを含むPAY.JP SDK React Nativeプラグインを利用できません。
公式ドキュメントにも「プラグインにはネイティブモジュールが含まれているため、現時点ではExpoのManaged workflowには対応していません」と明記されており、PAY.JP SDKを利用するためにBare workflowへの移行が必要になります。
Bare workflowではExpo Goへのデプロイができなくなり、アプリのネイティブコードのコンパイルから自分で管理しなければならないため、Expoの軽量さを活かした開発を求める場合には適していません。

そこで、代替手段としてブラウザ向けのpayjp.js v2とExpo SDK 52から提供される"use dom"ディレクティブで有効になるDOMコンポーネントを活用する方法があります。
"use dom"を利用することで、ブラウザ環境のJSライブラリをExpoアプリ内で動作させることが可能になります。
ExpoのManaged workflowの環境を維持しながら、自由にカスタマイズ可能なカード決済フォームを実現できます。

## "use dom"について
ExpoアプリにおけるWebコンポーネントとネイティブコンポーネントの連携は、従来はreact-native-webviewを使用してHTMLを直接渡すことで実現していました。
しかし、この方法では、Webコンポーネントとネイティブコンポーネント間のデータのやり取りやデバッグ、ルーティングなどに課題がありました。
この課題を解決するために登場したのが、Expo SDK 52で提供される"use dom"ディレクティブによって定義されるDOMコンポーネントです。

"use dom"使用すると、ExpoアプリでReact DOMコンポーネントを内部WebViewにシームレスにレンダリングでき、Webとネイティブの間の統合が自動的に行われます。
たとえば、"use dom"を宣言したコンポーネントをReact Nativeコンポーネントの内に組み込むと、react-native-webviewを内部で利用しながら、アプリ画面の一部としてレンダリングされます。

### 利点
- 個別にWebViewに表示するページ用のバンドルを用意する必要がなく、Expoアプリのコードベース内の1コンポーネントとして共有化できる
- また、Expo Routerとも統合されており、Webコンポーネントからネイティブアプリ側の画面遷移を直接操作できる
- React Nativeコンポーネントからのpropsを通じたネイティブ←→WebView間のデータ受け渡しも可能

## payjp.js v2の概要
payjp.js v2は、ブラウザ向けのJavaScriptライブラリであり、最新のPCI-DSSに準拠したカード情報入力フォームの生成と、カード情報をトークン化するための安全なAPIを提供します。
このライブラリはscriptタグとして読み込む形式で提供され、内部的にはiframeを使用して動作します。
iframeを利用することで、カード情報の入力と処理はすべてPAY.JPのサーバー上で行われるため、加盟店側ではトークン化された安全なデータのみを取り扱う仕組みとなっています。

さらにpayjp.js v2ではJavaScript APIが提供されており、このAPIを活用することでカードフォームの内容やデザインを柔軟にカスタマイズできます。
たとえば、カード入力フォームをstyleオブジェクトを使ってフォームの要素（文字色、フォント、背景色など）を変更したり、ユーザーの入力に応じてフォームの表示を変更したり、動的なイベント処理を追加することが可能です。

## CreditCardFormコンポーネントの作成
本サンプルアプリでは"use dom"を活用し、payjp.js v2をWebView経由でロードしてカード入力フォームをアプリに埋め込みます。
この実装では、CreditCardFormというDOMコンポーネントを作成し、その中でpayjp.js v2を動作させることで、フォームの入力からトークン化までのプロセスを実現します。

```tsx:components/ui/CreditCardForm.tsx
"use dom";

import React, { useEffect, useState } from "react";

const PAYJP_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYJP_PUBLIC_KEY;

export default function CreditCardForm({ onTokenized, onError, dom }: {
  onTokenized: (token: string) => void;
  onError: (error: any) => void;
  dom: import("expo/dom").DOMProps;
}) {
  const [payjp, setPayjp] = useState<Payjp | null>(null);
  const [cardElement, setCardElement] = useState<any>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.pay.jp/v2/pay.js";
    script.onload = () => {
      if (!PAYJP_PUBLIC_KEY) {
        throw new Error("EXPO_PUBLIC_PAYJP_PUBLIC_KEY is not defined. Please set it in .env");
      }
      const payjpInstance = window.Payjp(PAYJP_PUBLIC_KEY);
      setPayjp(payjpInstance);

      const elements = payjpInstance.elements();
      const cardElementInstance = elements.create("card");
      cardElementInstance.mount("#card-element");
      setCardElement(cardElementInstance);
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
        console.log(token);
        onTokenized(token.id);
      } catch (error) {
        onError(error);
      }
    }
  }

  return (
    <div style={styles.container}>
      <form onSubmit={onSubmit}>
        <div
          id="card-element"
          style={styles.cardElement}
        ></div>
        <div style={styles.buttonContainer}>
          <button type="submit" style={styles.button}>
            支払う
          </button>
        </div>
      </form>
    </div>
  );
}
```

EXPO_PUBLIC_PAYJP_PUBLIC_KEYは`.env`ファイルに記述しておくとExpoによって環境変数として読み込まれます。

```.env
EXPO_PUBLIC_PAYJP_PUBLIC_KEY=pk_test_XXXXXXXX
```

## CreditCardFormコンポーネントの利用

以下のように、CreditCardFormコンポーネントを画面のrouteに組み込むと、アプリ起動時にカードフォームが表示されます

```tsx:app/(tabs)/index.tsx
export default function HomeScreen() {
  async function sendToken(token: string) {
    // TODO
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
        // ↓↓↓ここだけWebViewになる↓↓↓
        <CreditCardForm
          onTokenized={sendToken}
          onError={console.error}
          dom={{ 
            scrollEnabled: false,
            matchContents: true 
          }}
        />
        // ↑↑↑ここだけWebViewになる↑↑↑
      </ThemedView>
    </ParallaxScrollView>
  );
}
```

起動後には、デフォルトのカード入力フォームが表示されるのを確認できます
TODO：（図参照）。
「支払い」ボタンをタップすると、payjp.js v2の`createToken()`によってユーザーが入力したカード情報がトークン化されます。
このトークンを`sendToken()`で送信して、サーバーサイドでの決済処理に使用します。

```tsx:app/(tabs)/index.tsx
  async function sendToken(token: string) {
    try {
      const response = await fetch(`/api/charge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
      const json = await response.json();
      console.log(json);
    } catch (error) {
      console.error(error);
    }
  }
```

ポイントとしては
- CreditCardFormコンポーネントはWebViewにレンダリングされる
- `sendToken()`はReact Nativeアプリ側で実行される
という点です。

WebViewの中で`fetch(`/api/charge`)`を呼んでAPI通信を行うことができますが、ネイティブに寄せることができるのならば、開発のしやすさやパフォーマンスの観点から、ネイティブ側で行うことが望ましいです。

## サーバーサイドの実装
ExpoのルーティングライブラリであるExpo RouterのAPI Routes機能を活用することで、サーバーサイドのAPIを実装できます。
この機能はWeb版アプリのバックエンドとして機能し、モバイルアプリからはWeb APIとして呼び出すことが可能です。
具体的には、POST /api/chargeというエンドポイントを追加し、このエンドポイントでpayjp-nodeを使用して決済処理を実行します。
このエンドポイントをExpo Routerで定義することで、フロントエンドアプリからサーバーサイドAPIへのリクエストをExpoアプリですべて行えるようになります。

```bash
$ npm install payjp
```

```typescript:api/charge+api.ts
import Payjp from "payjp";

const PAYJP_SECRET = "sk_test_XXX";

export async function POST(request: Request) {
    const body = await request.json();
    
    const payjp = Payjp(PAYJP_SECRET);
    try {
        const charge = await payjp.charges.create({
            amount: 100, // TODO: 決済金額を指定
            currency: "jpy",
            card: body.token,
        });
        return Response.json({ charge });
    } catch (error) {
        console.error(error);
        return Response.json({ error });
    }
}
```

PAYJP_SECRETは本番環境では環境変数経由で設定するとよいでしょう。
注意点としてはEXPO_PUBLIC_でPAYJP_SECRETを設定すると、クライアントサイドからも参照可能になるため避けましょう。
実際のサーバーをデプロイする環境（VercelやDocker系）が推奨するSecrets管理機能を利用するとよいでしょう。

API RoutesはExpo Webのサーバーサイド機能なのでapp.jsonの設定を変更します。

```diff:app.json
{
  "expo": {
    "web": {
      "bundler": "metro",
-      "output": "static",
+      "output": "server",
      "favicon": "./assets/images/favicon.png"
    },
  }
}
```

試しにcurlコマンドを使ってAPIを呼び出してみましょう。トークンがダミーであるため、エラーレスポンスが返されるはずです。

```bash
$ curl -X POST http://localhost:8081/api/charge -H "Content-Type: application/json" -d '{"token":"tok_XXXXXXXX"}'
```

これで、Expoアプリ内でpayjp.js v2を使用したカード入力フォームを実装し、サーバーサイドでの決済処理を行うことができました。

`http://localhost:8081`というURLはExpo Webの開発サーバーのデフォルトのURLです。実機からこのAPIにアクセスできるようにするには、app.jsonにoriginを設定します。

```json:app.json
    "plugins": [
      [
        "expo-router",
        {
          "origin": "http://192.168.1.38:8081"
        }
      ]
    ],
```

このIPアドレスは`expo start`を実行した際に表示されるQRコードの下に表示されるLANアドレスです。
本番環境にデプロイした場合は、そのURLを記述して、開発時は環境変数を使って切り替えるとよいでしょう。

## 決済処理完了後の画面遷移

決済処理が完了したら、ユーザーを別の画面にリダイレクトすることが一般的です。
Expo Routerを使用して、決済処理が成功した場合には"/success"に移動して、失敗した場合には`console.error()`で画面にエラーメッセージが表示されるようにします。

```diff:app/(tabs)/index.tsx
+ import { router } from "expo-router";

  async function sendToken(token: string) {
    try {
      const response = await fetch(`/api/charge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
      const json = await response.json();
      console.log(json);
+      router.push("/success");
    } catch (error) {
      console.error(error);
    }
  }
```


## フォームのカスタマイズ

payjp.js v2のJavaScript APIを活用することで、カード入力フォームのデザインや動作をカスタマイズすることが可能です。

### カード番号・有効期限・セキュリティコードの入力を分割する

カード番号、有効期限、セキュリティコードをそれぞれ独立した入力フォームとして扱うことができます。

デフォルトのカード入力フォームでは、カード番号、有効期限、セキュリティコードが1つのElementにまとめられています。
これをモバイルアプリのUIに合わせて、2段に分割して表示するように変更します。

```tsx:components/ui/CreditCardForm.tsx
const elements = payjpInstance.elements();
const numberElement = elements.create("cardNumber");
const expiryElement = elements.create("cardExpiry");
const cvcElement = elements.create("cardCvc");

numberElement.mount("#number-element");
expiryElement.mount("#expiry-element");
cvcElement.mount("#cvc-element");
```

マウント先を以下のように変更します。

```tsx:components/ui/CreditCardForm.tsx
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
        <div style={styles.buttonContainer}>
          <button
            type="submit"
            style={styles.button}
          >
            支払う
          </button>
        </div>
      </form>
    </div>
  );
```

stylesはreact-nativeの機能です。DOMコンポーネントはExpoのWeb版と同じをMetroバンドラ使用しているため、react-nativeのスタイルをそのまま利用できます。

```tsx:components/ui/CreditCardForm.tsx
import { StyleSheet } from "react-native";

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
});
```

### バリデーション：エラーメッセージの表示

payjp.js v2ではフォームの入力イベントを監視し、任意の処理を追加できます。
これを利用して、ユーザーのカード情報の入力に問題がある場合にエラーメッセージを表示するようにします。
またすべての入力が正常に完了した時点で「支払い」ボタンを有効化します。

```tsx:components/ui/CreditCardForm.tsx
const [isNumberComplete, setIsNumberComplete] = useState(false);
const [isExpiryComplete, setIsExpiryComplete] = useState(false);
const [isCvcComplete, setIsCvcComplete] = useState(false);
const [errorMessage, setErrorMessage] = useState<string | null>(null);
```

```tsx:components/ui/CreditCardForm.tsx
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
```

```tsx:components/ui/CreditCardForm.tsx
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
        {errorMessage && (
          <div style={styles.errorContainer}>
            <span style={styles.errorText}>{errorMessage}</span>
          </div>
        )}
        <div style={styles.buttonContainer}>
          <button
            type="submit"
            style={{ ...styles.button, opacity: isNumberComplete && isExpiryComplete && isCvcComplete ? 1 : 0.5 }}
            disabled={!isNumberComplete || !isExpiryComplete || !isCvcComplete}
          >
            支払う
          </button>
        </div>
      </form>
    </div>
  );
```

```tsx:components/ui/CreditCardForm.tsx
  errorContainer: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  errorText: {
    color: "red",
  },
```