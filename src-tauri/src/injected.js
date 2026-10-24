// YouTube Music Native Desktop Enhancement Suite
// Features: Safe Ad-Skipper, Anti-Nag Shield, AMOLED/Obsidian/Studio Themes,
//           Dedicated Song & Playlist MP4 Downloader with Lyrics, Instant Toast Notifications

(function() {
  'use strict';

  // Guard: Only run in top-level window of music.youtube.com
  if (window.top !== window.self) return;

  console.log('[YTM-Native] Initializing Native YouTube Music Desktop Suite...');

  /* ==========================================================================
     1. SHADOW DOM COMPATIBILITY & DEEP QUERY HELPERS
     ========================================================================== */
  function queryDeep(selector, root = document) {
    if (!root) return null;
    try {
      const el = root.querySelector(selector);
      if (el) return el;
    } catch (e) {}

    // Check if root itself has a shadowRoot
    if (root.shadowRoot) {
      const el = queryDeep(selector, root.shadowRoot);
      if (el) return el;
    }

    // Traverse all children with shadowRoots
    const all = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (let i = 0; i < all.length; i++) {
      const child = all[i];
      if (child.shadowRoot) {
        const found = queryDeep(selector, child.shadowRoot);
        if (found) return found;
      }
    }
    return null;
  }

  /* ==========================================================================
     2. SAFE VIDEO AD SKIPPER & ANTI-NAG SHIELD
     ========================================================================== */
  let isMutedForAd = false;
  let userWasMutedBeforeAd = false;

  function handleAdsAndPrompts() {
    const player = document.querySelector('#movie_player, .html5-video-player');
    const video = document.querySelector('video');

    const isAdActive = player && (
      player.classList.contains('ad-showing') || 
      player.classList.contains('ad-interrupting')
    );

    if (isAdActive && video) {
      if (!isMutedForAd) {
        userWasMutedBeforeAd = video.muted;
        video.muted = true;
        isMutedForAd = true;
      }

      video.playbackRate = 16;
      if (video.duration && !isNaN(video.duration) && isFinite(video.duration) && video.currentTime < video.duration - 0.2) {
        video.currentTime = video.duration - 0.1;
      }

      const skipButtons = [
        '.ytp-ad-skip-button-modern',
        '.ytp-skip-ad-button',
        'button[aria-label^="Skip ad"]',
        '.ytp-ad-skip-button',
        '.videoAdUiSkipButton',
        'button.ytp-ad-skip-button'
      ];
      for (const sel of skipButtons) {
        const btn = queryDeep(sel);
        if (btn && btn.offsetParent !== null) {
          btn.click();
          break;
        }
      }
    } else if (isMutedForAd && video) {
      video.playbackRate = 1.0;
      if (!userWasMutedBeforeAd) {
        video.muted = false;
      }
      isMutedForAd = false;
    }

    // Auto-confirm "Still watching?" / "Video paused. Continue watching?"
    const youThereBtn = queryDeep('ytmusic-you-there-renderer yt-button-renderer button, #confirm-button');
    if (youThereBtn && youThereBtn.offsetParent !== null) {
      youThereBtn.click();
    }

    // Auto-dismiss upsell banners & trial promo modals
    const dismissBtn = queryDeep('ytmusic-mealbar-promo-renderer #dismiss-button, ytmusic-upsell-dialog-renderer #dismiss-button');
    if (dismissBtn && dismissBtn.offsetParent !== null) {
      dismissBtn.click();
    }
  }

  setInterval(handleAdsAndPrompts, 250);

  /* ==========================================================================
     3. BULLETPROOF TOAST NOTIFICATION SYSTEM (INLINE-STYLED & GUARANTEED VISIBLE)
     ========================================================================== */
  function ensureToastContainer() {
    let container = document.getElementById('ytm-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ytm-toast-container';
    }

    // Always enforce top-priority inline styles
    container.style.cssText = [
      'position: fixed !important',
      'bottom: 95px !important',
      'right: 24px !important',
      'z-index: 2147483647 !important',
      'display: flex !important',
      'flex-direction: column !important',
      'gap: 10px !important',
      'pointer-events: none !important',
      'max-width: 440px !important',
      'width: auto !important'
    ].join(';');

    const targetParent = document.body || document.documentElement;
    if (targetParent && !targetParent.contains(container)) {
      targetParent.appendChild(container);
    }
    return container;
  }

  function showToast(message, type = 'info', actionText = null, actionCallback = null) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `ytm-toast ytm-toast-${type}`;

    let borderColor = 'rgba(59, 130, 246, 0.8)';
    let glow = 'rgba(59, 130, 246, 0.35)';
    let iconHtml = 'ℹ️';

    if (type === 'loading') {
      borderColor = 'rgba(255, 0, 0, 0.85)';
      glow = 'rgba(255, 0, 0, 0.4)';
      iconHtml = '⏳';
    } else if (type === 'success') {
      borderColor = 'rgba(34, 197, 94, 0.85)';
      glow = 'rgba(34, 197, 94, 0.4)';
      iconHtml = '✅';
    } else if (type === 'error') {
      borderColor = 'rgba(239, 68, 68, 0.85)';
      glow = 'rgba(239, 68, 68, 0.4)';
      iconHtml = '❌';
    }

    toast.style.cssText = [
      'pointer-events: auto !important',
      'display: flex !important',
      'align-items: center !important',
      'gap: 12px !important',
      'padding: 14px 20px !important',
      'background: #11131a !important',
      'border: 1.5px solid ' + borderColor + ' !important',
      'border-radius: 12px !important',
      'color: #ffffff !important',
      'font-size: 13.5px !important',
      'font-weight: 600 !important',
      'font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
      'box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 16px ' + glow + ' !important',
      'opacity: 1 !important',
      'transition: opacity 0.3s ease, transform 0.3s ease !important',
      'transform: translateY(0) !important',
      'z-index: 2147483647 !important'
    ].join(';');

    const msgEl = document.createElement('div');
    msgEl.style.cssText = 'flex: 1 1 auto; line-height: 1.4; word-break: break-word; color: #ffffff !important;';
    msgEl.innerHTML = `<span style="font-size:16px; margin-right:6px;">${iconHtml}</span> ${message}`;
    toast.appendChild(msgEl);

    // Action button (e.g. Open Downloads Folder)
    if (type === 'success' || actionText) {
      const btn = document.createElement('button');
      btn.style.cssText = [
        'background: rgba(34, 197, 94, 0.25) !important',
        'border: 1px solid rgba(34, 197, 94, 0.5) !important',
        'color: #ffffff !important',
        'padding: 6px 14px !important',
        'border-radius: 6px !important',
        'font-size: 12px !important',
        'font-weight: 600 !important',
        'cursor: pointer !important',
        'margin-left: 10px !important',
        'white-space: nowrap !important'
      ].join(';');
      btn.textContent = actionText || '📂 Open Folder';
      btn.onclick = (e) => {
        e.stopPropagation();
        if (actionCallback) {
          actionCallback();
        } else {
          triggerOpenFolder();
        }
      };
      toast.appendChild(btn);
    }

    container.appendChild(toast);

    const duration = type === 'loading' ? 14000 : 7000;
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 350);
    }, duration);

    return toast;
  }

  window.__ytm_show_toast = function(message, type) {
    showToast(message, type);
  };

  function triggerOpenFolder() {
    showToast('Opening downloads folder...', 'info');
    if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
      window.__TAURI__.core.invoke('open_downloads_folder').catch(console.error);
    } else if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === 'function') {
      window.__TAURI_INTERNALS__.invoke('open_downloads_folder').catch(console.error);
    }
    if (window.__TAURI__ && window.__TAURI__.event && typeof window.__TAURI__.event.emit === 'function') {
      window.__TAURI__.event.emit('open_downloads_folder', {}).catch(console.error);
    }
  }

  // Listen for download_status events from Rust
  if (window.__TAURI__ && window.__TAURI__.event) {
    window.__TAURI__.event.listen('download_status', (event) => {
      const data = event.payload;
      if (data && data.message) {
        const type = data.status === 'started' ? 'loading' : (data.status === 'completed' ? 'success' : 'error');
        showToast(data.message, type);
      }
    });
  }

  /* ==========================================================================
     4. MP4 DOWNLOAD ENGINE (MULTI-TIER TRACK & PLAYLIST EXTRACTION)
     ========================================================================== */
  function extractVideoId(url) {
    if (!url) return null;
    const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    const matchShort = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (matchShort) return matchShort[1];
    return null;
  }

  function extractPlaylistId(url) {
    if (!url) return null;
    const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  function getCurrentTrackDetails() {
    let videoId = null;
    let title = '';
    let artist = '';
    let playlistId = null;

    // Tier 1: HTML5 video player API (The authoritative source in YouTube Music!)
    const player = document.querySelector('#movie_player, .html5-video-player');
    if (player) {
      if (typeof player.getVideoData === 'function') {
        try {
          const vData = player.getVideoData();
          if (vData) {
            if (vData.video_id) videoId = vData.video_id;
            if (vData.title) title = vData.title.trim();
            if (vData.author) artist = vData.author.trim();
          }
        } catch (e) {}
      }
      if (!videoId && typeof player.getVideoUrl === 'function') {
        try {
          const vUrl = player.getVideoUrl();
          if (vUrl) videoId = extractVideoId(vUrl);
        } catch (e) {}
      }
      if (typeof player.getPlaylistId === 'function') {
        try {
          playlistId = player.getPlaylistId();
        } catch (e) {}
      }
    }

    // Tier 2: MediaSession API
    if (navigator.mediaSession && navigator.mediaSession.metadata) {
      const meta = navigator.mediaSession.metadata;
      if (!title && meta.title) title = meta.title.trim();
      if (!artist && meta.artist) artist = meta.artist.trim();
    }

    // Tier 3: DOM Player Bar Elements (Deep shadow DOM query)
    const playerBar = document.querySelector('ytmusic-player-bar');
    const pbRoot = playerBar ? (playerBar.shadowRoot || playerBar) : document;

    const titleEl = pbRoot.querySelector('.title, yt-formatted-string.title');
    if (!title && titleEl) {
      title = titleEl.textContent.trim();
    }

    const bylineEl = pbRoot.querySelector('.byline, yt-formatted-string.byline');
    if (!artist && bylineEl) {
      artist = bylineEl.textContent.trim();
    }

    // Tier 4: Location URL or player bar link
    if (!videoId) {
      videoId = extractVideoId(window.location.href);
    }
    if (!videoId) {
      const link = pbRoot.querySelector('a[href*="watch"], a[href*="v="]');
      if (link && link.href) {
        videoId = extractVideoId(link.href);
      }
    }

    if (!playlistId) {
      playlistId = extractPlaylistId(window.location.href);
    }

    return { videoId, title, artist, playlistId };
  }

  function extractCurrentLyrics() {
    const lyricsEl = queryDeep('ytmusic-description-shelf-renderer .description, ytmusic-player-page #tab-renderer [page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');
    if (lyricsEl && lyricsEl.innerText && lyricsEl.innerText.trim().length > 10) {
      return lyricsEl.innerText.trim();
    }
    return null;
  }

  function sendDownloadRequest(payload) {
    console.log('[YTM-Native] Requesting download:', payload);
    // 1. Try Tauri invoke (fastest and most reliable)
    if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
      window.__TAURI__.core.invoke('trigger_download', { req: payload }).catch(err => {
        console.warn('[YTM-Native] invoke failed, falling back to event emit:', err);
      });
    } else if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === 'function') {
      window.__TAURI_INTERNALS__.invoke('trigger_download', { req: payload }).catch(err => {
        console.warn('[YTM-Native] internals invoke failed, falling back to event emit:', err);
      });
    }

    // 2. Also emit event via Tauri event system
    if (window.__TAURI__ && window.__TAURI__.event && typeof window.__TAURI__.event.emit === 'function') {
      window.__TAURI__.event.emit('trigger_download', payload).catch(err => {
        console.warn('[YTM-Native] event emit failed:', err);
      });
    }
  }

  // 1. DOWNLOAD CURRENT SONG ONLY (Strips all &list= and queue params)
  function downloadCurrentSong(customVideoUrl = null, customTitle = null) {
    const track = getCurrentTrackDetails();
    let currentUrl = customVideoUrl || window.location.href;
    let videoId = customVideoUrl ? extractVideoId(customVideoUrl) : track.videoId;
    let title = customTitle || track.title || 'Music Track';
    let artist = track.artist || '';

    // If nothing is playing and no title or videoId found
    if (!videoId && (!title || title === 'Music Track' || title === 'Current Song')) {
      showToast('⚠️ No song is currently playing. Start a song first!', 'error');
      return;
    }

    // Strict single song URL construction
    let songUrl = '';
    if (videoId) {
      songUrl = `https://www.youtube.com/watch?v=${videoId}`;
    } else if (title && title !== 'Music Track') {
      songUrl = `ytsearch1:${artist ? title + ' ' + artist : title}`;
    } else {
      songUrl = currentUrl.split('&list=')[0].split('?list=')[0];
    }

    // Show INSTANT toast notification
    showToast(`Downloading "${title}" in MP4 format...`, 'loading');

    const lyrics = extractCurrentLyrics();

    sendDownloadRequest({
      downloadType: 'song',
      url: songUrl,
      title: title,
      artist: artist,
      lyrics: lyrics
    });
  }

  // 2. DOWNLOAD ENTIRE PLAYLIST
  function downloadCurrentPlaylist() {
    const track = getCurrentTrackDetails();
    let listId = track.playlistId || extractPlaylistId(window.location.href);

    if (!listId) {
      const link = queryDeep('ytmusic-player-bar .title a, a[href*="list="]');
      if (link && link.href) {
        listId = extractPlaylistId(link.href);
      }
    }

    if (!listId) {
      showToast('⚠️ No playlist detected. Open an album or playlist first!', 'error');
      return;
    }

    let playlistTitle = 'Playlist';
    const headerTitle = queryDeep(
      'ytmusic-responsive-header-renderer .title, ' +
      'ytmusic-detail-header-renderer .title, ' +
      'ytmusic-editable-playlist-detail-header-renderer .title, ' +
      'ytmusic-header-renderer .title'
    );
    if (headerTitle) {
      playlistTitle = headerTitle.textContent.trim();
    } else if (track.title) {
      playlistTitle = `${track.title} Mix`;
    }

    // Show INSTANT toast notification
    showToast(`Downloading Playlist "${playlistTitle}" in MP4 format...`, 'loading');

    const playlistUrl = `https://www.youtube.com/playlist?list=${listId}`;

    sendDownloadRequest({
      downloadType: 'playlist',
      url: playlistUrl,
      title: playlistTitle,
      artist: '',
      lyrics: null
    });
  }

  window.__ytm_download_current_song = downloadCurrentSong;
  window.__ytm_download_current_playlist = downloadCurrentPlaylist;

  /* ==========================================================================
     5. FLOATING QUICK-ACTION BAR (ALWAYS VISIBLE & ACCESSIBLE)
     ========================================================================== */
  function installFloatingActionBar() {
    if (document.getElementById('ytm-floating-bar')) return;
    const parent = document.body || document.documentElement;
    if (!parent) return;

    const bar = document.createElement('div');
    bar.id = 'ytm-floating-bar';
    bar.style.cssText = [
      'position: fixed !important',
      'top: 14px !important',
      'right: 120px !important',
      'z-index: 2147483640 !important',
      'display: flex !important',
      'align-items: center !important',
      'gap: 8px !important',
      'user-select: none !important'
    ].join(';');

    // 1. Download Current Song Button (Vibrant Red Pill)
    const songBtn = document.createElement('button');
    songBtn.id = 'ytm-float-dl-song';
    songBtn.title = 'Download current song in MP4 format with lyrics';
    songBtn.style.cssText = [
      'display: inline-flex !important',
      'align-items: center !important',
      'gap: 6px !important',
      'padding: 7px 15px !important',
      'background: linear-gradient(135deg, #cc0000 0%, #ff0000 100%) !important',
      'border: none !important',
      'border-radius: 20px !important',
      'color: #ffffff !important',
      'font-size: 12.5px !important',
      'font-weight: 700 !important',
      'font-family: system-ui, sans-serif !important',
      'cursor: pointer !important',
      'box-shadow: 0 4px 14px rgba(255, 0, 0, 0.45) !important',
      'transition: transform 0.15s ease, box-shadow 0.15s ease !important'
    ].join(';');
    songBtn.innerHTML = '<span>⬇️ Download Song</span>';
    songBtn.onclick = (e) => {
      e.stopPropagation();
      downloadCurrentSong();
    };
    songBtn.onmouseenter = () => { songBtn.style.transform = 'scale(1.05)'; };
    songBtn.onmouseleave = () => { songBtn.style.transform = 'scale(1)'; };
    bar.appendChild(songBtn);

    // 2. Download Playlist Button (Frosted Dark Pill)
    const plBtn = document.createElement('button');
    plBtn.id = 'ytm-float-dl-playlist';
    plBtn.title = 'Download currently viewed playlist/album in MP4';
    plBtn.style.cssText = [
      'display: inline-flex !important',
      'align-items: center !important',
      'gap: 6px !important',
      'padding: 7px 14px !important',
      'background: rgba(255, 255, 255, 0.1) !important',
      'border: 1px solid rgba(255, 255, 255, 0.2) !important',
      'backdrop-filter: blur(16px) !important',
      'border-radius: 20px !important',
      'color: #ffffff !important',
      'font-size: 12.5px !important',
      'font-weight: 600 !important',
      'font-family: system-ui, sans-serif !important',
      'cursor: pointer !important',
      'transition: transform 0.15s ease, background 0.15s ease !important'
    ].join(';');
    plBtn.innerHTML = '<span>⬇️ Playlist</span>';
    plBtn.onclick = (e) => {
      e.stopPropagation();
      downloadCurrentPlaylist();
    };
    plBtn.onmouseenter = () => { plBtn.style.transform = 'scale(1.05)'; plBtn.style.background = 'rgba(255,255,255,0.18)'; };
    plBtn.onmouseleave = () => { plBtn.style.transform = 'scale(1)'; plBtn.style.background = 'rgba(255,255,255,0.1)'; };
    bar.appendChild(plBtn);

    // 3. Open Downloads Folder Button
    const folderBtn = document.createElement('button');
    folderBtn.id = 'ytm-float-dl-folder';
    folderBtn.title = 'Open downloads folder in Windows File Explorer';
    folderBtn.style.cssText = [
      'display: inline-flex !important',
      'align-items: center !important',
      'gap: 5px !important',
      'padding: 7px 12px !important',
      'background: rgba(255, 255, 255, 0.08) !important',
      'border: 1px solid rgba(255, 255, 255, 0.15) !important',
      'border-radius: 20px !important',
      'color: #ffffff !important',
      'font-size: 12px !important',
      'font-weight: 500 !important',
      'font-family: system-ui, sans-serif !important',
      'cursor: pointer !important',
      'transition: transform 0.15s ease !important'
    ].join(';');
    folderBtn.innerHTML = '<span>📂 Downloads</span>';
    folderBtn.onclick = (e) => {
      e.stopPropagation();
      triggerOpenFolder();
    };
    bar.appendChild(folderBtn);

    // 4. Dark Theme Pill
    const themeBtn = document.createElement('button');
    themeBtn.id = 'ytm-float-theme';
    themeBtn.title = 'Switch dark theme: AMOLED / Obsidian / Studio';
    themeBtn.style.cssText = [
      'display: inline-flex !important',
      'align-items: center !important',
      'gap: 5px !important',
      'padding: 7px 12px !important',
      'background: rgba(255, 255, 255, 0.08) !important',
      'border: 1px solid rgba(255, 255, 255, 0.15) !important',
      'border-radius: 20px !important',
      'color: #ffffff !important',
      'font-size: 12px !important',
      'font-weight: 500 !important',
      'font-family: system-ui, sans-serif !important',
      'cursor: pointer !important'
    ].join(';');
    const currentTheme = window.__ytm_get_theme ? window.__ytm_get_theme() : 'amoled';
    themeBtn.innerHTML = `<span>🎨 <span id="ytm-theme-btn-lbl">${currentTheme.toUpperCase()}</span></span>`;
    const themeKeys = ['amoled', 'obsidian', 'studio'];
    themeBtn.onclick = (e) => {
      e.stopPropagation();
      const curr = window.__ytm_get_theme ? window.__ytm_get_theme() : 'amoled';
      const nextIdx = (themeKeys.indexOf(curr) + 1) % themeKeys.length;
      applyTheme(themeKeys[nextIdx]);
      const lbl = document.getElementById('ytm-theme-btn-lbl');
      if (lbl) lbl.textContent = themeKeys[nextIdx].toUpperCase();
    };
    bar.appendChild(themeBtn);

    parent.appendChild(bar);
  }

  /* ==========================================================================
     6. UI BUTTONS INJECTION (PLAYER BAR & PLAYLIST HEADER)
     ========================================================================== */
  function installPlayerDownloadButton() {
    if (queryDeep('#ytm-player-dl-btn')) return;

    const playerBar = document.querySelector('ytmusic-player-bar');
    if (!playerBar) return;
    const root = playerBar.shadowRoot || playerBar;

    const middleControls = root.querySelector('.middle-controls') || root.querySelector('#middle-controls');
    if (!middleControls) return;

    const btn = document.createElement('div');
    btn.id = 'ytm-player-dl-btn';
    btn.title = 'Download ONLY this song (MP4 with lyrics)';
    btn.style.cssText = [
      'display: inline-flex !important',
      'align-items: center !important',
      'gap: 6px !important',
      'padding: 6px 14px !important',
      'margin-left: 14px !important',
      'background: linear-gradient(135deg, #cc0000 0%, #ff0000 100%) !important',
      'border: none !important',
      'border-radius: 20px !important',
      'color: #ffffff !important',
      'font-size: 12px !important',
      'font-weight: 600 !important',
      'cursor: pointer !important',
      'user-select: none !important',
      'box-shadow: 0 2px 8px rgba(255, 0, 0, 0.4) !important',
      'z-index: 999 !important'
    ].join(';');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:#fff;">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
      </svg>
      <span>Download Song</span>
    `;

    btn.onclick = (e) => {
      e.stopPropagation();
      downloadCurrentSong();
    };

    middleControls.appendChild(btn);
  }

  function installPlaylistHeaderButton() {
    if (!window.location.href.includes('list=')) return;
    if (queryDeep('#ytm-playlist-header-btn')) return;

    const container = queryDeep(
      'ytmusic-responsive-header-renderer .buttons, ' +
      'ytmusic-detail-header-renderer .buttons, ' +
      'ytmusic-editable-playlist-detail-header-renderer .buttons, ' +
      'ytmusic-header-renderer .buttons'
    );
    if (!container) return;

    const btn = document.createElement('button');
    btn.id = 'ytm-playlist-header-btn';
    btn.className = 'ytm-playlist-header-btn';
    btn.title = 'Download entire playlist in MP4 format with lyrics';
    btn.style.cssText = [
      'display: inline-flex !important',
      'align-items: center !important',
      'gap: 8px !important',
      'padding: 10px 20px !important',
      'margin-right: 12px !important',
      'background: linear-gradient(135deg, #cc0000 0%, #ff0000 100%) !important',
      'border: none !important',
      'border-radius: 24px !important',
      'color: #ffffff !important',
      'font-size: 13px !important',
      'font-weight: 600 !important',
      'cursor: pointer !important',
      'box-shadow: 0 4px 14px rgba(255, 0, 0, 0.45) !important'
    ].join(';');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:#fff;">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
      </svg>
      <span>Download Entire Playlist (MP4)</span>
    `;

    btn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      downloadCurrentPlaylist();
    };

    container.insertBefore(btn, container.firstChild);
  }

  // Intercept track-specific download clicks across Shadow DOM boundaries
  document.addEventListener('click', (e) => {
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [e.target];
    if (!path || path.length === 0) return;

    let downloadClicked = false;
    let clickedRow = null;

    for (const node of path) {
      if (!node || !node.getAttribute) continue;

      const tag = (node.tagName || '').toLowerCase();
      if (tag === 'ytmusic-responsive-list-item-renderer') {
        clickedRow = node;
      }

      const text = (node.textContent || '').trim().toLowerCase();
      const aria = (node.getAttribute('aria-label') || '').toLowerCase();
      const title = (node.getAttribute('title') || '').toLowerCase();

      if (
        text === 'download' || 
        text === 'download song' || 
        text === 'download playlist' ||
        aria.includes('download') || 
        title.includes('download')
      ) {
        downloadClicked = true;
      }
    }

    if (downloadClicked) {
      e.preventDefault();
      e.stopPropagation();

      if (clickedRow) {
        const titleEl = clickedRow.querySelector('.title, yt-formatted-string.title');
        const title = titleEl ? titleEl.textContent.trim() : null;
        const link = clickedRow.querySelector('a[href*="watch"], a[href*="v="]');
        const url = link ? link.href : null;
        downloadCurrentSong(url, title);
      } else if (window.location.href.includes('list=')) {
        downloadCurrentPlaylist();
      } else {
        downloadCurrentSong();
      }
    }
  }, true);

  /* ==========================================================================
     7. DARK THEMES ENGINE (AMOLED / OBSIDIAN / STUDIO)
     ========================================================================== */
  const THEMES = {
    amoled: {
      name: 'AMOLED Black',
      id: 'amoled',
      css: `
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

        ytmusic-player-bar,
        #player-bar-background.ytmusic-app-layout,
        ytmusic-app-layout > [slot="player-bar"] {
          background: #000000 !important;
          border-top: 1px solid #141414 !important;
        }

        #guide-wrapper.ytmusic-app-layout,
        ytmusic-guide-section-renderer {
          background: #000000 !important;
          border-right: 1px solid #141414 !important;
        }

        ytmusic-two-row-item-renderer,
        ytmusic-responsive-list-item-renderer,
        tp-yt-paper-dialog,
        ytmusic-menu-popup-renderer {
          background-color: #080808 !important;
          border: 1px solid #161616 !important;
        }

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

        ytmusic-nav-bar {
          background: rgba(10, 12, 18, 0.9) !important;
          backdrop-filter: blur(20px) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
        }

        ytmusic-player-bar,
        #player-bar-background.ytmusic-app-layout,
        ytmusic-app-layout > [slot="player-bar"] {
          background: rgba(13, 16, 24, 0.88) !important;
          backdrop-filter: blur(24px) saturate(180%) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.6) !important;
        }

        #guide-wrapper.ytmusic-app-layout {
          background: rgba(9, 11, 16, 0.95) !important;
          border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
        }

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
    ytmusic-guide-entry-renderer:has(yt-formatted-string[title*="Upgrade"]) {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      height: 0 !important;
      width: 0 !important;
    }

    /* Sleek Dark Scrollbars */
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
  `;

  let baseStyleEl = null;
  let themeStyleEl = null;

  function injectBaseStyles() {
    if (baseStyleEl) return;
    const parent = document.head || document.documentElement;
    if (!parent) {
      setTimeout(injectBaseStyles, 50);
      return;
    }
    baseStyleEl = document.createElement('style');
    baseStyleEl.id = 'ytm-native-base-styles';
    baseStyleEl.textContent = BASE_ENHANCEMENT_CSS;
    parent.appendChild(baseStyleEl);
  }

  function applyTheme(themeKey) {
    if (!THEMES[themeKey]) themeKey = 'amoled';
    try {
      localStorage.setItem('ytm_native_theme', themeKey);
    } catch (e) {}

    const parent = document.head || document.documentElement;
    if (!parent) {
      setTimeout(() => applyTheme(themeKey), 50);
      return;
    }
    if (!themeStyleEl) {
      themeStyleEl = document.createElement('style');
      themeStyleEl.id = 'ytm-native-theme-styles';
      parent.appendChild(themeStyleEl);
    }
    themeStyleEl.textContent = THEMES[themeKey].css;
  }

  window.__ytm_set_theme = applyTheme;
  window.__ytm_get_theme = () => {
    try {
      return localStorage.getItem('ytm_native_theme') || 'amoled';
    } catch (e) {
      return 'amoled';
    }
  };

  /* ==========================================================================
     8. MEDIA CONTROLS & DISCORD RPC BRIDGE
     ========================================================================== */
  window.__ytm_play_pause = function() {
    const btn = queryDeep('#play-pause-button, .play-pause-button');
    if (btn) btn.click();
  };

  window.__ytm_next = function() {
    const btn = queryDeep('.next-button');
    if (btn) btn.click();
  };

  window.__ytm_prev = function() {
    const btn = queryDeep('.previous-button');
    if (btn) btn.click();
  };

  function getMediaInfo() {
    const video = document.querySelector('video');
    const track = getCurrentTrackDetails();
    const artworkEl = queryDeep('ytmusic-player-bar .image');

    const title = track.title;
    const artist = track.artist;
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
    if (window.__TAURI__ && window.__TAURI__.event && typeof window.__TAURI__.event.emit === 'function') {
      window.__TAURI__.event.emit('track_change', info);
    }
  }

  setInterval(syncMediaState, 2000);

  /* ==========================================================================
     9. INITIALIZATION & RECURRENT COMPONENT INJECTOR
     ========================================================================== */
  function injectAllComponents() {
    try {
      installFloatingActionBar();
      installPlayerDownloadButton();
      installPlaylistHeaderButton();
    } catch (e) {
      console.warn('[YTM-Native] Injection notice:', e);
    }
  }

  function init() {
    injectBaseStyles();
    const savedTheme = window.__ytm_get_theme();
    applyTheme(savedTheme);

    // Initial injection
    injectAllComponents();

    // Recurring interval to survive YouTube Music page navigations & polymer updates
    setInterval(injectAllComponents, 1000);

    // Announce suite readiness with a welcoming toast
    setTimeout(() => {
      showToast('YouTube Music Native Suite Active', 'info');
    }, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
