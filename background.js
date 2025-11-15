// Base32 → HEX
function base32ToHex(base32) {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  let hex = "";
  for (let i = 0; i < base32.length; i++) {
    const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
    bits += val.toString(2).padStart(5, "0");
  }
  for (let i = 0; i + 4 <= bits.length; i += 4) {
    hex += parseInt(bits.substring(i, i + 4), 2).toString(16);
  }
  return hex;
}

// TOTP生成
async function generateTOTP(secret) {
  const keyData = new Uint8Array(
    secret.match(/.{1,2}/g).map((b) => parseInt(b, 16))
  );
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const epoch = Math.floor(Date.now() / 1000);
  const time = Math.floor(epoch / 30);
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(4, time);

  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (binary % 10 ** 6).toString().padStart(6, "0");
}

function urlMatchesDomain(url, domain) {
  if (!domain) return false;

  domain = domain.trim().toLowerCase();

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    // 完全一致
    if (host === domain) return true;

    // サブドメイン対応
    // return host.endsWith("." + domain);
  } catch {
    return false;
  }
}

// content.js からのリクエストを受け取る
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "GET_TOTP_FOR_SITE") {
    chrome.storage.local.get("accounts", async (data) => {
      const accounts = data.accounts || [];
      const entry = accounts.find((acc) => urlMatchesDomain(req.url, acc.url));
      if (!entry) return sendResponse({ otp: null });

      const secretHex = base32ToHex(entry.secret);
      const otp = await generateTOTP(secretHex);
      sendResponse({ otp, inputId: entry.inputId });
    });
    return true; // 非同期レスポンス
  }
});
