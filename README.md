# ITV Player – Picture-in-Picture (Chrome extension)

Adds a **Picture-in-Picture** button to the ITVX player's control bar (between
*Subtitles* and *Full Window*) and an **Alt+P** hotkey, so you can pop the live
or on-demand stream out into a floating window (Apple/Chrome PiP).

## Why it's needed

ITVX's player doesn't expose a PiP control of its own, even though the browser
supports it. This extension wires one in and matches the player's native button
styling. It also strips `disablePictureInPicture` from the `<video>` defensively,
in case ITV disables PiP on some content.

## Install (unpacked)

1. Open `chrome://extensions` in Chrome.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select this folder
   (`~/Documents/Coding/itv-pip`).
4. Open <https://www.itv.com/watch?channel=itv> and start a stream — a PiP icon
   appears in the control bar. Click it (or press **Alt+P**) to toggle PiP.

## Files

- `manifest.json` — Manifest V3 config. Runs `content.js` in the page's MAIN
  world on `https://www.itv.com/watch*`.
- `content.js` — finds the player video, injects the PiP button into the control
  bar (with a floating fallback if the bar layout changes), and handles toggling.

## Notes

- Tested working on the live ITV1 channel: the button sits between Subtitles and
  Full Window and toggles PiP on/off.
- Some DRM-protected on-demand content may still refuse PiP at the browser level
  ("secure media"). When that happens the extension shows an alert explaining
  why rather than failing silently.
- ITV re-renders its controls as you navigate between programmes; a
  `MutationObserver` re-applies the button automatically.
