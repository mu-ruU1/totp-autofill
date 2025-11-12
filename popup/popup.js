document.addEventListener("DOMContentLoaded", () => {
  refreshList();
  startCountdown();
  document.getElementById("open-settings").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("script/settings.html") });
  });
});

// ----------------------
// TOTP 一覧の表示
// ----------------------
async function refreshList() {
  const list = document.getElementById("totp-list");
  const { accounts = [] } = await chrome.storage.local.get("accounts");

  list.innerHTML = accounts
    .map(
      (acc) => `
    <li>
      <span>${acc.url}</span>
      <code>------</code>
      <button>コピー</button>
    </li>
  `
    )
    .join("");

  // 各ボタンとコードを設定
  [...list.querySelectorAll("li")].forEach((li, i) => {
    const code = li.querySelector("code");
    const btn = li.querySelector("button");
    const acc = accounts[i];

    // コピー処理
    btn.addEventListener("click", async () => {
      const otp = await generateCurrentTOTP(acc.secret);
      await navigator.clipboard.writeText(otp);
      btn.textContent = "✓";
      setTimeout(() => (btn.textContent = "コピー"), 1000);
    });

    // 初回更新
    updateTOTPCode(acc.secret, code);
  });
}

//
// 残り秒数表示とTOTP更新
let intervalId;

function startCountdown() {
  clearInterval(intervalId);

  const updateCountdown = async () => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = 30 - (now % 30);

    document.getElementById(
      "countdown"
    ).textContent = `更新まで: ${remaining}s`;

    if (remaining === 30) {
      refreshCodesOnly();
    }
  };

  // 最初の1回を即時実行
  updateCountdown();

  // その後は1秒ごとに更新
  intervalId = setInterval(updateCountdown, 1000);
}

async function refreshCodesOnly() {
  const { accounts } = await chrome.storage.local.get("accounts");
  const accountList = accounts || [];
  const codes = document.querySelectorAll("#totp-list code");

  for (let i = 0; i < accountList.length; i++) {
    const acc = accountList[i];
    if (codes[i]) await updateTOTPCode(acc.secret, codes[i]);
  }
}

async function updateTOTPCode(secret, el) {
  const otp = await generateCurrentTOTP(secret);
  el.textContent = otp;
}

// ----------------------
// TOTP生成ロジック
// ----------------------
function base32ToHex(base32) {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  let hex = "";
  for (let i = 0; i < base32.length; i++) {
    const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  for (let i = 0; i + 4 <= bits.length; i += 4) {
    hex += parseInt(bits.substring(i, i + 4), 2).toString(16);
  }
  return hex;
}

async function generateCurrentTOTP(base32) {
  const hex = base32ToHex(base32);
  return await generateTOTP(hex);
}

async function generateTOTP(secretHex) {
  const keyData = new Uint8Array(
    secretHex.match(/.{1,2}/g).map((b) => parseInt(b, 16))
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
