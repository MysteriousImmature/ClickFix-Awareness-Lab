/* ClickFix Awareness Lab — deterministic, browser-independent teaching model.
 * No command execution, clipboard APIs, remote endpoints, or configurable targets.
 * The controller renders these transitions; the model never performs OS actions.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ClickFixLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PHASES = Object.freeze(['idle', 'loading', 'blocked', 'staged', 'run', 'pasted', 'complete']);
  const VALID_SESSION = /^CF-[A-F0-9]{8}$/;
  function validateSession(sessionId) {
    if (typeof sessionId !== 'string' || sessionId.length !== 11 || !VALID_SESSION.test(sessionId)) throw new TypeError('Invalid training session identifier.');
    return sessionId;
  }

  // Construct descriptive data, never concatenate an executable plus arguments.
  // Keeping the process name as a label preserves the teaching point without
  // recreating the original page's launcher or Windows scripting payload.
  function buildTrainingMarker(sessionId) {
    validateSession(sessionId);
    return [
      'CLICKFIX_TRAINING',
      `session: ${sessionId}`,
      'process_label: mshta.exe',
      'action: simulate_only'
    ].join('\n');
  }

  // Deliberately synthetic evidence. The browser cannot see a Windows process
  // tree or EDR telemetry. Event times, IDs and paths are a teaching fixture.
  // Process correlation should use device + ProcessGuid (or unique process ID)
  // and time; a PID by itself can be reused and is not a reliable join key.
  function sampleEvidence(sessionId, timestamp = Date.now()) {
    validateSession(sessionId);
    const instant = new Date(timestamp).getTime();
    if (!Number.isFinite(instant)) throw new TypeError('Invalid evidence time.');
    const common = {Synthetic: true, SessionId: sessionId, Computer: 'LAB-WIN11', User: 'LAB\\Student'};
    const processGuid = '{00000000-0000-4000-8000-000000000624}';
    return [
      {...common, EventID: 13, UtcTime: new Date(instant).toISOString(),
        Image: 'C:\\Windows\\explorer.exe',
        TargetObject: 'HKU\\S-1-5-21-111111111-222222222-333333333-1001\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RunMRU\\a',
        Details: '[REDACTED TRAINING ARGUMENTS]',
        Note: 'Illustrative Run history value; collection depends on configuration.'},
      {...common, EventID: 1, UtcTime: new Date(instant + 250).toISOString(),
        ProcessGuid: processGuid, ProcessId: 6240,
        Image: 'C:\\Windows\\System32\\mshta.exe',
        ParentProcessId: 4120, ParentImage: 'C:\\Windows\\explorer.exe',
        CommandLine: '[REDACTED — synthetic MSHTA invocation]', IntegrityLevel: 'Medium'},
      {...common, EventID: 3, UtcTime: new Date(instant + 900).toISOString(),
        ProcessGuid: processGuid, ProcessId: 6240,
        Image: 'C:\\Windows\\System32\\mshta.exe',
        DestinationHostname: 'payload.training.invalid', DestinationIp: '192.0.2.24',
        DestinationPort: 443, Protocol: 'tcp', Initiated: true,
        Note: 'Documentation-only address; this connection never occurs.'}
    ];
  }

  function createSession(sessionId, clock = Date.now) {
    validateSession(sessionId);
    const state = {sessionId, phase:'idle', clipboard:'', pasted:'', fault:false, evidence:[], events:[]};

    function record(type, message, level = 'info') {
      state.events.push({id: state.events.length + 1, at: clock(), type, message, level});
    }
    record('SESSION', 'Training session initialized.');

    // Consumers receive copies so rendering cannot mutate the state machine.
    function snapshot() {
      return {...state, events: state.events.map(event => ({...event})), evidence: state.evidence.map(event => ({...event}))};
    }
    function dispatch(action) {
      switch (action) {
        case 'START':
          if (state.phase !== 'idle') return false;
          state.phase = 'loading';
          record('TRUST CUE', 'Verification checkbox clicked.');
          record('MODEL', 'Inert launcher model prepared.');
          break;
        case 'STAGE':
          if (state.phase !== 'loading') return false;
          if (state.fault) {
            state.phase = 'blocked';
            record('SIMULATED ERROR', 'Virtual clipboard write denied.', 'warning');
          } else {
            state.clipboard = buildTrainingMarker(state.sessionId);
            state.phase = 'staged';
            record('VIRTUAL CLIPBOARD', 'Training marker staged in memory.');
          }
          break;
        case 'RETRY':
          if (state.phase !== 'blocked') return false;
          state.fault = false;
          state.phase = 'loading';
          record('RECOVERY', 'Retrying with a virtual clipboard.');
          break;
        case 'OPEN_RUN':
          if (state.phase !== 'staged') return false;
          // Win+R belongs to the OS shell. A normal web page does not call a
          // Windows API to open it. Real ClickFix persuades the user to do so.
          // This transition only reveals an HTML panel inside the page.
          state.phase = 'run';
          record('USER HANDOFF', 'In-page Run simulator opened.');
          break;
        case 'PASTE':
          if (state.phase !== 'run' || !state.clipboard) return false;
          state.pasted = state.clipboard;
          state.phase = 'pasted';
          record('VIRTUAL PASTE', 'Training marker placed in the simulator.');
          break;
        case 'EXECUTE':
          if (state.phase !== 'pasted' || state.pasted !== buildTrainingMarker(state.sessionId)) return false;
          // A real HTA can invoke COM automation (e.g. WScript.Shell) with the
          // current user's rights. It is not browser JavaScript and does not
          // inherently elevate privileges. Here we generate data, not an HTA.
          state.evidence = sampleEvidence(state.sessionId, clock());
          state.phase = 'complete';
          record('SYNTHETIC EXECUTION', 'Illustrative MSHTA process event created.');
          record('SYNTHETIC EVIDENCE', 'Run history and network fixtures added.');
          // The original cleared the system clipboard. We clear only our string;
          // clearing clipboard content would not erase process or network logs.
          state.clipboard = '';
          record('VIRTUAL CLIPBOARD', 'In-memory training marker cleared.');
          record('DETECTOR', 'Evidence ready for analyst review.');
          break;
        case 'TOGGLE_FAULT':
          if (!['idle', 'loading', 'blocked'].includes(state.phase)) return false;
          state.fault = !state.fault;
          break;
        default:
          return false;
      }
      return true;
    }
    return Object.freeze({snapshot, dispatch});
  }

  return Object.freeze({PHASES, buildTrainingMarker, createSession, sampleEvidence});
});
