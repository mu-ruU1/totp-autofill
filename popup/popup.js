// popup.js
async function refreshList() {
  const list = document.getElementById("totp-list");
  list.innerHTML = "";

  const { accounts } = await chrome.storage.local.get("accounts");
  (accounts || []).forEach((acc) => {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = acc.url;

    const btn = document.createElement("button");
    btn.textContent = "コピー";
    btn.addEventListener("click", async () => {
      const otp = await generateCurrentTOTP(acc.secret);
      await navigator.clipboard.writeText(otp);
      btn.textContent = "✓";
      setTimeout(() => (btn.textContent = "コピー"), 1000);
    });

    li.append(name, btn);
    list.appendChild(li);
  });
}

document.getElementById("open-settings").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("script/settings.html") });
});

refreshList();

// --- inline TOTP生成 ---
async function generateCurrentTOTP(base32) {
  const hex = base32ToHex(base32);
  return await generateTOTP(hex);
}

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
