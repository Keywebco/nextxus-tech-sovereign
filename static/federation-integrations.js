/* ============================================================
   FEDERATION INTEGRATION PACK v1 — vanilla JS, self-contained.
   - Floating "Federation Gemini" chat widget (bottom-right).
   - Talks to POST /api/gemini/chat on the same origin.
   - window.FED_THRONE === true adds the "Throne" badge (set BEFORE
     this script loads).
   - window.FederationAuth: documented NO-OP stubs awaiting the
     Architect's Google OAuth client ID. No fake sign-in UI.
   Progressive enhancement only — pages remain fully readable
   without this script.
   ============================================================ */
(function () {
  "use strict";

  /* ---------------- Google Sign-In hooks (STUBS) ----------------
     AWAITING ARCHITECT'S GOOGLE OAUTH CLIENT ID.
     These are intentional no-ops: they log an INFO line and do
     nothing else. Replace bodies once the OAuth client ID exists. */
  var authCallbacks = [];
  window.FederationAuth = {
    /** Begin Google Sign-In. NO-OP until OAuth client ID is configured. */
    signIn: function () {
      console.info("FederationAuth: Google Sign-In not configured — awaiting OAuth client ID");
      return null;
    },
    /** Register a callback for future auth events. Stored, never fired (stub). */
    onAuth: function (cb) {
      console.info("FederationAuth: Google Sign-In not configured — awaiting OAuth client ID");
      if (typeof cb === "function") authCallbacks.push(cb);
    },
  };

  /* ---------------- Chat widget ---------------- */
  var HISTORY_LIMIT = 6; // last N turns sent as context
  var history = [];

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text) node.textContent = text;
    return node;
  }

  function build() {
    var btn = el("button", {
      id: "fed-chat-btn",
      type: "button",
      "aria-label": "Open Federation Gemini chat",
      "aria-expanded": "false",
      "aria-controls": "fed-chat-panel",
      "data-testid": "fed-chat-button",
    }, "\u2726");

    var panel = el("div", {
      id: "fed-chat-panel",
      role: "dialog",
      "aria-label": "Federation Gemini chat",
      "data-testid": "fed-chat-panel",
    });

    var header = el("div", { class: "fed-chat-header" });
    header.appendChild(el("span", { "aria-hidden": "true" }, "\u2726"));
    header.appendChild(el("span", { "data-testid": "fed-chat-title" }, "Federation Gemini"));
    if (window.FED_THRONE === true) {
      header.appendChild(el("span", { class: "fed-chat-badge", "data-testid": "fed-chat-throne-badge" }, "Throne"));
    }
    var close = el("button", {
      class: "fed-chat-close",
      type: "button",
      "aria-label": "Close chat",
      "data-testid": "fed-chat-close",
    }, "\u00d7");
    header.appendChild(close);

    var messages = el("div", {
      class: "fed-chat-messages",
      role: "log",
      "aria-live": "polite",
      "data-testid": "fed-chat-messages",
    });

    var inputRow = el("div", { class: "fed-chat-inputrow" });
    var input = el("input", {
      id: "fed-chat-input",
      type: "text",
      placeholder: "Ask the Federation \u2026",
      "aria-label": "Message for Federation Gemini",
      maxlength: "2000",
      "data-testid": "fed-chat-input",
    });
    var send = el("button", {
      id: "fed-chat-send",
      type: "button",
      "aria-label": "Send message",
      "data-testid": "fed-chat-send",
    }, "\u27a4");
    inputRow.appendChild(input);
    inputRow.appendChild(send);

    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(inputRow);
    document.body.appendChild(btn);
    document.body.appendChild(panel);

    function escapeAndLinkify(text) {
      /* SAFE auto-linking: escape ALL html first, then wrap only http(s)
         URLs in anchors. Everything else stays inert text. */
      var div = document.createElement("div");
      div.textContent = text || "";
      var escaped = div.innerHTML;
      return escaped.replace(/(https?:\/\/[^\s<]*[^\s<.,)\]!?;:'"])/g, function (u) {
        return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + "</a>";
      });
    }

    function addMsg(text, who, pending) {
      var m = el("div", {
        class: "fed-chat-msg fed-chat-msg--" + who + (pending ? " fed-chat-msg--pending" : ""),
        "data-testid": "fed-chat-msg-" + who,
      });
      if (who === "bot") m.innerHTML = escapeAndLinkify(text);
      else m.textContent = text;
      messages.appendChild(m);
      messages.scrollTop = messages.scrollHeight;
      return m;
    }

    function toggle(open) {
      var isOpen = typeof open === "boolean" ? open : !panel.classList.contains("fed-open");
      panel.classList.toggle("fed-open", isOpen);
      btn.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) {
        if (!messages.childElementCount) {
          addMsg("Greetings, traveler. I am the Federation's Gemini guide \u2014 ask me about the Throne, the Store, Sovereign Tokens, or the Library.", "bot");
        }
        input.focus();
      }
    }

    btn.addEventListener("click", function () { toggle(); });
    close.addEventListener("click", function () { toggle(false); btn.focus(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("fed-open")) { toggle(false); btn.focus(); }
    });

    var busy = false;
    function submit() {
      var text = input.value.trim();
      if (!text || busy) return;
      busy = true;
      send.disabled = true;
      input.value = "";
      addMsg(text, "user");
      var pendingEl = addMsg("Consulting the constellation \u2026", "bot", true);

      fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: history.slice(-HISTORY_LIMIT) }),
      })
        .then(function (r) {
          if (r.status === 429) throw new Error("rate");
          if (!r.ok) throw new Error("http " + r.status);
          return r.json();
        })
        .then(function (data) {
          var reply = (data && data.reply) ||
            "The Gemini bridge is not yet connected.";
          pendingEl.classList.remove("fed-chat-msg--pending");
          pendingEl.innerHTML = escapeAndLinkify(reply);
          history.push({ role: "user", text: text });
          history.push({ role: "assistant", text: reply });
        })
        .catch(function (err) {
          pendingEl.classList.remove("fed-chat-msg--pending");
          pendingEl.textContent = err && err.message === "rate"
            ? "The constellation asks for a short pause \u2014 try again in a minute."
            : "The Gemini bridge is not yet connected.";
        })
        .finally(function () {
          busy = false;
          send.disabled = false;
          messages.scrollTop = messages.scrollHeight;
        });
    }

    send.addEventListener("click", submit);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
