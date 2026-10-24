// YouTube Music Native Desktop Enhancement Suite
// Features: Safe Ad-Skipper, Anti-Nag Shield, AMOLED/Obsidian/Studio Themes,
//           Dedicated Song & Playlist MP4 Downloader with Lyrics, Instant Toast Notifications

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
        const btn = document.querySelector(sel);
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
    const youThereBtn = document.querySelector('ytmusic-you-there-renderer yt-button-renderer button, #confirm-button');
    if (youThereBtn && youThereBtn.offsetParent !== null) {
      youThereBtn.click();
    }

    // Auto-dismiss upsell banners & trial promo modals
    const dismissBtn = document.querySelector('ytmusic-mealbar-promo-renderer #dismiss-button, ytmusic-upsell-dialog-renderer #dismiss-button');
    if (dismissBtn && dismissBtn.offsetParent !== null) {
      dismissBtn.click();
    }
  }

  setInterval(handleAdsAndPrompts, 250);

  /* ==========================================================================
     2. BULLETPROOF TOAST NOTIFICATION SYSTEM (INLINE-STYLED & GUARANTEED VISIBLE)
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
      'bottom: 92px !important',
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

    let borderColor = 'rgba(255, 255, 255, 0.2)';
    let glow = 'rgba(0, 0, 0, 0.7)';
    let iconHtml = '';

    if (type === 'loading') {
      borderColor = 'rgba(255, 0, 0, 0.7)';
      glow = 'rgba(255, 0, 0, 0.35)';
      iconHtml = '<span style="display:inline-block; font-size:16px;">⏳</span>';
    } else if (type === 'success') {
      borderColor = 'rgba(34, 197, 94, 0.7)';
      glow = 'rgba(34, 197, 94, 0.35)';
      iconHtml = '<span style="color:#22c55e; font-size:17px; font-weight:bold;">✓</span>';
    } else if (type === 'error') {
      borderColor = 'rgba(239, 68, 68, 0.7)';
      glow = 'rgba(239, 68, 68, 0.35)';
      iconHtml = '<span style="color:#ef4444; font-size:17px; font-weight:bold;">✕</span>';
    } else {
      borderColor = 'rgba(59, 130, 246, 0.7)';
      glow = 'rgba(59, 130, 246, 0.35)';
      iconHtml = '<span style="color:#3b82f6; font-size:17px; font-weight:bold;">ℹ</span>';
    }

    toast.style.cssText = [
      'pointer-events: auto !important',
      'display: flex !important',
      'align-items: center !important',
      'gap: 12px !important',
      'padding: 14px 18px !important',
      'background: rgba(18, 20, 28, 0.96) !important',
      'border: 1.5px solid ' + borderColor + ' !important',
      'border-radius: 12px !important',
      'color: #ffffff !important',
      'font-size: 13.5px !important',
      'font-weight: 600 !important',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
      'box-shadow: 0 10px 30px ' + glow + ', 0 2px 8px rgba(0,0,0,0.6) !important',
      'opacity: 1 !important',
      'transition: opacity 0.3s ease, transform 0.3s ease !important',
      'transform: translateY(0) !important',
      'z-index: 2147483647 !important'
    ].join(';');

    const msgEl = document.createElement('div');
    msgEl.style.cssText = 'flex: 1 1 auto; line-height: 1.4; word-break: break-word;';
    msgEl.innerHTML = `${iconHtml} <span style="margin-left:6px;">${message}</span>`;
    toast.appendChild(msgEl);

    // Action button
    if (actionText && actionCallback) {
      const btn = document.createElement('button');
      btn.style.cssText = [
        'background: rgba(255, 255, 255, 0.15) !important',
        'border: 1px solid rgba(255, 255, 255, 0.2) !important',
        'color: #ffffff !important',
        'padding: 5px 12px !important',
        'border-radius: 6px !important',
        'font-size: 12px !important',
        'font-weight: 600 !important',
        'cursor: pointer !important',
        'margin-left: 8px !important',
        'white-space: nowrap !important'
      ].join(';');
      btn.textContent = actionText;
      btn.onclick = (e) => {
        e.stopPropagation();
        actionCallback();
      };
      toast.appendChild(btn);
    } else if (type === 'success') {
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
        'margin-left: 8px !important',
        'white-space: nowrap !important'
      ].join(';');
      btn.textContent = '📂 Open Folder';
      btn.onclick = (e) => {
        e.stopPropagation();
        triggerOpenFolder();
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

  // Listen for download_status events from Rust if event system is ready
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
     3. MP4 DOWNLOAD ENGINE (MULTI-TIER TRACK & PLAYLIST EXTRACTION)
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

    // Tier 1: HTML5 video player API (The most authoritative source in YouTube Music!)
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
        } catch (e) {
          console.warn('[YTM-Native] Error reading player.getVideoData():', e);
        }
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

    // Tier 2: MediaSession API (Continuously updated by YouTube Music on track start)
    if (navigator.mediaSession && navigator.mediaSession.metadata) {
      const meta = navigator.mediaSession.metadata;
      if (!title && meta.title) title = meta.title.trim();
      if (!artist && meta.artist) artist = meta.artist.trim();
    }

    // Tier 3: DOM Player Bar Elements
    const titleEl = document.querySelector('ytmusic-player-bar .title');
    if (!title && titleEl) {
      title = titleEl.textContent.trim();
    }
    const bylineEl = document.querySelector('ytmusic-player-bar .byline');
    if (!artist && bylineEl) {
      artist = bylineEl.textContent.trim();
    }

    // Tier 4: Location URL or player bar link
    if (!videoId) {
      videoId = extractVideoId(window.location.href);
    }
    if (!videoId) {
      const link = document.querySelector('ytmusic-player-bar a[href*="watch"], ytmusic-player-bar a[href*="v="]');
      if (link && link.href) {
        videoId = extractVideoId(link.href);
      }
    }

    // Playlist ID fallback from location URL
    if (!playlistId) {
      playlistId = extractPlaylistId(window.location.href);
    }

    return { videoId, title, artist, playlistId };
  }

  function extractCurrentLyrics() {
    const lyricsEl = document.querySelector('ytmusic-description-shelf-renderer .description, ytmusic-player-page #tab-renderer [page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');
    if (lyricsEl && lyricsEl.innerText && lyricsEl.innerText.trim().length > 10) {
      return lyricsEl.innerText.trim();
    }
    return null;
  }

  function sendDownloadRequest(payload) {
    console.log('[YTM-Native] Sending download request:', payload);
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
      showToast('⚠️ No song is currently playing. Start playing a song first!', 'error');
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
      const link = document.querySelector('ytmusic-player-bar .title a, a[href*="list="]');
      if (link && link.href) {
        listId = extractPlaylistId(link.href);
      }
    }

    if (!listId) {
      showToast('⚠️ No playlist detected. Open an album or playlist first!', 'error');
      return;
    }

    let playlistTitle = 'Playlist';
    const headerTitle = document.querySelector(
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
     4. UI BUTTONS INJECTION (PLAYER BAR, NAVBAR & PLAYLIST HEADER)
     ========================================================================== */
  // Player Bar Download Button: ONLY downloads current song
  function installPlayerDownloadButton() {
    if (document.getElementById('ytm-player-dl-btn')) return;

    const middleControls = document.querySelector('ytmusic-player-bar .middle-controls');
    if (!middleControls) return;

    const btn = document.createElement('div');
    btn.id = 'ytm-player-dl-btn';
    btn.title = 'Download ONLY this song (MP4 with lyrics)';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
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

  // Navbar Buttons: Distinct Song, Playlist, and Downloads Folder buttons
  function installNavbarButtons() {
    const rightNav = document.querySelector('ytmusic-nav-bar #right-content');
    if (!rightNav) return;

    // 1. Download Song button
    if (!document.getElementById('ytm-navbar-dl-song-btn')) {
      const songBtn = document.createElement('div');
      songBtn.id = 'ytm-navbar-dl-song-btn';
      songBtn.className = 'ytm-nav-pill';
      songBtn.title = 'Download current song ONLY (MP4 with lyrics)';
      songBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zM17 14l-5 5-5-5h3v-4h4v4h3z"/>
        </svg>
        <span>⬇️ Song</span>
      `;
      songBtn.onclick = (e) => {
        e.stopPropagation();
        downloadCurrentSong();
      };
      rightNav.insertBefore(songBtn, rightNav.firstChild);
    }

    // 2. Download Playlist button
    if (!document.getElementById('ytm-navbar-dl-playlist-btn')) {
      const plBtn = document.createElement('div');
      plBtn.id = 'ytm-navbar-dl-playlist-btn';
      plBtn.className = 'ytm-nav-pill';
      plBtn.title = 'Download currently viewed playlist/album (MP4)';
      plBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
        </svg>
        <span>⬇️ Playlist</span>
      `;
      plBtn.onclick = (e) => {
        e.stopPropagation();
        downloadCurrentPlaylist();
      };
      rightNav.insertBefore(plBtn, rightNav.firstChild);
    }

    // 3. Open Downloads Folder button
    if (!document.getElementById('ytm-navbar-dl-folder-btn')) {
      const folderBtn = document.createElement('div');
      folderBtn.id = 'ytm-navbar-dl-folder-btn';
      folderBtn.className = 'ytm-nav-pill';
      folderBtn.title = 'Open downloads folder in Windows File Explorer';
      folderBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
        </svg>
        <span>📂 Downloads</span>
      `;
      folderBtn.onclick = (e) => {
        e.stopPropagation();
        triggerOpenFolder();
      };
      rightNav.insertBefore(folderBtn, rightNav.firstChild);
    }
  }

  // Playlist Page Header Button: ONLY downloads the whole playlist
  function installPlaylistHeaderButton() {
    if (!window.location.href.includes('list=')) return;
    if (document.getElementById('ytm-playlist-header-btn')) return;

    const container = document.querySelector(
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
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
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

  // Intercept track-specific download menu clicks
  document.addEventListener('click', (e) => {
    const target = e.target.closest('ytmusic-menu-navigation-item-renderer, button, tp-yt-paper-item');
    if (!target) return;

    const text = (target.textContent || '').trim().toLowerCase();
    const aria = (target.getAttribute('aria-label') || '').toLowerCase();

    if (text === 'download' || text === 'download song' || aria === 'download') {
      e.preventDefault();
      e.stopPropagation();

      // Check if clicked from a playlist header or a specific song row
      const isHeaderClick = target.closest('ytmusic-responsive-header-renderer, ytmusic-detail-header-renderer');
      if (isHeaderClick && window.location.href.includes('list=')) {
        downloadCurrentPlaylist();
      } else {
        // Find specific song row
        const row = target.closest('ytmusic-responsive-list-item-renderer');
        if (row) {
          const rowTitleEl = row.querySelector('.title');
          const rowTitle = rowTitleEl ? rowTitleEl.textContent.trim() : null;
          const rowLink = row.querySelector('.title a, a[href*="watch"]');
          const rowUrl = rowLink ? rowLink.href : null;
          downloadCurrentSong(rowUrl, rowTitle);
        } else {
          downloadCurrentSong();
        }
      }
    }
  }, true);

  /* ==========================================================================
     5. DARK THEMES ENGINE (AMOLED / OBSIDIAN / STUDIO)
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

    /* Navbar Pill Buttons */
    .ytm-nav-pill, #ytm-native-theme-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      margin-right: 8px;
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
    .ytm-nav-pill:hover, #ytm-native-theme-pill:hover {
      background: rgba(255, 0, 0, 0.2);
      border-color: #ff0000;
      box-shadow: 0 0 12px rgba(255, 0, 0, 0.4);
    }
    .ytm-nav-pill svg, #ytm-native-theme-pill svg {
      width: 14px;
      height: 14px;
      fill: #ff0000;
    }

    /* Player Bar Download Button */
    #ytm-player-dl-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      margin-left: 16px;
      background: linear-gradient(135deg, #cc0000 0%, #ff0000 100%);
      border: none;
      border-radius: 20px;
      color: #ffffff;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      box-shadow: 0 2px 8px rgba(255, 0, 0, 0.35);
      transition: all 0.2s ease;
      z-index: 999;
    }
    #ytm-player-dl-btn:hover {
      transform: scale(1.04);
      box-shadow: 0 4px 16px rgba(255, 0, 0, 0.6);
      background: linear-gradient(135deg, #e60000 0%, #ff1a1a 100%);
    }
    #ytm-player-dl-btn svg {
      width: 14px;
      height: 14px;
      fill: #ffffff;
    }

    /* Playlist Page Header Download Button */
    #ytm-playlist-header-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      margin-right: 12px;
      background: linear-gradient(135deg, #cc0000 0%, #ff0000 100%);
      border: none;
      border-radius: 24px;
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      box-shadow: 0 4px 14px rgba(255, 0, 0, 0.4);
      transition: all 0.2s ease;
    }
    #ytm-playlist-header-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(255, 0, 0, 0.65);
    }
    #ytm-playlist-header-btn svg {
      width: 16px;
      height: 16px;
      fill: #ffffff;
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

    const label = document.getElementById('ytm-theme-label');
    if (label) {
      label.textContent = THEMES[themeKey].name;
    }
  }

  window.__ytm_set_theme = applyTheme;
  window.__ytm_get_theme = () => {
    try {
      return localStorage.getItem('ytm_native_theme') || 'amoled';
    } catch (e) {
      return 'amoled';
    }
  };

  function installThemePill() {
    if (document.getElementById('ytm-native-theme-pill')) return;

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
      const current = window.__ytm_get_theme();
      const nextIdx = (themeKeys.indexOf(current) + 1) % themeKeys.length;
      applyTheme(themeKeys[nextIdx]);
    });

    rightNav.insertBefore(pill, rightNav.firstChild);
    const active = window.__ytm_get_theme();
    const label = document.getElementById('ytm-theme-label');
    if (label) label.textContent = THEMES[active].name;
  }

  /* ==========================================================================
     6. MEDIA CONTROLS & DISCORD RPC BRIDGE
     ========================================================================== */
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
    const track = getCurrentTrackDetails();
    const artworkEl = document.querySelector('ytmusic-player-bar .image');

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
     7. INITIALIZATION & RESILIENT OBSERVER
     ========================================================================== */
  function injectComponents() {
    try {
      installThemePill();
      installNavbarButtons();
      installPlayerDownloadButton();
      installPlaylistHeaderButton();
    } catch (e) {
      console.warn('[YTM-Native] Component injection notice:', e);
    }
  }

  function startObserver() {
    if (!document.documentElement) {
      setTimeout(startObserver, 50);
      return;
    }
    const observer = new MutationObserver(() => {
      injectComponents();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function init() {
    injectBaseStyles();
    const savedTheme = window.__ytm_get_theme();
    applyTheme(savedTheme);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        injectComponents();
        startObserver();
      });
    } else {
      injectComponents();
      startObserver();
    }
  }

  init();

})();
