import jwt from "jsonwebtoken";
import Payjp from "payjp";

const PAYJP_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYJP_PUBLIC_KEY;
const PAYJP_SECRET = process.env.PAYJP_SECRET;

function generateJwtUrl(
  baseUrl: string,
  params: Record<string, string>,
  secretKey: string
) {
  const encodedParams = Object.keys(params)
    .map((key) => `${key}=${encodeURIComponent(params[key])}`)
    .join("&");

  const encodedUrl = `${baseUrl}?${encodedParams}`;

  const payload = {
    url: encodedUrl,
  };

  return jwt.sign(payload, secretKey, { algorithm: "HS256" });
}

export async function POST(request: Request) {
  const body = await request.json();
  console.log(!PAYJP_PUBLIC_KEY || !PAYJP_SECRET);

  if (!PAYJP_PUBLIC_KEY || !PAYJP_SECRET) {
    return Response.json({
      error: "PAYJP_PUBLIC_KEY and PAYJP_SECRET is not defined.",
    });
  }

  const payjp = Payjp(PAYJP_SECRET);
  try {
    const charge = await payjp.charges.create({
      amount: 100, // TODO
      currency: "jpy",
      card: body.token,
      three_d_secure: true,
    });
    // const baseUrl = request.url.split("/api/")[0];
    const baseUrl = "expo-payjp.example.com:/";
    const queryParams = {
      cid: charge.id
    };

    const jwtUrl = generateJwtUrl(baseUrl + "/confirm/", queryParams, PAYJP_SECRET);

    const redirectUrl = `https://api.pay.jp/v1/tds/${charge.id}/start?publickey=${PAYJP_PUBLIC_KEY}&back_url=${jwtUrl}`;

    return Response.json({ redirectUrl });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
