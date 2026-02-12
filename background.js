let lastActivity = Date.now();

// Receive activity from all tabs
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "USER_ACTIVE") {
        lastActivity = Date.now();
    }
});

// Send heartbeat to backend every 30 seconds
setInterval(() => {
    fetch("https://automate.callhammerleads.com/webhook/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            timestamp: new Date().toISOString(),
            lastActivity
        })
    });
}, 30000);
