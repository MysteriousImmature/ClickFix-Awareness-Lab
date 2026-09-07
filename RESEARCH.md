# Research and source review

This document distinguishes the uploaded implementation, real platform behavior, and the teaching model delivered here.

## Uploaded source findings

| Original item | Observation | Delivered treatment |
| --- | --- | --- |
| `index.html` | Checkbox flow builds a launcher string and invokes legacy clipboard copying. | In-memory training marker; no OS clipboard writes. |
| `index.html` | Repeated `hideCaptchaCheckbox`, `showCaptchaLoading`, and `hideCaptchaLoading` definitions silently replace earlier definitions. | One state machine and one rendering path. |
| `index.html` | Absolute popup positions depend on element offsets; the viewport meta tag is absent. | Responsive layout, container queries, and explicit mobile sizing. |
| `index.html` | The logo `src` points to a third-party webpage rather than an image resource. | Local, fictional verification identity. |
| `recaptcha-verify` | HTA/VBScript creates a shell automation object, starts Calculator and timeout processes, clears the clipboard, and displays a connection error. | Synthetic execution and virtual clearing; executable helper removed. |
| `wups2.vbs ` | Filename has a trailing space. The helper uses shell automation to open an external URL. | Helper removed; no external execution path. |

The source was read as text, not executed. A working attack launcher or more effective brand impersonation is not part of this revision.

## Technical boundary

ClickFix induces a person to transfer page-provided content into an OS execution surface. The browser interaction and the subsequent user-initiated process should be investigated together. RunMRU can corroborate successful Run activity, but a missing entry is not proof that nothing happened. [Microsoft ClickFix research](https://www.microsoft.com/en-us/security/blog/2025/08/21/think-before-you-clickfix-analyzing-the-clickfix-social-engineering-technique/)

Browser clipboard APIs are permission- and context-dependent. The modern API typically requires a secure context and is subject to activation/browser rules; legacy `execCommand` is deprecated. Neither is called by this lab. The lab's “clipboard” is a JavaScript string. [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)

Windows Run is an operating-system surface, not a browser API. The demo therefore represents it with HTML and buttons. A real HTA runs through MSHTA and can interact with the OS using scripting/COM facilities. That changes the execution context; MSHTA is not an automatic administrator-elevation mechanism. Restricting unnecessary MSHTA use with application control is a relevant mitigation, subject to business compatibility review. [MITRE T1218.005](https://attack.mitre.org/techniques/T1218/005/)

## Detection interpretation

The sample associates a RunMRU value change, an interactive-shell MSHTA launch, and an outbound connection. Process and network samples share a process GUID and host. PIDs can be reused: investigate device identity, process identity, user context, and time together.

Sysmon Event 1 records process creation; Event 13 identifies registry value changes; Event 3 records process-linked network connections and is disabled by default. Event 24 can provide separate clipboard-change visibility. Data availability depends on configuration. These event types do not directly prove that the user pressed Win + R. [Sysmon documentation](https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon)

An `explorer.exe` parent and `mshta.exe` child alone are insufficient for a malicious verdict. The on-screen KQL is an original, narrow hunting starter; it selects documented `DeviceProcessEvents` fields and must be tuned to legitimate HTA use. It has not been executed against a tenant. [Defender XDR schema](https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-deviceprocessevents-table)

The broader user-induced execution mechanism maps to T1204. The displayed technique labels describe this demonstration's behavior; the lab does not claim coverage of every ClickFix variant. [MITRE User Execution](https://attack.mitre.org/techniques/T1204/)

For academic evaluation, assess whether participants identify the request to cross from a webpage into OS execution, distinguish synthetic data from real observations, and explain why correlation is needed before alert classification.
