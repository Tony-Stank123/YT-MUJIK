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
     3. BULLETPROOF TOAST NOTIFICATION SYSTEM (TOP-CENTER & 100% VISIBLE)
     ========================================================================== */
  function ensureToastContainer() {
    let container = document.getElementById('ytm-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ytm-toast-container';
    }

    container.style.cssText = [
      'position: fixed !important',
      'top: 24px !important',
      'left: 50% !important',
      'transform: translateX(-50%) !important',
      'z-index: 2147483647 !important',
      'display: flex !important',
      'flex-direction: column !important',
      'align-items: center !important',
      'gap: 10px !important',
      'pointer-events: none !important',
      'max-width: 520px !important',
      'width: 90% !important'
    ].join(';');

    const targetParent = document.body || document.documentElement;
    if (targetParent && container.parentElement !== targetParent) {
      targetParent.appendChild(container);
    }
    return container;
  }

  function showToast(message, type = 'info', actionText = null, actionCallback = null) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `ytm-toast ytm-toast-${type}`;

    let borderColor = 'rgba(59, 130, 246, 0.9)';
    let glow = 'rgba(59, 130, 246, 0.5)';
    let iconHtml = 'ℹ️';

    if (type === 'loading') {
      borderColor = 'rgba(255, 30, 30, 0.95)';
      glow = 'rgba(255, 30, 30, 0.6)';
      iconHtml = '⏳';
    } else if (type === 'success') {
      borderColor = 'rgba(34, 197, 94, 0.95)';
      glow = 'rgba(34, 197, 94, 0.6)';
      iconHtml = '✅';
    } else if (type === 'error') {
      borderColor = 'rgba(239, 68, 68, 0.95)';
      glow = 'rgba(239, 68, 68, 0.6)';
      iconHtml = '❌';
    }

    toast.style.cssText = [
      'pointer-events: auto !important',
      'display: flex !important',
      'align-items: center !important',
      'justify-content: space-between !important',
      'gap: 14px !important',
      'padding: 14px 22px !important',
      'background: rgba(14, 16, 24, 0.97) !important',
      'backdrop-filter: blur(20px) !important',
      'border: 2px solid ' + borderColor + ' !important',
      'border-radius: 14px !important',
      'color: #ffffff !important',
      'font-size: 14px !important',
      'font-weight: 600 !important',
      'font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
      'box-shadow: 0 14px 36px rgba(0, 0, 0, 0.9), 0 0 20px ' + glow + ' !important',
      'opacity: 1 !important',
      'transition: opacity 0.3s ease, transform 0.3s ease !important',
      'transform: translateY(0) !important',
      'z-index: 2147483647 !important',
      'width: 100% !important',
      'box-sizing: border-box !important'
    ].join(';');

    const msgEl = document.createElement('div');
    msgEl.style.cssText = 'flex: 1 1 auto; line-height: 1.4; word-break: break-word; color: #ffffff !important; display: flex; align-items: center; gap: 8px;';
    msgEl.innerHTML = `<span style="font-size:20px; flex-shrink: 0;">${iconHtml}</span> <span>${message}</span>`;
    toast.appendChild(msgEl);

    // Action button (e.g. Open Downloads Folder)
    if (type === 'success' || actionText) {
      const btn = document.createElement('button');
      btn.style.cssText = [
        'background: rgba(34, 197, 94, 0.25) !important',
        'border: 1.5px solid rgba(34, 197, 94, 0.7) !important',
        'color: #ffffff !important',
        'padding: 8px 16px !important',
        'border-radius: 8px !important',
        'font-size: 13px !important',
        'font-weight: 700 !important',
        'cursor: pointer !important',
        'margin-left: 10px !important',
        'white-space: nowrap !important',
        'flex-shrink: 0 !important',
        'box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3) !important'
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

    const duration = type === 'loading' ? 15000 : 8000;
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-12px)';
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 350);
    }, duration);

    return toast;
  }

  window.showToast = showToast;
  window.__ytm_show_toast = showToast;

  /* ==========================================================================
     DIRECT RUST-WEBVIEW ACTION QUEUE (100% UNBLOCKABLE COMMUNICATION)
     ========================================================================== */
  window.__ytm_pending_actions = window.__ytm_pending_actions || [];

  window.__ytm_poll_pending_actions = function() {
    if (!window.__ytm_pending_actions || window.__ytm_pending_actions.length === 0) {
      return null;
    }
    const actions = window.__ytm_pending_actions;
    window.__ytm_pending_actions = [];
    return JSON.stringify(actions);
  };

  function enqueueAction(type, payload) {
    if (!window.__ytm_pending_actions) window.__ytm_pending_actions = [];
    window.__ytm_pending_actions.push({ type, payload });
  }

  function triggerOpenFolder() {
    showToast('Opening downloads folder...', 'info');

    // 1. Direct Polling Queue (Instant and guaranteed)
    enqueueAction('open_downloads', {});

    // 2. Navigation bridge
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'https://ytm-command.local/open_downloads';
      (document.body || document.documentElement).appendChild(iframe);
      setTimeout(() => { try { iframe.remove(); } catch(e){} }, 2000);
    } catch (e) {}

    // 3. Tauri invoke
    try {
      if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
        window.__TAURI__.core.invoke('open_downloads_folder').catch(console.error);
      } else if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === 'function') {
        window.__TAURI_INTERNALS__.invoke('open_downloads_folder').catch(console.error);
      }
      if (window.__TAURI__ && window.__TAURI__.event && typeof window.__TAURI__.event.emit === 'function') {
        window.__TAURI__.event.emit('open_downloads_folder', {}).catch(console.error);
      }
    } catch (e) {}
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

    // Tier 1: MediaSession API (Authoritative & instant across YouTube Music)
    if (navigator.mediaSession && navigator.mediaSession.metadata) {
      const meta = navigator.mediaSession.metadata;
      if (meta.title && meta.title.trim()) title = meta.title.trim();
      if (meta.artist && meta.artist.trim()) artist = meta.artist.trim();
    }

    // Tier 2: HTML5 video player API (Deep query across Shadow DOM)
    const player = queryDeep('#movie_player, .html5-video-player');
    if (player) {
      if (typeof player.getVideoData === 'function') {
        try {
          const vData = player.getVideoData();
          if (vData) {
            if (vData.video_id) videoId = vData.video_id;
            if (!title && vData.title) title = vData.title.trim();
            if (!artist && vData.author) artist = vData.author.trim();
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

    // Tier 3: DOM Player Bar Elements (Deep shadow DOM query)
    if (!title) {
      const titleEl = queryDeep('ytmusic-player-bar .title, ytmusic-player-bar yt-formatted-string.title, .title.ytmusic-player-bar, ytmusic-player-bar .content-info-wrapper yt-formatted-string');
      if (titleEl && titleEl.textContent && titleEl.textContent.trim()) {
        title = titleEl.textContent.trim();
      }
    }

    if (!artist) {
      const bylineEl = queryDeep('ytmusic-player-bar .byline, ytmusic-player-bar yt-formatted-string.byline, .byline.ytmusic-player-bar, ytmusic-player-bar .content-info-wrapper .byline');
      if (bylineEl && bylineEl.textContent && bylineEl.textContent.trim()) {
        artist = bylineEl.textContent.trim();
      }
    }

    // Tier 4: Location URL or player bar link
    if (!videoId) {
      videoId = extractVideoId(window.location.href);
    }
    if (!videoId) {
      const link = queryDeep('ytmusic-player-bar a[href*="watch"], ytmusic-player-bar a[href*="v="]');
      if (link && link.href) {
        videoId = extractVideoId(link.href);
      }
    }

    if (!playlistId) {
      playlistId = extractPlaylistId(window.location.href);
    }

    return { videoId, title, artist, playlistId };
  }

  function promptSongDownload() {
    if (document.getElementById('ytm-prompt-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'ytm-prompt-modal';
    modal.style.cssText = [
      'position: fixed !important',
      'top: 0 !important',
      'left: 0 !important',
      'width: 100vw !important',
      'height: 100vh !important',
      'background: rgba(0, 0, 0, 0.75) !important',
      'backdrop-filter: blur(12px) !important',
      'z-index: 2147483647 !important',
      'display: flex !important',
      'align-items: center !important',
      'justify-content: center !important'
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'background: #11131a !important',
      'border: 1.5px solid rgba(255, 0, 0, 0.5) !important',
      'border-radius: 16px !important',
      'padding: 24px 28px !important',
      'max-width: 440px !important',
      'width: 90% !important',
      'box-shadow: 0 16px 40px rgba(0, 0, 0, 0.9) !important',
      'display: flex !important',
      'flex-direction: column !important',
      'gap: 16px !important',
      'font-family: system-ui, -apple-system, sans-serif !important',
      'color: #ffffff !important'
    ].join(';');

    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:22px;">⬇️</span>
        <div>
          <div style="font-size:16px; font-weight:700;">Download Song in MP4</div>
          <div style="font-size:12px; color:rgba(255,255,255,0.6);">Play a song or enter any song name below</div>
        </div>
      </div>
      <input id="ytm-prompt-input" type="text" placeholder="e.g. Paaro or Aditya Rikhari" style="
        background: #181b24 !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        border-radius: 8px !important;
        color: #ffffff !important;
        font-size: 14px !important;
        padding: 10px 14px !important;
        outline: none !important;
        width: 100% !important;
        box-sizing: border-box !important;
      " />
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button id="ytm-prompt-cancel" style="
          background: rgba(255,255,255,0.1) !important;
          border: none !important;
          border-radius: 8px !important;
          color: #fff !important;
          padding: 8px 16px !important;
          cursor: pointer !important;
          font-weight: 600 !important;
        ">Cancel</button>
        <button id="ytm-prompt-submit" style="
          background: linear-gradient(135deg, #cc0000 0%, #ff0000 100%) !important;
          border: none !important;
          border-radius: 8px !important;
          color: #fff !important;
          padding: 8px 20px !important;
          cursor: pointer !important;
          font-weight: 700 !important;
          box-shadow: 0 4px 12px rgba(255,0,0,0.4) !important;
        ">⬇️ Download</button>
      </div>
    `;

    modal.appendChild(card);
    (document.body || document.documentElement).appendChild(modal);

    const input = card.querySelector('#ytm-prompt-input');
    const cancelBtn = card.querySelector('#ytm-prompt-cancel');
    const submitBtn = card.querySelector('#ytm-prompt-submit');

    if (input) input.focus();

    const doSubmit = () => {
      const val = input ? input.value.trim() : '';
      modal.remove();
      if (!val) {
        showToast('⚠️ No song entered.', 'error');
        return;
      }
      showToast(`Searching & downloading "${val}" (MP4)...`, 'loading');
      sendDownloadRequest({
        downloadType: 'song',
        url: `ytsearch1:${val}`,
        title: val,
        artist: '',
        lyrics: null
      });
    };

    if (submitBtn) submitBtn.onclick = doSubmit;
    if (cancelBtn) cancelBtn.onclick = () => modal.remove();
    if (input) {
      input.onkeydown = (e) => {
        if (e.key === 'Enter') doSubmit();
        if (e.key === 'Escape') modal.remove();
      };
    }
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

    // 1. Direct Polling Queue (Instant, 100% reliable across all security boundaries)
    enqueueAction('download', payload);

    // 2. Navigation bridge
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'https://ytm-command.local/download?data=' + encodeURIComponent(JSON.stringify(payload));
      (document.body || document.documentElement).appendChild(iframe);
      setTimeout(() => { try { iframe.remove(); } catch(e){} }, 2000);
    } catch (e) {}

    // 3. Tauri invoke / events
    try {
      if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
        window.__TAURI__.core.invoke('trigger_download', { req: payload }).catch(() => {});
      }
      if (window.__TAURI__ && window.__TAURI__.event && typeof window.__TAURI__.event.emit === 'function') {
        window.__TAURI__.event.emit('trigger_download', payload).catch(() => {});
      }
    } catch (e) {}
  }

  // 1. DOWNLOAD SPECIFIC SONG FROM A ROW OR SEARCH RESULT
  function downloadSongRow(customUrl, title, artist) {
    let cleanUrl = (customUrl || '').trim();
    if (cleanUrl.includes('music.youtube.com')) {
      cleanUrl = cleanUrl.replace('music.youtube.com', 'www.youtube.com');
    }
    if (cleanUrl.includes('&list=')) {
      cleanUrl = cleanUrl.split('&list=')[0];
    }
    if (cleanUrl.includes('?list=') && cleanUrl.includes('/watch')) {
      cleanUrl = cleanUrl.split('?list=')[0];
    }

    let videoId = extractVideoId(cleanUrl);
    let finalUrl = '';
    if (videoId) {
      finalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    } else if (title) {
      finalUrl = `ytsearch1:${artist ? title + ' ' + artist : title}`;
    } else {
      finalUrl = cleanUrl;
    }

    const songTitle = title || 'Music Track';
    showToast(`Downloading "${songTitle}" in MP4 format...`, 'loading');

    sendDownloadRequest({
      downloadType: 'song',
      url: finalUrl,
      title: songTitle,
      artist: artist || '',
      lyrics: null
    });
  }

  // 2. DOWNLOAD CURRENTLY PLAYING SONG ONLY (Strips all &list= and queue params)
  function downloadCurrentSong(customVideoUrl = null, customTitle = null) {
    const track = getCurrentTrackDetails();
    let currentUrl = customVideoUrl || window.location.href;
    let videoId = customVideoUrl ? extractVideoId(customVideoUrl) : track.videoId;
    let title = customTitle || track.title || '';
    let artist = track.artist || '';

    // If title and videoId are completely missing, try reading directly from player bar
    if (!videoId && !title) {
      const titleEl = queryDeep('ytmusic-player-bar .title, ytmusic-player-bar yt-formatted-string.title, .title.ytmusic-player-bar');
      if (titleEl && titleEl.textContent && titleEl.textContent.trim()) {
        title = titleEl.textContent.trim();
      }
      const bylineEl = queryDeep('ytmusic-player-bar .byline, ytmusic-player-bar yt-formatted-string.byline, .byline.ytmusic-player-bar');
      if (bylineEl && bylineEl.textContent && bylineEl.textContent.trim()) {
        artist = bylineEl.textContent.trim();
      }
    }

    // Strict single song URL construction
    let songUrl = '';
    if (videoId) {
      songUrl = `https://www.youtube.com/watch?v=${videoId}`;
    } else if (title && title !== 'Music Track' && title !== 'Current Song') {
      songUrl = `ytsearch1:${artist ? title + ' ' + artist : title}`;
    } else {
      songUrl = currentUrl.split('&list=')[0].split('?list=')[0];
    }

    const finalTitle = title || 'Music Track';

    // Show INSTANT top-center toast notification
    showToast(`Downloading "${finalTitle}" in MP4 format...`, 'loading');

    const lyrics = extractCurrentLyrics();

    sendDownloadRequest({
      downloadType: 'song',
      url: songUrl,
      title: finalTitle,
      artist: artist,
      lyrics: lyrics
    });
  }

  // 3. DOWNLOAD ENTIRE PLAYLIST OR ALBUM
  function downloadCurrentPlaylist() {
    const track = getCurrentTrackDetails();
    let listId = track.playlistId || extractPlaylistId(window.location.href);

    if (!listId) {
      const link = queryDeep('ytmusic-player-bar .title a, a[href*="list="]');
      if (link && link.href) {
        listId = extractPlaylistId(link.href);
      }
    }

    let playlistUrl = '';
    if (listId) {
      playlistUrl = `https://www.youtube.com/playlist?list=${listId}`;
    } else if (window.location.href.includes('/browse/MPREb_') || window.location.href.includes('/playlist')) {
      playlistUrl = window.location.href.replace('music.youtube.com', 'www.youtube.com');
    } else {
      showToast('⚠️ Please open a playlist or album to download it!', 'error');
      return;
    }

    let playlistTitle = 'Playlist';
    const headerTitle = queryDeep(
      'ytmusic-responsive-header-renderer .title, ' +
      'ytmusic-detail-header-renderer .title, ' +
      'ytmusic-editable-playlist-detail-header-renderer .title, ' +
      'ytmusic-header-renderer .title'
    );
    if (headerTitle && headerTitle.textContent.trim()) {
      playlistTitle = headerTitle.textContent.trim();
    } else if (track.title) {
      playlistTitle = `${track.title} Mix`;
    }

    // Show INSTANT top-center toast notification
    showToast(`Downloading Playlist "${playlistTitle}" in MP4 format...`, 'loading');

    sendDownloadRequest({
      downloadType: 'playlist',
      url: playlistUrl,
      title: playlistTitle,
      artist: '',
      lyrics: null
    });
  }

  window.__ytm_download_song_row = downloadSongRow;
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
      'top: 12px !important',
      'right: 90px !important',
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
      'padding: 7px 16px !important',
      'background: linear-gradient(135deg, #cc0000 0%, #ff0000 100%) !important',
      'border: none !important',
      'border-radius: 20px !important',
      'color: #ffffff !important',
      'font-size: 13px !important',
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
      'background: rgba(255, 255, 255, 0.12) !important',
      'border: 1px solid rgba(255, 255, 255, 0.25) !important',
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
    plBtn.onmouseenter = () => { plBtn.style.transform = 'scale(1.05)'; plBtn.style.background = 'rgba(255,255,255,0.2)'; };
    plBtn.onmouseleave = () => { plBtn.style.transform = 'scale(1)'; plBtn.style.background = 'rgba(255,255,255,0.12)'; };
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
     6. UI BUTTONS INJECTION (PLAYER BAR, TRACK ROWS, & PLAYLIST HEADER)
     ========================================================================== */
  function installPlayerDownloadButtons() {
    const playerBar = document.querySelector('ytmusic-player-bar');
    if (!playerBar) return;
    const root = playerBar.shadowRoot || playerBar;

    // 1. LEFT CONTROLS: Directly next to song title/artist and like button!
    const leftControls = root.querySelector('.left-controls') || root.querySelector('#left-controls');
    if (leftControls && !leftControls.querySelector('#ytm-player-dl-left-btn')) {
      const leftBtn = document.createElement('button');
      leftBtn.id = 'ytm-player-dl-left-btn';
      leftBtn.title = 'Download this playing song in MP4 format with lyrics';
      leftBtn.style.cssText = [
        'display: inline-flex !important',
        'align-items: center !important',
        'gap: 6px !important',
        'padding: 7px 16px !important',
        'margin-left: 14px !important',
        'background: linear-gradient(135deg, #cc0000 0%, #ff0000 100%) !important',
        'border: none !important',
        'border-radius: 20px !important',
        'color: #ffffff !important',
        'font-size: 12.5px !important',
        'font-weight: 700 !important',
        'cursor: pointer !important',
        'user-select: none !important',
        'box-shadow: 0 4px 12px rgba(255, 0, 0, 0.5) !important',
        'z-index: 9999 !important',
        'flex-shrink: 0 !important',
        'transition: transform 0.15s ease !important'
      ].join(';');
      leftBtn.innerHTML = `
        <svg viewBox="0 0 24 24" style="width:15px; height:15px; fill:#fff;">
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
        </svg>
        <span>⬇️ Download Song</span>
      `;
      leftBtn.onclick = (e) => {
        e.stopPropagation();
        downloadCurrentSong();
      };
      leftBtn.onmouseenter = () => { leftBtn.style.transform = 'scale(1.05)'; };
      leftBtn.onmouseleave = () => { leftBtn.style.transform = 'scale(1)'; };
      leftControls.appendChild(leftBtn);
    }

    // 2. MIDDLE CONTROLS: Beside playback controls
    const middleControls = root.querySelector('.middle-controls') || root.querySelector('#middle-controls');
    if (middleControls && !middleControls.querySelector('#ytm-player-dl-btn')) {
      const btn = document.createElement('div');
      btn.id = 'ytm-player-dl-btn';
      btn.title = 'Download ONLY this song (MP4 with lyrics)';
      btn.style.cssText = [
        'display: inline-flex !important',
        'align-items: center !important',
        'gap: 6px !important',
        'padding: 6px 14px !important',
        'margin-left: 12px !important',
        'background: linear-gradient(135deg, #cc0000 0%, #ff0000 100%) !important',
        'border: none !important',
        'border-radius: 20px !important',
        'color: #ffffff !important',
        'font-size: 12px !important',
        'font-weight: 600 !important',
        'cursor: pointer !important',
        'user-select: none !important',
        'box-shadow: 0 2px 8px rgba(255, 0, 0, 0.4) !important',
        'z-index: 999 !important',
        'flex-shrink: 0 !important'
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
  }

  // 3. TRACK ROW DOWNLOAD BUTTONS: Injects direct download button on EVERY song row in search / playlists / albums
  function installRowDownloadButtons() {
    const rows = document.querySelectorAll('ytmusic-responsive-list-item-renderer');
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.querySelector('.ytm-row-dl-btn')) continue;

      const btn = document.createElement('button');
      btn.className = 'ytm-row-dl-btn';
      btn.title = 'Download this song in MP4 format with lyrics';
      btn.style.cssText = [
        'display: inline-flex !important',
        'align-items: center !important',
        'gap: 4px !important',
        'padding: 5px 12px !important',
        'background: rgba(255, 0, 0, 0.22) !important',
        'border: 1.5px solid rgba(255, 0, 0, 0.6) !important',
        'border-radius: 14px !important',
        'color: #ffffff !important',
        'font-size: 11.5px !important',
        'font-weight: 700 !important',
        'font-family: system-ui, sans-serif !important',
        'cursor: pointer !important',
        'margin-right: 8px !important',
        'margin-left: 4px !important',
        'z-index: 10 !important',
        'flex-shrink: 0 !important',
        'transition: all 0.15s ease !important'
      ].join(';');
      btn.innerHTML = '<span>⬇️ Download</span>';

      btn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();

        const titleEl = queryDeep('.title, yt-formatted-string.title, a.yt-simple-endpoint.yt-formatted-string', row);
        const title = titleEl ? titleEl.textContent.trim() : '';

        const artistEl = queryDeep('.byline, yt-formatted-string.byline, .secondary-flex-columns', row);
        const artist = artistEl ? artistEl.textContent.trim() : '';

        const link = queryDeep('a[href*="watch"], a[href*="v="]', row);
        const url = link ? link.href : '';

        downloadSongRow(url, title, artist);
      };

      btn.onmouseenter = () => {
        btn.style.background = '#ff0000 !important';
        btn.style.transform = 'scale(1.05)';
      };
      btn.onmouseleave = () => {
        btn.style.background = 'rgba(255, 0, 0, 0.22) !important';
        btn.style.transform = 'scale(1)';
      };

      const menu = row.querySelector('.menu, ytmusic-menu-renderer, #menu');
      if (menu && menu.parentElement) {
        menu.parentElement.insertBefore(btn, menu);
      } else {
        row.appendChild(btn);
      }
    }
  }

  // 4. PLAYLIST & ALBUM HEADER DOWNLOAD BUTTON
  function installPlaylistHeaderButton() {
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
    btn.title = 'Download entire playlist or album in MP4 format with lyrics';
    btn.style.cssText = [
      'display: inline-flex !important',
      'align-items: center !important',
      'gap: 8px !important',
      'padding: 10px 22px !important',
      'margin-right: 14px !important',
      'background: linear-gradient(135deg, #cc0000 0%, #ff0000 100%) !important',
      'border: none !important',
      'border-radius: 24px !important',
      'color: #ffffff !important',
      'font-size: 13.5px !important',
      'font-weight: 700 !important',
      'cursor: pointer !important',
      'box-shadow: 0 4px 16px rgba(255, 0, 0, 0.5) !important',
      'transition: transform 0.15s ease !important'
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
    btn.onmouseenter = () => { btn.style.transform = 'scale(1.04)'; };
    btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; };

    container.insertBefore(btn, container.firstChild);
  }

  // Track the most recent list row clicked for 3-dot menus
  let lastContextRow = null;

  // Intercept track-specific download clicks across Shadow DOM boundaries
  document.addEventListener('click', (e) => {
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [e.target];
    if (!path || path.length === 0) return;

    let downloadClicked = false;
    let clickedRow = null;

    for (const node of path) {
      if (!node) continue;

      const tag = (node.tagName || '').toLowerCase();
      if (tag === 'ytmusic-responsive-list-item-renderer') {
        clickedRow = node;
        lastContextRow = node;
      }

      if (node.getAttribute) {
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
    }

    if (downloadClicked) {
      e.preventDefault();
      e.stopPropagation();

      const targetRow = clickedRow || lastContextRow;
      if (targetRow) {
        const titleEl = queryDeep('.title, yt-formatted-string.title', targetRow);
        const title = titleEl ? titleEl.textContent.trim() : null;
        const link = queryDeep('a[href*="watch"], a[href*="v="]', targetRow);
        const url = link ? link.href : null;
        downloadCurrentSong(url, title);
        lastContextRow = null;
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
    enqueueAction('track_change', info);
    try {
      if (window.__TAURI__ && window.__TAURI__.event && typeof window.__TAURI__.event.emit === 'function') {
        window.__TAURI__.event.emit('track_change', info);
      }
    } catch (e) {}
  }

  setInterval(syncMediaState, 2000);

  /* ==========================================================================
     9. INITIALIZATION & RECURRENT COMPONENT INJECTOR
     ========================================================================== */
  function injectAllComponents() {
    try {
      installFloatingActionBar();
      installPlayerDownloadButtons();
      installRowDownloadButtons();
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
