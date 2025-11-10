// settings.js
async function refreshList() {
  const list = document.getElementById("account-list");
  list.innerHTML = "";

  const { accounts } = await chrome.storage.local.get("accounts");
  (accounts || []).forEach((acc, index) => {
    const li = document.createElement("li");
    li.textContent = `${acc.url} (ID: ${acc.inputId})`;
    const del = document.createElement("button");
    del.textContent = "削除";
    del.addEventListener("click", async () => {
      accounts.splice(index, 1);
      await chrome.storage.local.set({ accounts });
      refreshList();
    });
    li.appendChild(del);
    list.appendChild(li);
  });
}

document.getElementById("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = document.getElementById("url").value.trim();
  const secret = document.getElementById("secret").value.trim();
  const inputId = document.getElementById("inputId").value.trim();

  const { accounts } = await chrome.storage.local.get("accounts");
  const newList = accounts || [];
  newList.push({ url, secret, inputId });

  await chrome.storage.local.set({ accounts: newList });
  e.target.reset();
  refreshList();
});

refreshList();
