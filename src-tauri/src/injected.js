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
     2. TOAST NOTIFICATION SYSTEM
     ========================================================================== */
  function ensureToastContainer() {
    let container = document.getElementById('ytm-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ytm-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(message, type = 'info', actionText = null, actionCallback = null) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `ytm-toast ytm-toast-${type}`;

    let iconHtml = '';
    if (type === 'loading') {
      iconHtml = '<div class="ytm-spinner"></div>';
    } else if (type === 'success') {
      iconHtml = '<span class="ytm-toast-icon" style="color:#22c55e;">✓</span>';
    } else if (type === 'error') {
      iconHtml = '<span class="ytm-toast-icon" style="color:#ef4444;">✕</span>';
    } else {
      iconHtml = '<span class="ytm-toast-icon" style="color:#3b82f6;">ℹ</span>';
    }

    toast.innerHTML = `
      ${iconHtml}
      <div class="ytm-toast-msg">${message}</div>
    `;

    if (actionText && actionCallback) {
      const btn = document.createElement('button');
      btn.className = 'ytm-toast-action';
      btn.textContent = actionText;
      btn.onclick = (e) => {
        e.stopPropagation();
        actionCallback();
      };
      toast.appendChild(btn);
    } else if (type === 'success') {
      const btn = document.createElement('button');
      btn.className = 'ytm-toast-action';
      btn.textContent = '📂 Open Folder';
      btn.onclick = (e) => {
        e.stopPropagation();
        if (window.__TAURI__ && window.__TAURI__.event) {
          window.__TAURI__.event.emit('open_downloads_folder', {});
        }
      };
      toast.appendChild(btn);
    }

    container.appendChild(toast);

    const duration = type === 'loading' ? 14000 : 7000;
    setTimeout(() => {
      toast.classList.add('ytm-toast-fade');
      setTimeout(() => toast.remove(), 400);
    }, duration);

    return toast;
  }

  window.__ytm_show_toast = function(message, type) {
    showToast(message, type);
  };

  // Listen for download_status events from Rust
  if (window.__TAURI__ && window.__TAURI__.event) {
    window.__TAURI__.event.listen('download_status', (event) => {
      const data = event.payload;
      if (data.status === 'started') {
        showToast(data.message, 'loading');
      } else if (data.status === 'completed') {
        showToast(data.message, 'success');
      } else if (data.status === 'error') {
        showToast(data.message, 'error');
      }
    });
  }

  /* ==========================================================================
     3. MP4 DOWNLOAD ENGINE (STRICT SEPARATION: SONG VS PLAYLIST)
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

  function extractCurrentLyrics() {
    const lyricsEl = document.querySelector('ytmusic-description-shelf-renderer .description, ytmusic-player-page #tab-renderer [page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');
    if (lyricsEl && lyricsEl.innerText && lyricsEl.innerText.trim().length > 10) {
      return lyricsEl.innerText.trim();
    }
    return null;
  }

  // 1. DOWNLOAD CURRENT SONG ONLY (Strips all &list= and queue params)
  function downloadCurrentSong(customVideoUrl = null, customTitle = null) {
    let currentUrl = customVideoUrl || window.location.href;
    let videoId = extractVideoId(currentUrl);

    if (!videoId) {
      const link = document.querySelector('ytmusic-player-bar .title a');
      if (link && link.href) {
        videoId = extractVideoId(link.href);
      }
    }

    const titleEl = document.querySelector('ytmusic-player-bar .title');
    const bylineEl = document.querySelector('ytmusic-player-bar .byline');
    const title = customTitle || (titleEl ? titleEl.textContent.trim() : '') || (navigator.mediaSession && navigator.mediaSession.metadata ? navigator.mediaSession.metadata.title : 'Current Song');
    const artist = (bylineEl ? bylineEl.textContent.trim() : '') || (navigator.mediaSession && navigator.mediaSession.metadata ? navigator.mediaSession.metadata.artist : '');

    // Show instant toast notification
    showToast(`Downloading "${title}" in MP4...`, 'loading');

    // STRICT ISOLATION: Build single watch URL with NO &list= parameter
    let songUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : currentUrl.split('&list=')[0].split('?list=')[0];

    const lyrics = extractCurrentLyrics();

    console.log('[YTM-Native] Downloading SINGLE SONG ONLY:', title, songUrl);

    if (window.__TAURI__ && window.__TAURI__.event) {
      window.__TAURI__.event.emit('trigger_download', {
        downloadType: 'song',
        url: songUrl,
        title: title,
        artist: artist,
        lyrics: lyrics
      });
    }
  }

  // 2. DOWNLOAD ENTIRE PLAYLIST
  function downloadCurrentPlaylist() {
    let currentUrl = window.location.href;
    let listId = extractPlaylistId(currentUrl);

    if (!listId) {
      const link = document.querySelector('ytmusic-player-bar .title a');
      if (link && link.href) {
        listId = extractPlaylistId(link.href);
      }
    }

    if (!listId) {
      showToast('⚠️ No playlist detected. Open a playlist or album first!', 'error');
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
    }

    // Show instant toast notification
    showToast(`Downloading Playlist "${playlistTitle}" in MP4...`, 'loading');

    let playlistUrl = `https://www.youtube.com/playlist?list=${listId}`;
    console.log('[YTM-Native] Downloading PLAYLIST:', playlistTitle, playlistUrl);

    if (window.__TAURI__ && window.__TAURI__.event) {
      window.__TAURI__.event.emit('trigger_download', {
        downloadType: 'playlist',
        url: playlistUrl,
        title: playlistTitle,
        artist: '',
        lyrics: null
      });
    }
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
        if (window.__TAURI__ && window.__TAURI__.event) {
          window.__TAURI__.event.emit('open_downloads_folder', {});
        }
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

    /* Toast Notifications Container: Maximum Priority */
    #ytm-toast-container {
      position: fixed;
      bottom: 84px;
      right: 24px;
      z-index: 2147483647 !important;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    .ytm-toast {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 20px;
      background: rgba(18, 20, 28, 0.96);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      color: #ffffff;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), 0 0 1px rgba(255, 255, 255, 0.2);
      animation: ytm-toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      max-width: 420px;
    }
    .ytm-toast-loading {
      border-color: rgba(255, 0, 0, 0.5);
    }
    .ytm-toast-success {
      border-color: rgba(34, 197, 94, 0.6);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), 0 0 12px rgba(34, 197, 94, 0.2);
    }
    .ytm-toast-error {
      border-color: rgba(239, 68, 68, 0.6);
    }
    .ytm-toast-fade {
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    }
    .ytm-toast-action {
      background: rgba(255, 255, 255, 0.15);
      border: none;
      color: #ffffff;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      margin-left: auto;
      white-space: nowrap;
      transition: background 0.2s ease;
    }
    .ytm-toast-action:hover {
      background: #ff0000;
    }
    .ytm-toast-icon {
      font-weight: bold;
      font-size: 16px;
    }
    .ytm-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-top-color: #ff0000;
      border-radius: 50%;
      animation: ytm-spin 0.7s linear infinite;
    }
    @keyframes ytm-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes ytm-toast-in {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
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
    if (!THEMES[themeKey]) themeKey = 'amoled';
    localStorage.setItem('ytm_native_theme', themeKey);

    if (!themeStyleEl) {
      themeStyleEl = document.createElement('style');
      themeStyleEl.id = 'ytm-native-theme-styles';
      (document.head || document.documentElement).appendChild(themeStyleEl);
    }
    themeStyleEl.textContent = THEMES[themeKey].css;

    const label = document.getElementById('ytm-theme-label');
    if (label) {
      label.textContent = THEMES[themeKey].name;
    }
  }

  window.__ytm_set_theme = applyTheme;
  window.__ytm_get_theme = () => localStorage.getItem('ytm_native_theme') || 'amoled';

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
     7. INITIALIZATION & OBSERVER
     ========================================================================== */
  function injectComponents() {
    installThemePill();
    installNavbarButtons();
    installPlayerDownloadButton();
    installPlaylistHeaderButton();
  }

  function init() {
    injectBaseStyles();
    const savedTheme = localStorage.getItem('ytm_native_theme') || 'amoled';
    applyTheme(savedTheme);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectComponents);
    } else {
      injectComponents();
    }

    const observer = new MutationObserver(() => {
      injectComponents();
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  init();

})();
