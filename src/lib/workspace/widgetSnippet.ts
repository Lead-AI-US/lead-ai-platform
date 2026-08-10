/**
 * Minimal, functional reference widget - a floating chat bubble that calls
 * POST /api/chat directly. This is a real, working integration against the
 * real /api/chat contract (see docs/WIDGET.md), not a mockup - but it is a
 * plain inline script, not a polished/branded embeddable bundle. Treat it
 * as the reference implementation a real widget UI would replace.
 */
export function widgetSnippet(publicWidgetKey: string): string {
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "https://app.lead-ai.us";

  return `<script>
(function () {
  var API = "${appOrigin}/api/chat";
  var WIDGET_KEY = "${publicWidgetKey}";
  var sessionKey = "leadai_visitor_session";
  var visitorSessionId = localStorage.getItem(sessionKey);
  if (!visitorSessionId) {
    visitorSessionId = crypto.randomUUID();
    localStorage.setItem(sessionKey, visitorSessionId);
  }
  var conversationId = null;

  var bubble = document.createElement("button");
  bubble.textContent = "Chat";
  bubble.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:999999;border-radius:9999px;padding:12px 18px;background:#111827;color:#fff;border:none;cursor:pointer;font:14px system-ui;";
  var panel = document.createElement("div");
  panel.style.cssText = "position:fixed;bottom:76px;right:20px;width:320px;max-height:420px;display:none;flex-direction:column;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font:14px system-ui;z-index:999999;";
  var log = document.createElement("div");
  log.style.cssText = "flex:1;overflow-y:auto;padding:12px;";
  var form = document.createElement("form");
  form.style.cssText = "display:flex;border-top:1px solid #e5e7eb;";
  var input = document.createElement("input");
  input.placeholder = "Ask a question…";
  input.style.cssText = "flex:1;border:none;padding:10px;outline:none;";
  var send = document.createElement("button");
  send.textContent = "Send";
  send.style.cssText = "border:none;background:#111827;color:#fff;padding:0 14px;cursor:pointer;";

  form.appendChild(input);
  form.appendChild(send);
  panel.appendChild(log);
  panel.appendChild(form);
  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  bubble.onclick = function () {
    panel.style.display = panel.style.display === "flex" ? "none" : "flex";
  };

  function addMessage(role, text) {
    var row = document.createElement("div");
    row.style.cssText = "margin-bottom:8px;" + (role === "visitor" ? "text-align:right;" : "");
    row.textContent = text;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  form.onsubmit = function (e) {
    e.preventDefault();
    var message = input.value.trim();
    if (!message) return;
    addMessage("visitor", message);
    input.value = "";

    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetKey: WIDGET_KEY, conversationId: conversationId, visitorSessionId: visitorSessionId, message: message }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.conversationId) conversationId = data.conversationId;
        addMessage("assistant", data.reply || "Something went wrong.");
      })
      .catch(function () {
        addMessage("assistant", "Something went wrong. Please try again.");
      });
  };
})();
</script>`;
}
