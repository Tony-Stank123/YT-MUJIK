// YouTube Music Native Desktop Enhancement Suite
// Features: Safe Ad-Skipper, Anti-Nag Shield, AMOLED/Obsidian/Studio Themes, Discord RPC Sync

(function() {
  'use strict';

  // Guard: Only run in top-level window of music.youtube.com
  if (window.top !== window.self) return;

  console.log('[YTM-Native] Initializing Native YouTube Music Desktop Suite...');

  /* ==========================================================================
     1. SAFE VIDEO AD SKIPPER & ANTI-NAG SHIELD
     ========================================================================== */
  let isMutedForAd = false;
  let userWasMutedBeforeAd = false;

  function handleAdsAndPrompts() {
    const player = document.querySelector('#movie_player, .html5-video-player');
    const video = document.querySelector('video');

    // YouTube HTML5 player ONLY sets 'ad-showing' or 'ad-interrupting' when a video ad is playing
    const isAdActive = player && (
      player.classList.contains('ad-showing') || 
      player.classList.contains('ad-interrupting')
    );

    if (isAdActive && video) {
      // Remember user's original muted state before muting the ad
      if (!isMutedForAd) {
        userWasMutedBeforeAd = video.muted;
        video.muted = true;
        isMutedForAd = true;
      }

      // Speed through ad video cleanly
      video.playbackRate = 16;
      if (video.duration && !isNaN(video.duration) && isFinite(video.duration) && video.currentTime < video.duration - 0.2) {
        video.currentTime = video.duration - 0.1;
      }

      // Click any skip button that appears
      const skipSelectors = [
        '.ytp-ad-skip-button-modern',
        '.ytp-skip-ad-button',
        'button[aria-label^="Skip ad"]',
        '.ytp-ad-skip-button',
        '.videoAdUiSkipButton',
        'button.ytp-ad-skip-button'
      ];
      for (const sel of skipSelectors) {
        const btn = document.querySelector(sel);
        if (btn && btn.offsetParent !== null) {
          btn.click();
          break;
        }
      }
    } else if (isMutedForAd && video) {
      // Ad has completed; restore playback rate and un-mute
      video.playbackRate = 1.0;
      if (!userWasMutedBeforeAd) {
        video.muted = false;
      }
      isMutedForAd = false;
    }

    // Auto-confirm "Still watching?" / "Video paused. Continue watching?"
    const youThereBtn = document.querySelector('ytmusic-you-there-renderer yt-button-renderer button, #confirm-button');
    if (youThereBtn && youThereBtn.offsetParent !== null) {
      console.log('[YTM-Native] Auto-confirming "Still listening?" prompt');
      youThereBtn.click();
    }

    // Auto-dismiss upsell banners & trial promo modals
    const dismissBtn = document.querySelector('ytmusic-mealbar-promo-renderer #dismiss-button, ytmusic-upsell-dialog-renderer #dismiss-button');
    if (dismissBtn && dismissBtn.offsetParent !== null) {
      dismissBtn.click();
    }
  }

  // Check every 250ms
  setInterval(handleAdsAndPrompts, 250);

  /* ==========================================================================
     2. DARK THEMES ENGINE (AMOLED / OBSIDIAN / STUDIO)
     ========================================================================== */
  const THEMES = {
    amoled: {
      name: 'AMOLED Black',
      id: 'amoled',
      css: `
        /* Pure AMOLED Black Theme */
        html, body, #layout, #browse-page, #player-page,
        ytmusic-app-layout, ytmusic-nav-bar,
        ytmusic-browse-response,
        ytmusic-tab-renderer,
        ytmusic-section-list-renderer,
        ytmusic-carousel-shelf-renderer,
        #contents.ytmusic-section-list-renderer,
        ytmusic-player-page {
          background-color: #000000 !important;
          background: #000000 !important;
        }

        /* Player bar pure black with crisp top border */
        ytmusic-player-bar,
        #player-bar-background.ytmusic-app-layout,
        ytmusic-app-layout > [slot="player-bar"] {
          background: #000000 !important;
          border-top: 1px solid #141414 !important;
        }

        /* Sidebar / Guide */
        #guide-wrapper.ytmusic-app-layout,
        ytmusic-guide-section-renderer {
          background: #000000 !important;
          border-right: 1px solid #141414 !important;
        }

        /* Cards and dialogs */
        ytmusic-two-row-item-renderer,
        ytmusic-responsive-list-item-renderer,
        tp-yt-paper-dialog,
        ytmusic-menu-popup-renderer {
          background-color: #080808 !important;
          border: 1px solid #161616 !important;
        }

        /* Text contrasts */
        .title.ytmusic-player-bar,
        ytmusic-header-renderer .title,
        .yt-core-attributed-string {
          color: #ffffff !important;
        }
      `
    },
    obsidian: {
      name: 'Deep Obsidian',
      id: 'obsidian',
      css: `
        /* Deep Obsidian Theme with Glassmorphism */
        html, body, #layout, #browse-page, #player-page,
        ytmusic-app-layout,
        ytmusic-browse-response,
        ytmusic-tab-renderer,
        ytmusic-section-list-renderer,
        #contents.ytmusic-section-list-renderer,
        ytmusic-player-page {
          background-color: #08090d !important;
          background: #08090d !important;
        }

        /* Nav bar */
        ytmusic-nav-bar {
          background: rgba(10, 12, 18, 0.9) !important;
          backdrop-filter: blur(20px) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
        }

        /* Glassmorphic Player bar */
        ytmusic-player-bar,
        #player-bar-background.ytmusic-app-layout,
        ytmusic-app-layout > [slot="player-bar"] {
          background: rgba(13, 16, 24, 0.88) !important;
          backdrop-filter: blur(24px) saturate(180%) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.6) !important;
        }

        /* Sidebar / Guide */
        #guide-wrapper.ytmusic-app-layout {
          background: rgba(9, 11, 16, 0.95) !important;
          border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
        }

        /* Cards */
        ytmusic-two-row-item-renderer,
        ytmusic-responsive-list-item-renderer {
          background: #0e111a !important;
          border: 1px solid rgba(255, 255, 255, 0.04) !important;
          border-radius: 8px !important;
          transition: all 0.2s ease !important;
        }
        ytmusic-two-row-item-renderer:hover,
        ytmusic-responsive-list-item-renderer:hover {
          background: #141824 !important;
          border-color: rgba(255, 0, 0, 0.3) !important;
          transform: translateY(-2px) !important;
        }

        /* Popups */
        tp-yt-paper-dialog,
        ytmusic-menu-popup-renderer {
          background: #0f131f !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
      `
    },
    studio: {
      name: 'Studio Matte',
      id: 'studio',
      css: `
        /* Studio Matte Graphite Theme */
        html, body, #layout, #browse-page, #player-page,
        ytmusic-app-layout,
        ytmusic-browse-response,
        ytmusic-tab-renderer,
        ytmusic-section-list-renderer,
        #contents.ytmusic-section-list-renderer,
        ytmusic-player-page {
          background-color: #161619 !important;
          background: #161619 !important;
        }

        ytmusic-nav-bar {
          background: #1b1b20 !important;
          border-bottom: 1px solid #26262d !important;
        }

        ytmusic-player-bar,
        #player-bar-background.ytmusic-app-layout,
        ytmusic-app-layout > [slot="player-bar"] {
          background: #131316 !important;
          border-top: 1px solid #24242b !important;
        }

        #guide-wrapper.ytmusic-app-layout {
          background: #141417 !important;
          border-right: 1px solid #24242b !important;
        }

        ytmusic-two-row-item-renderer,
        ytmusic-responsive-list-item-renderer {
          background: #1e1e24 !important;
          border: 1px solid #2a2a33 !important;
          border-radius: 6px !important;
        }

        tp-yt-paper-dialog,
        ytmusic-menu-popup-renderer {
          background: #1a1a20 !important;
          border: 1px solid #2c2c36 !important;
        }
      `
    }
  };

  // Base Universal Dark & Ad Elimination CSS
  const BASE_ENHANCEMENT_CSS = `
    /* Universal Ad Element Removal */
    ytmusic-banner-promo-renderer,
    ytmusic-mealbar-promo-renderer,
    ytmusic-upsell-dialog-renderer,
    ytmusic-player-page #player-ads,
    .ytp-ad-overlay-container,
    .ytp-ad-message-container,
    .ytp-ad-preview-container,
    ytd-promoted-sparkles-web-renderer,
    ytmusic-guide-entry-renderer:has(a[href*="premium"]),
    a[href*="music.youtube.com/premium"],
    #top-level-buttons-computed > ytd-button-renderer:has(a[href*="premium"]) {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
      height: 0 !important;
      width: 0 !important;
    }

    /* Ultra-sleek Dark Scrollbars */
    ::-webkit-scrollbar {
      width: 8px !important;
      height: 8px !important;
    }
    ::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2) !important;
    }
    ::-webkit-scrollbar-thumb {
      background: #2a2a32 !important;
      border-radius: 4px !important;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #ff0000 !important;
    }

    /* Native Theme Switcher Floating Pill */
    #ytm-native-theme-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      margin-right: 12px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      color: #ffffff;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
      z-index: 99999;
    }
    #ytm-native-theme-pill:hover {
      background: rgba(255, 0, 0, 0.2);
      border-color: #ff0000;
      box-shadow: 0 0 12px rgba(255, 0, 0, 0.4);
    }
    #ytm-native-theme-pill svg {
      width: 14px;
      height: 14px;
      fill: #ff0000;
    }
  `;

  let baseStyleEl = null;
  let themeStyleEl = null;

  function injectBaseStyles() {
    if (!baseStyleEl) {
      baseStyleEl = document.createElement('style');
      baseStyleEl.id = 'ytm-native-base-styles';
      baseStyleEl.textContent = BASE_ENHANCEMENT_CSS;
      (document.head || document.documentElement).appendChild(baseStyleEl);
    }
  }

  function applyTheme(themeKey) {
    if (!THEMES[themeKey]) themeKey = 'amoled'; // Default to AMOLED Black
    localStorage.setItem('ytm_native_theme', themeKey);

    if (!themeStyleEl) {
      themeStyleEl = document.createElement('style');
      themeStyleEl.id = 'ytm-native-theme-styles';
      (document.head || document.documentElement).appendChild(themeStyleEl);
    }
    themeStyleEl.textContent = THEMES[themeKey].css;

    // Update pill text if present
    const label = document.getElementById('ytm-theme-label');
    if (label) {
      label.textContent = THEMES[themeKey].name;
    }
    console.log('[YTM-Native] Active Theme:', THEMES[themeKey].name);
  }

  // Exposed global helper for Rust or devtools
  window.__ytm_set_theme = applyTheme;
  window.__ytm_get_theme = () => localStorage.getItem('ytm_native_theme') || 'amoled';

  /* ==========================================================================
     3. THEME SWITCHER UI BUTTON IN TOP NAVBAR
     ========================================================================== */
  function installThemePill() {
    if (document.getElementById('ytm-native-theme-pill')) return;

    // Locate the top right nav section
    const rightNav = document.querySelector('ytmusic-nav-bar #right-content');
    if (!rightNav) return;

    const pill = document.createElement('div');
    pill.id = 'ytm-native-theme-pill';
    pill.title = 'Click to switch Dark Theme (AMOLED / Obsidian / Studio)';
    pill.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      </svg>
      <span id="ytm-theme-label">AMOLED</span>
    `;

    const themeKeys = ['amoled', 'obsidian', 'studio'];
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = localStorage.getItem('ytm_native_theme') || 'amoled';
      const nextIdx = (themeKeys.indexOf(current) + 1) % themeKeys.length;
      applyTheme(themeKeys[nextIdx]);
    });

    rightNav.insertBefore(pill, rightNav.firstChild);
    const active = localStorage.getItem('ytm_native_theme') || 'amoled';
    const label = document.getElementById('ytm-theme-label');
    if (label) label.textContent = THEMES[active].name;
  }

  /* ==========================================================================
     4. MEDIA CONTROLS & DISCORD RPC BRIDGE
     ========================================================================== */
  // Global control methods callable from Rust
  window.__ytm_play_pause = function() {
    const btn = document.querySelector('#play-pause-button, .play-pause-button');
    if (btn) btn.click();
  };

  window.__ytm_next = function() {
    const btn = document.querySelector('.next-button');
    if (btn) btn.click();
  };

  window.__ytm_prev = function() {
    const btn = document.querySelector('.previous-button');
    if (btn) btn.click();
  };

  function getMediaInfo() {
    const video = document.querySelector('video');
    const titleEl = document.querySelector('ytmusic-player-bar .title');
    const bylineEl = document.querySelector('ytmusic-player-bar .byline');
    const artworkEl = document.querySelector('ytmusic-player-bar .image');

    const title = (titleEl ? titleEl.textContent.trim() : '') || (navigator.mediaSession && navigator.mediaSession.metadata ? navigator.mediaSession.metadata.title : '');
    const artist = (bylineEl ? bylineEl.textContent.trim() : '') || (navigator.mediaSession && navigator.mediaSession.metadata ? navigator.mediaSession.metadata.artist : '');
    const artwork = (artworkEl ? artworkEl.src : '') || (navigator.mediaSession && navigator.mediaSession.metadata && navigator.mediaSession.metadata.artwork && navigator.mediaSession.metadata.artwork[0] ? navigator.mediaSession.metadata.artwork[0].src : '');

    const isPlaying = video ? !video.paused : false;
    const currentTime = video ? Math.floor(video.currentTime) : 0;
    const duration = video ? Math.floor(video.duration || 0) : 0;

    return {
      title,
      artist,
      artwork,
      isPlaying,
      currentTime,
      duration
    };
  }

  function syncMediaState() {
    const info = getMediaInfo();
    if (window.__TAURI__ && window.__TAURI__.event) {
      window.__TAURI__.event.emit('track_change', info);
    }
  }

  setInterval(syncMediaState, 2000);

  /* ==========================================================================
     5. INITIALIZATION & OBSERVER
     ========================================================================== */
  function init() {
    injectBaseStyles();
    const savedTheme = localStorage.getItem('ytm_native_theme') || 'amoled';
    applyTheme(savedTheme);

    // Ensure theme pill is injected once DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        installThemePill();
      });
    } else {
      installThemePill();
    }

    // Keep checking for navbar injection if dynamic navigation replaces it
    const observer = new MutationObserver(() => {
      if (!document.getElementById('ytm-native-theme-pill')) {
        installThemePill();
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Execute immediate setup
  init();

})();
