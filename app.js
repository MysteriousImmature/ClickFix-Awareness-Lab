/* UI controller. The lab is functional without a server, account, CDN, or
 * real clipboard permission. Content-Security-Policy blocks runtime connections.
 * See README.md for a short presentation walkthrough and the reviewed sources.
 */
(function () {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const live = $('#live-announcement');
  if (!globalThis.ClickFixLab) {
    $('#captcha-trigger').disabled = true;
    $('#captcha-text').textContent = 'Demo unavailable';
    $('#observation-text').textContent = 'The lab model could not load. Keep index.html, app.js and lab-engine.js together, then reload.';
    live.textContent = 'The lab model could not load.';
    return;
  }

  const lab = globalThis.ClickFixLab;
  let stagingTimer = null;
  let session = lab.createSession(newSessionId());
  let currentTab = 'simulation';
  let labVisible = true;
  let sample = null;
  let lastRenderedEvent = 0;

  function newSessionId() {
    const bytes = new Uint8Array(4);
    if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') globalThis.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    // Identifier only: this is not an authentication token or security boundary.
    return 'CF-' + [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  function announce(message) { live.textContent = message; }
  function focusVisibleControl() {
    // Never move focus to a hidden participant view after a tab change.
    if (currentTab !== 'simulation') return;
    const phase = session.snapshot().phase;
    const controls = {idle:'#captcha-trigger', blocked:'#retry-staging', staged:'#advance-demo', run:'#advance-demo', pasted:'#advance-demo', complete:'#open-detector'};
    if (controls[phase]) $(controls[phase]).focus({preventScroll:true});
  }

  function setTab(name, moveFocus = false) {
    if (!['simulation', 'detector'].includes(name)) return;
    currentTab = name;
    $$('[data-tab]').forEach(button => {
      const selected = button.dataset.tab === name;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      $('#panel-' + button.dataset.tab).hidden = !selected;
    });
    $('#view-crumb').textContent = name === 'simulation' ? 'Simulation' : 'Detector mode';
    $('#lab-toggle').disabled = name === 'detector';
    $('#lab-toggle').title = name === 'detector' ? 'Lab dashboard is available in the Simulation view.' : 'Toggle the live security dashboard';
    if (moveFocus) $('#tab-' + name).focus({preventScroll:true});
    if (name === 'detector') renderDetector();
  }

  function startStaging(action) {
    if (!session.dispatch(action)) return;
    render();
    const ownedSession = session;
    clearTimeout(stagingTimer);
    // Keep the original user-visible delay, but guard callbacks against reset.
    // A stale callback must never stage a marker in a newer session.
    stagingTimer = setTimeout(() => {
      stagingTimer = null;
      if (session !== ownedSession) return;
      session.dispatch('STAGE');
      render();
      const blocked = session.snapshot().phase === 'blocked';
      announce(blocked ? 'Simulated clipboard write blocked. Retry is available.' : 'Inert marker staged in the virtual clipboard. Use the on-screen Run simulator.');
      focusVisibleControl();
    }, 850);
    announce('Simulated verification is loading.');
  }

  function renderEvents(state) {
    const list = $('#event-stream');
    // textContent is used throughout. A training record is never parsed as HTML,
    // a script, or a command. No external or user-supplied markup is evaluated.
    state.events.filter(event => event.id > lastRenderedEvent).forEach(event => {
      const item = document.createElement('li');
      if (event.level === 'warning') item.className = 'warning';
      const time = document.createElement('time');
      const date = new Date(event.at);
      time.dateTime = date.toISOString();
      time.textContent = date.toISOString().slice(11,19);
      const content = document.createElement('div');
      content.className = 'event-content';
      const type = document.createElement('span');
      type.className = 'event-type';
      type.textContent = event.type;
      const message = document.createElement('span');
      message.textContent = event.message;
      content.append(type, message);
      item.append(time, content);
      list.append(item);
    });
    if (lastRenderedEvent !== state.events.length) list.scrollTop = list.scrollHeight;
    lastRenderedEvent = state.events.length;
    $('#event-count').textContent = String(state.events.length).padStart(2,'0');
  }

  function renderPipeline(phase) {
    const counts = {idle:0, loading:1, blocked:1, staged:2, run:2, pasted:3, complete:4};
    const count = counts[phase];
    $('#pipeline-count').textContent = `${count} / 4 STAGES`;
    $$('.pipeline li').forEach((item, index) => {
      item.classList.toggle('done', index < count);
      item.classList.toggle('active', index === count && phase !== 'idle');
      if (index === count && phase !== 'idle') item.setAttribute('aria-current','step');
      else item.removeAttribute('aria-current');
    });
    const guideIndices = {staged:0, run:1, pasted:2};
    const activeGuide = guideIndices[phase] ?? -1;
    $$('.guide-step').forEach((item, index) => {
      item.classList.toggle('active', index === activeGuide);
      item.classList.toggle('done', index < activeGuide);
      if (index === activeGuide) item.setAttribute('aria-current','step');
      else item.removeAttribute('aria-current');
    });
  }

  function render() {
    const state = session.snapshot();
    const phase = state.phase;
    const descriptions = {
      idle:'The checkbox borrows a familiar trust cue. A click should not be treated as consent to execute a command.',
      loading:'A loading animation creates the appearance of a security check. Meanwhile, the lab prepares an inert data model.',
      blocked:'The failure is simulated. Recovery uses the virtual clipboard; no permission prompt or real clipboard is involved.',
      staged:'In real ClickFix, a page replaces clipboard content. Here, the dashboard reveals a training marker stored only in memory.',
      run:'This is the trust boundary: the lure asks the user to leave the browser. The on-screen window represents Windows Run.',
      pasted:'The user is about to approve content they did not inspect. This field contains only descriptive training data.',
      complete:'The lab generated synthetic evidence and cleared its virtual clipboard. Real clipboard clearing would not erase process or network logs.'
    };
    const statuses = {idle:'Ready to explore', loading:'Simulating verification', blocked:'Simulated error', staged:'Virtual clipboard staged', run:'User handoff in progress', pasted:'Simulated paste complete', complete:'Sequence complete'};
    $('#session-id').textContent = state.sessionId;
    $('.verification-reference').textContent = state.sessionId;
    $('#session-status').textContent = statuses[phase];
    $('#observation-text').textContent = descriptions[phase];
    $('#verification-view').hidden = !['idle','loading'].includes(phase);
    $('#handoff-view').hidden = !['staged','run','pasted'].includes(phase);
    $('#complete-view').hidden = phase !== 'complete';
    $('#blocked-view').hidden = phase !== 'blocked';
    $('#captcha-trigger').disabled = phase !== 'idle';
    $('#captcha-trigger').setAttribute('aria-busy', String(phase === 'loading'));
    $('#captcha-indicator').classList.toggle('loading', phase === 'loading');
    $('#captcha-text').textContent = phase === 'loading' ? 'Checking…' : "I'm not a robot";
    $('#run-simulator').hidden = !['run','pasted'].includes(phase);
    $('#virtual-command').value = state.pasted;
    $('#advance-demo').textContent = {staged:'Simulate Win + R  →', run:'Simulate Ctrl + V  →', pasted:'Simulate Enter  →'}[phase] || 'Continue simulation';
    const hasData = Boolean(state.clipboard);
    $('#clipboard-value').textContent = state.clipboard || (phase === 'complete' ? 'Virtual clipboard cleared.\n\nThe synthetic evidence remains\navailable in Detector mode.' : 'No data staged.\n\nClick the verification checkbox\nto observe the first transition.');
    $('#clipboard-value').classList.toggle('has-data',hasData);
    $('#clipboard-bytes').textContent = `${new TextEncoder().encode(state.clipboard).length} bytes`;
    const badge = $('#clipboard-badge');
    badge.textContent = hasData ? 'STAGED' : phase === 'complete' ? 'CLEARED' : phase === 'blocked' ? 'BLOCKED' : 'EMPTY';
    badge.classList.toggle('good',hasData || phase === 'complete');
    $('#fault-toggle').setAttribute('aria-checked',String(state.fault));
    $('#fault-toggle').disabled = !['idle','loading','blocked'].includes(phase);
    $('#fault-description').textContent = ['idle','loading','blocked'].includes(phase) ? 'Applies to the next staging attempt.' : 'Reset the session to demonstrate an error.';
    renderPipeline(phase);
    renderEvents(state);
    renderDetector();
  }

  function renderDetector() {
    const sessionEvidence = session.snapshot().evidence;
    const evidence = sessionEvidence.length ? sessionEvidence : sample;
    const hasEvidence = Boolean(evidence && evidence.length);
    $('#detector-state').textContent = hasEvidence ? 'Review: interactive MSHTA launch' : 'No execution evidence yet';
    $('#detector-state-description').textContent = hasEvidence ? (sessionEvidence.length ? 'Synthetic events from this lab sequence are ready for triage.' : 'Curated sample loaded. The participant simulation is unchanged.') : 'Complete the simulation or load the curated sample to inspect an alert.';
    const processBadge = $('#process-evidence-status');
    processBadge.textContent = hasEvidence ? 'REVIEW' : 'PENDING';
    $('#verdict-badge').textContent = hasEvidence ? 'INVESTIGATE' : 'WAITING';
    $('#verdict-badge').classList.toggle('neutral',!hasEvidence);
    $('#verdict-title').textContent = hasEvidence ? 'A handoff worth investigating.' : 'Start with evidence.';
    $('#verdict-text').textContent = hasEvidence ? 'The sample links an interactive MSHTA launch with Run history and an outbound connection. Confirm the command, user intent, and follow-on behavior before classification.' : 'The web page cannot read your EDR console, process tree, or Run history. This view uses a fixed teaching dataset.';
    $('#signal-count').replaceChildren(document.createTextNode(hasEvidence ? '3' : '0'));
    const total = document.createElement('span');
    total.textContent = '/3';
    $('#signal-count').append(total);
    $$('[data-evidence-state]').forEach(cell => { cell.textContent = hasEvidence ? 'Sample' : 'Awaiting'; cell.classList.toggle('confirmed',hasEvidence); });
    $('#evidence-json').textContent = hasEvidence ? JSON.stringify(evidence,null,2) : 'No sample loaded. Complete the simulation or select Load sample evidence.';
    $('#load-evidence').disabled = hasEvidence;
    $('#load-evidence').textContent = hasEvidence ? 'Sample evidence loaded' : '▷  Load sample evidence';
  }

  $('#captcha-trigger').addEventListener('click', () => startStaging('START'));
  $('#retry-staging').addEventListener('click', () => startStaging('RETRY'));
  $('#advance-demo').addEventListener('click', () => {
    const nextAction = {staged:'OPEN_RUN', run:'PASTE', pasted:'EXECUTE'}[session.snapshot().phase];
    if (!nextAction || !session.dispatch(nextAction)) return;
    render();
    announce($('#session-status').textContent + '. All activity is simulated.');
    focusVisibleControl();
  });

  $('#reset-demo').addEventListener('click', () => {
    clearTimeout(stagingTimer);
    stagingTimer = null;
    session = lab.createSession(newSessionId());
    sample = null;
    lastRenderedEvent = 0;
    $('#event-stream').replaceChildren();
    $('#raw-evidence').open = false;
    render();
    announce('Session reset. Virtual clipboard and synthetic evidence cleared.');
    focusVisibleControl();
  });
  $('#lab-toggle').addEventListener('click', () => {
    labVisible = !labVisible;
    $('#lab-toggle').setAttribute('aria-checked',String(labVisible));
    $('#lab-dashboard').hidden = !labVisible;
    $('#lab-layout').classList.toggle('lab-hidden',!labVisible);
    announce(labVisible ? 'Live security dashboard visible.' : 'Live security dashboard hidden. Training labels remain visible.');
  });
  $('#fault-toggle').addEventListener('click', () => { session.dispatch('TOGGLE_FAULT'); render(); });
  $('#open-detector').addEventListener('click', () => { setTab('detector',true); announce('Detector mode. Synthetic evidence is ready for review.'); });
  $('#load-evidence').addEventListener('click', () => {
    sample = lab.sampleEvidence(session.snapshot().sessionId);
    renderDetector();
    $('#detector-state').setAttribute('tabindex','-1');
    $('#detector-state').focus({preventScroll:true});
    announce('Three synthetic evidence records loaded. No system commands or connections occurred.');
  });
  $$('[data-viewport]').forEach(button => button.addEventListener('click', () => {
    const mobile = button.dataset.viewport === 'mobile';
    $('#browser-frame').classList.toggle('mobile',mobile);
    $$('[data-viewport]').forEach(control => { const active = control === button; control.classList.toggle('active',active); control.setAttribute('aria-pressed',String(active)); });
    announce(mobile ? 'Mobile-width participant preview selected.' : 'Desktop-width participant preview selected.');
  }));
  const tabButtons = $$('[data-tab]');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => setTab(button.dataset.tab));
    button.addEventListener('keydown', event => {
      const index = tabButtons.indexOf(button);
      let next = null;
      if (['ArrowRight','ArrowDown'].includes(event.key)) next = (index + 1) % tabButtons.length;
      else if (['ArrowLeft','ArrowUp'].includes(event.key)) next = (index + tabButtons.length - 1) % tabButtons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabButtons.length - 1;
      if (next !== null) { event.preventDefault(); setTab(tabButtons[next].dataset.tab,true); }
    });
  });
  const layoutQuery = matchMedia('(max-width: 1080px)');
  function updateTabOrientation() { $('.nav-tabs').setAttribute('aria-orientation',layoutQuery.matches ? 'horizontal' : 'vertical'); }
  layoutQuery.addEventListener('change',updateTabOrientation);
  updateTabOrientation();
  render();
})();
