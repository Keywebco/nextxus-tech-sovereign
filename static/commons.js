/* NEXUS THRONE — Commons Rooms · Builder Prompt 4
 *
 * Shared component, built ONCE, instantiated on each AI page via:
 *   <div id="commons-root" data-room="pontus" data-room-name="Pontus Commons" data-icon="🎭"></div>
 *
 * PIGEON PROTOCOL: every record the backend stores carries the seven fields
 * VERBATIM — FROM / TO / VIA / DATE / TYPE / SUBJECT / BODY — with only
 * `id` and `parent_id` alongside for threading. This file never invents shape.
 *
 * SAFETY: all user content is rendered via createElement + textContent only.
 * No innerHTML with user data anywhere — XSS-inert by construction.
 *
 * LAW: voluntary posts only. This script does not scrape, does not touch AI
 * windows, does not pull conversations. It receives what a person types.
 */
(function () {
  'use strict';

  var root = document.getElementById('commons-root');
  if (!root) { return; }

  var ROOM = root.getAttribute('data-room');
  var ROOM_NAME = root.getAttribute('data-room-name');
  var ICON = root.getAttribute('data-icon') || '\u2726';
  var API = '/api/commons/' + encodeURIComponent(ROOM);
  var NAME_KEY = 'nx_commons_name';
  var COLLAPSE_AT = 1200; // chars — longer bodies collapse behind an expander

  /* ---------------- helpers ---------------- */

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  function testid(node, id) {
    node.setAttribute('data-testid', id);
    return node;
  }

  function fmtDate(iso) {
    // "2026-09-24T22:41:00Z" -> "2026-09-24 · 22:41 UTC"
    var m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso || '');
    return m ? m[1] + ' \u00b7 ' + m[2] + ' UTC' : (iso || '');
  }

  function getSavedName() {
    try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; }
  }

  function rememberName(name) {
    try { localStorage.setItem(NAME_KEY, name); } catch (e) { /* private mode */ }
  }

  function field(labelText, control) {
    var wrap = el('div', 'commons-field');
    wrap.appendChild(el('label', 'throne-label', labelText));
    wrap.appendChild(control);
    return wrap;
  }

  function setStatus(node, msg, ok) {
    node.textContent = msg || '';
    node.classList.remove('is-error', 'is-ok');
    if (msg) { node.classList.add(ok ? 'is-ok' : 'is-error'); }
  }

  function send(payload, statusNode, button, onSuccess) {
    setStatus(statusNode, '');
    button.disabled = true;
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 429) {
          throw new Error(data.error || 'The room asks for a slower pace \u2014 six posts a minute. Try again shortly.');
        }
        if (!res.ok || !data.ok) {
          var msg = data.error;
          if (!msg && data.detail) {
            msg = (typeof data.detail === 'string')
              ? data.detail
              : 'That did not pass the room\u2019s checks \u2014 look over the fields and try again.';
          }
          throw new Error(msg || 'The room could not accept that. Try again.');
        }
        return data;
      });
    }).then(function (data) {
      rememberName(payload.from);
      onSuccess(data);
    }).catch(function (err) {
      setStatus(statusNode, err.message, false);
    }).then(function () {
      button.disabled = false;
    });
  }

  /* ---------------- body rendering (with transcript expander) ---------------- */

  function renderBody(text) {
    var wrap = el('div', 'commons-body-wrap');
    var body = el('div', 'commons-body', text);
    wrap.appendChild(body);
    if (text.length > COLLAPSE_AT) {
      body.classList.add('is-collapsed');
      var btn = testid(el('button', 'commons-expander', 'SHOW FULL TRANSCRIPT \u25be'), 'commons-expander');
      btn.type = 'button';
      btn.addEventListener('click', function () {
        var collapsed = body.classList.toggle('is-collapsed');
        btn.textContent = collapsed ? 'SHOW FULL TRANSCRIPT \u25be' : 'COLLAPSE TRANSCRIPT \u25b4';
      });
      wrap.appendChild(btn);
    }
    return wrap;
  }

  /* ---------------- reply form ---------------- */

  function buildReplyForm(post, onDone) {
    var rf = testid(el('form', 'commons-reply-form'), 'commons-reply-form');

    var rname = testid(el('input', 'throne-input'), 'commons-reply-name-input');
    rname.type = 'text'; rname.maxLength = 80;
    rname.placeholder = 'Who replies'; rname.value = getSavedName();

    var rbody = testid(el('textarea', 'throne-textarea commons-reply-body'), 'commons-reply-body-input');
    rbody.maxLength = 20000; rbody.placeholder = 'Your reply\u2026';

    var rbtn = testid(el('button', 'throne-btn throne-btn--primary', 'POST REPLY'), 'commons-reply-submit');
    rbtn.type = 'submit';

    var rstatus = testid(el('p', 'commons-status'), 'commons-reply-status');

    rf.appendChild(field('NAME', rname));
    rf.appendChild(field('REPLY', rbody));
    rf.appendChild(rbtn);
    rf.appendChild(rstatus);

    rf.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var name = rname.value.trim();
      var body = rbody.value.trim();
      if (!name) { setStatus(rstatus, 'A name is required \u2014 words under a name are theirs or they aren\u2019t there.', false); return; }
      if (!body) { setStatus(rstatus, 'The reply is empty.', false); return; }
      send({ from: name, to: ROOM_NAME, type: 'reply', parent_id: post.id, body: body },
        rstatus, rbtn, function () {
          onDone();
          loadFeed();
        });
    });
    return rf;
  }

  /* ---------------- post rendering ---------------- */

  function renderPost(post) {
    var art = testid(el('article', 'commons-post'), 'commons-post');
    art.setAttribute('data-post-id', post.id);

    var meta = el('div', 'commons-meta');
    meta.appendChild(el('span', 'commons-from', post.FROM));
    meta.appendChild(el('span', 'commons-date', fmtDate(post.DATE)));
    art.appendChild(meta);

    art.appendChild(el('h3', 'commons-subject', post.SUBJECT));
    art.appendChild(renderBody(post.BODY));

    var replies = el('div', 'commons-replies');
    (post.replies || []).forEach(function (r) {
      var rep = testid(el('div', 'commons-reply'), 'commons-reply');
      var rmeta = el('div', 'commons-meta');
      rmeta.appendChild(el('span', 'commons-from', r.FROM));
      rmeta.appendChild(el('span', 'commons-date', fmtDate(r.DATE)));
      rep.appendChild(rmeta);
      rep.appendChild(renderBody(r.BODY));
      replies.appendChild(rep);
    });
    art.appendChild(replies);

    var replyBtn = testid(el('button', 'throne-btn throne-btn--chip commons-reply-toggle', 'REPLY'), 'commons-reply-toggle');
    replyBtn.type = 'button';
    art.appendChild(replyBtn);

    var rform = null;
    replyBtn.addEventListener('click', function () {
      if (rform) {
        rform.remove(); rform = null;
        replyBtn.textContent = 'REPLY';
        return;
      }
      rform = buildReplyForm(post, function () { /* feed reload re-renders all */ });
      art.insertBefore(rform, replyBtn);
      replyBtn.textContent = 'CANCEL';
      rform.querySelector('textarea').focus();
    });

    return art;
  }

  /* ---------------- feed ---------------- */

  function renderFeed(posts) {
    feed.textContent = '';
    if (!posts.length) {
      var empty = testid(el('div', 'commons-empty'), 'commons-empty');
      empty.appendChild(el('p', null, 'The room is empty \u2014 honestly empty. No seeded words, ever.'));
      empty.appendChild(el('p', null, 'Come back from a conversation and write its first page.'));
      feed.appendChild(empty);
      return;
    }
    for (var i = 0; i < posts.length; i++) {
      feed.appendChild(renderPost(posts[i]));
    }
  }

  function loadFeed() {
    fetch(API).then(function (res) { return res.json(); }).then(function (data) {
      renderFeed(data.posts || []);
    }).catch(function () {
      feed.textContent = '';
      feed.appendChild(testid(el('p', 'commons-status is-error',
        'The room could not be reached. Reload to try again.'), 'commons-load-error'));
    });
  }

  /* ---------------- shell assembly ---------------- */

  var panel = testid(el('section', 'commons-room throne-panel'), 'commons-room');
  panel.setAttribute('aria-label', ROOM_NAME);

  panel.appendChild(testid(el('h2', 'commons-title', ICON + ' ' + ROOM_NAME.toUpperCase()), 'commons-title'));
  panel.appendChild(testid(el('p', 'commons-purpose',
    'This room is the bridge. Open an AI in its mini-browser, have your conversation, ' +
    'then come back and voluntarily post what happened \u2014 transcripts, discoveries, ' +
    'prompts that worked, messages carried between minds. Nothing is scraped; only ' +
    'what a person types or pastes lives here.'), 'commons-purpose'));
  panel.appendChild(el('hr', 'hr-gold'));

  var form = testid(el('form', 'commons-form'), 'commons-form');

  var nameInput = testid(el('input', 'throne-input'), 'commons-name-input');
  nameInput.type = 'text'; nameInput.maxLength = 80;
  nameInput.placeholder = 'Who speaks'; nameInput.value = getSavedName();
  nameInput.autocomplete = 'name';

  var subjectInput = testid(el('input', 'throne-input'), 'commons-subject-input');
  subjectInput.type = 'text'; subjectInput.maxLength = 200;
  subjectInput.placeholder = 'What happened, in a line';

  var bodyInput = testid(el('textarea', 'throne-textarea commons-body-input'), 'commons-body-input');
  bodyInput.maxLength = 20000;
  bodyInput.placeholder = 'The words themselves \u2014 paste a transcript, a discovery, a prompt that worked\u2026';

  var submitBtn = testid(el('button', 'throne-btn throne-btn--primary', 'POST TO THE ROOM'), 'commons-post-submit');
  submitBtn.type = 'submit';

  var formStatus = testid(el('p', 'commons-status'), 'commons-form-status');

  form.appendChild(field('NAME', nameInput));
  form.appendChild(field('SUBJECT', subjectInput));
  form.appendChild(field('MESSAGE', bodyInput));
  form.appendChild(submitBtn);
  form.appendChild(formStatus);
  panel.appendChild(form);

  var feed = testid(el('div', 'commons-feed'), 'commons-feed');
  panel.appendChild(feed);

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = nameInput.value.trim();
    var subject = subjectInput.value.trim();
    var body = bodyInput.value.trim();
    if (!name) { setStatus(formStatus, 'A name is required \u2014 words under a name are theirs or they aren\u2019t there.', false); return; }
    if (!subject) { setStatus(formStatus, 'Give the post a subject.', false); return; }
    if (!body) { setStatus(formStatus, 'The message is empty.', false); return; }
    send({ from: name, to: ROOM_NAME, type: 'post', subject: subject, body: body },
      formStatus, submitBtn, function () {
        subjectInput.value = '';
        bodyInput.value = '';
        setStatus(formStatus, 'Posted to ' + ROOM_NAME + '.', true);
        loadFeed();
      });
  });

  root.appendChild(panel);
  loadFeed();
})();
