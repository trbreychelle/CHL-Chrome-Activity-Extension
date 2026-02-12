// content.js

// ✅ Global activity capture (any tab)
let lastActivity = Date.now();
function notifyActivity() {
  lastActivity = Date.now();
  chrome.runtime.sendMessage({ type: "ACTIVITY", ts: lastActivity });
}
["mousemove", "keydown", "scroll", "click"].forEach(ev => {
  document.addEventListener(ev, notifyActivity, true);
});

// ✅ Portal detection
const PORTAL_HOST_MATCHERS = ["callhammerleads", "call-hammer-attendance", "chl"];
function isPortalPage() {
  const host = (location.hostname || "").toLowerCase();
  const full = location.href.toLowerCase();
  return PORTAL_HOST_MATCHERS.some(k => host.includes(k) || full.includes(k));
}

// ✅ If this is the portal tab, accept relayed activity + keep session state updated
if (isPortalPage()) {
  // Receive forwarded activity from background and store it where index.html can read it
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "PORTAL_ACTIVITY") {
      try {
        localStorage.setItem("chl_last_activity", String(msg.ts || Date.now()));
      } catch {}
    }
  });

  // Push session updates (who is logged in + state) to background
  function sendSessionUpdate() {
    try {
      const raw = localStorage.getItem("chl_session");
      if (!raw) {
        chrome.runtime.sendMessage({ type: "SESSION_UPDATE", session: null });
        return;
      }
      const s = JSON.parse(raw);
      const session = {
        email: s?.user?.email || null,
        name: s?.user?.name || null,
        state: s?.currentState || "OFFLINE"
      };
      chrome.runtime.sendMessage({ type: "SESSION_UPDATE", session });
    } catch {
      chrome.runtime.sendMessage({ type: "SESSION_UPDATE", session: null });
    }
  }

  // Run immediately + every 5s
  sendSessionUpdate();
  setInterval(sendSessionUpdate, 5000);

  // Also update when this tab changes its own storage
  window.addEventListener("focus", sendSessionUpdate);
}
