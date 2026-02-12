function reportActivity() {
    chrome.runtime.sendMessage({ type: "USER_ACTIVE" });
}

// Listen to real user actions
["mousemove", "keydown", "click", "scroll"].forEach(event => {
    document.addEventListener(event, reportActivity, true);
});
