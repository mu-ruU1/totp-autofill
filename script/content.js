document.getElementByXPath = function (sValue) {
  var a = this.evaluate(
    sValue,
    this,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  if (a.snapshotLength > 0) {
    return a.snapshotItem(0);
  }
};

document.getElementsByXPath = function (sValue) {
  var aResult = new Array();
  var a = this.evaluate(
    sValue,
    this,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  for (var i = 0; i < a.snapshotLength; i++) {
    aResult.push(a.snapshotItem(i));
  }
  return aResult;
};

document.removeElementsByXPath = function (sValue) {
  var a = this.evaluate(
    sValue,
    this,
    null,
    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  for (var i = 0; i < a.snapshotLength; i++) {
    a.snapshotItem(i).parentNode.removeChild(a.snapshotItem(i));
  }
};

function getInputElement(selector) {
  const byId = document.getElementById(selector);
  if (byId) return byId;

  const byXPath = document.getElementByXPath(selector);
  if (byXPath) return byXPath;

  const byFullXPath = document.getElementsByXPath(selector);
  if (byFullXPath) return byFullXPath;

  return null;
}

(async () => {
  chrome.runtime.sendMessage(
    { type: "GET_TOTP_FOR_SITE", url: location.href },
    (response) => {
      if (!response?.otp || !response?.inputId) return;

      const input = getInputElement(response.inputId);
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
