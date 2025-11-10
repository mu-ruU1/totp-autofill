// content.js
(async () => {
  chrome.runtime.sendMessage(
    { type: "GET_TOTP_FOR_SITE", url: location.href },
    (response) => {
      if (!response?.otp || !response?.inputId) return;
      const input = document.getElementById(response.inputId);
      if (input) {
        input.value = response.otp;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        console.log(
          "[TOTP AutoFill] Input autofilled with code:",
          response.otp
        );
      }
    }
  );
})();
