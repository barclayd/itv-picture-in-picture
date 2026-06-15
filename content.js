// ITV Player – Picture-in-Picture
// Runs in the page's MAIN world so it can talk to the player's <video> directly.
(function () {
  'use strict';

  const LOG = (...a) => console.log('[ITV-PiP]', ...a);

  // Standard "picture in picture" glyph, sized to match ITV's 28x26 control icons.
  const PIP_SVG =
    '<svg width="28" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">' +
    '<path d="M21 11.5V6a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<rect x="12" y="13" width="11" height="8" rx="1.5" fill="currentColor"/>' +
    '</svg>';

  let currentVideo = null;

  /** Make sure a <video> is allowed into PiP. */
  function enablePiP(video) {
    if (!video || video.__pipPatched) return;
    video.__pipPatched = true;
    try {
      video.removeAttribute('disablePictureInPicture');
      video.disablePictureInPicture = false;
      // Pin it false in case the player tries to re-disable it on protected content.
      Object.defineProperty(video, 'disablePictureInPicture', {
        configurable: true,
        get() { return false; },
        set() {},
      });
    } catch (e) {
      LOG('Could not redefine disablePictureInPicture', e);
    }
    video.addEventListener('loadedmetadata', () => (currentVideo = video));
    video.addEventListener('play', () => (currentVideo = video));
    if (!currentVideo) currentVideo = video;
  }

  /** Walk the document + open shadow roots for every <video>. */
  function scanForVideos(root) {
    root = root || document;
    root.querySelectorAll('video').forEach(enablePiP);
    root.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) scanForVideos(el.shadowRoot);
    });
  }

  /** Pick the video that's actually on screen. */
  function pickVideo() {
    const videos = [];
    const collect = (root) => {
      root.querySelectorAll('video').forEach((v) => videos.push(v));
      root.querySelectorAll('*').forEach((el) => el.shadowRoot && collect(el.shadowRoot));
    };
    collect(document);
    if (!videos.length) return null;
    return (
      videos.find((v) => !v.paused && v.videoWidth > 0) ||
      videos.find((v) => v.videoWidth > 0) ||
      currentVideo ||
      videos[0]
    );
  }

  async function togglePiP() {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }
      const video = pickVideo();
      if (!video) { LOG('No video found to put in PiP.'); return; }
      enablePiP(video);
      await video.requestPictureInPicture();
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      LOG('PiP request failed:', msg);
      alert(
        'Picture-in-Picture failed: ' + msg +
        '\n\nIf this mentions DRM/secure media, the stream is blocking PiP at the browser level.'
      );
    }
  }

  /** Build a button that matches ITV's control-bar styling. */
  function makeBarButton() {
    const btn = document.createElement('button');
    btn.className =
      'cp_button cp_button--secondary cp_button--small fe-mrphs__button fe-mrphs__button-iconOnly itv-pip-bar-btn';
    btn.setAttribute('data-testid', 'pictureInPicture');
    btn.setAttribute('aria-label', 'Picture in Picture');
    btn.setAttribute('tabindex', '5');
    btn.innerHTML =
      '<i class="cp_icon cp_icon--base" aria-hidden="true" style="display:inline-flex">' + PIP_SVG + '</i>';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePiP();
    });
    return btn;
  }

  /**
   * Insert the PiP button into the player's control bar, just before "Full Window".
   * Returns true if the bar was found and the button is in place.
   */
  function injectBarButton() {
    const fullWindow = document.querySelector('[data-testid="fullwindow"]');
    if (!fullWindow || !fullWindow.parentElement) return false;
    const bar = fullWindow.parentElement;
    if (bar.querySelector('[data-testid="pictureInPicture"]')) return true; // already there
    bar.insertBefore(makeBarButton(), fullWindow);
    LOG('PiP button wired into the control bar.');
    return true;
  }

  /** Fallback floating button for player variants without the standard bar. */
  function addFloatingButton() {
    if (document.getElementById('itv-pip-fab')) return;
    const btn = document.createElement('button');
    btn.id = 'itv-pip-fab';
    btn.textContent = '⧉ PiP';
    btn.title = 'Toggle Picture-in-Picture (Alt+P)';
    Object.assign(btn.style, {
      position: 'fixed', bottom: '16px', right: '16px', zIndex: 2147483647,
      padding: '8px 12px', fontSize: '13px', fontFamily: 'system-ui, sans-serif',
      color: '#fff', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.4)',
      borderRadius: '6px', cursor: 'pointer',
    });
    btn.addEventListener('click', togglePiP);
    document.body.appendChild(btn);
  }

  function refresh() {
    scanForVideos();
    const wired = injectBarButton();
    // Only show the floating fallback if we couldn't find the real control bar.
    const fab = document.getElementById('itv-pip-fab');
    if (wired) {
      if (fab) fab.remove();
    } else {
      addFloatingButton();
    }
  }

  // Alt+P hotkey.
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      togglePiP();
    }
  });

  refresh();
  // The player renders lazily and re-renders its controls, so keep re-applying.
  new MutationObserver(refresh).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  LOG('Loaded. Click the PiP icon in the control bar or press Alt+P.');
})();
