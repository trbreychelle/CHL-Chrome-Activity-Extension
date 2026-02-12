// background.js
let lastActivity = Date.now();

// Track which tabs are your portal (attendance) tabs
const portalTabIds = new Set();

// Store latest user/session info coming from the portal tab
let currentSession = null; // { email, name, state }

const PORTAL_HOST_MATCHERS = [
  "callhammerleads",          // if hosted under this
  "call-hammer-attendance",   // repo name (sometimes in github pages urls)
  "chl",                      // optional
];

function isPortalUrl(url = "") {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const full = url.toLowerCase();
    return PORTAL_HOST_MATCHERS.some(k => host.includes(k) || full.includes(k));
  } catch {
    return false;
  }
}

async function refreshPortalTabs() {
  const tabs = await chrome.tabs.query({});
  portalTabIds.clear();
  for (const t of tabs) {
    if (t.id && isPortalUrl(t.url || "")) portalTabIds.add(t.id);
  }
}

// Keep portal tab list updated
chrome.runtime.onInstalled.addListener(refreshPortalTabs);
chrome.runtime.onStartup.addListener(refreshPortalTabs);

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || tab.url) {
    const url = changeInfo.url || tab.url || "";
    if (isPortalUrl(url)) portalTabIds.add(tabId);
    else portalTabIds.delete(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  portalTabIds.delete(tabId);
});

// Receive messages from content scripts (all tabs)
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || !msg.type) return;

  if (msg.type === "ACTIVITY") {
    lastActivity = Date.now();

    // Relay activity to ALL portal tabs so portal can reset idle
    for (const tabId of portalTabIds) {
      chrome.tabs.sendMessage(tabId, { type: "PORTAL_ACTIVITY", ts: lastActivity }).catch(() => {});
    }
  }

  // Portal tab reports who is logged in + current working state
  if (msg.type === "SESSION_UPDATE") {
    currentSession = msg.session || null;
  }
});

// Heartbeat to backend every 30s, but only if logged in + WORKING
setInterval(() => {
  if (!currentSession) return;
  if (currentSession.state !== "WORKING") return;

  fetch("https://automate.callhammerleads.com/webhook/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      email: currentSession.email || null,
      agent: currentSession.name || null,
      state: currentSession.state,
      lastActivityTs: lastActivity
    })
  }).catch(() => {});
}, 30000);
