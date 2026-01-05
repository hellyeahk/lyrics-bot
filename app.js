// === CONFIG ===
const SUPABASE_URL = "https://ayaptrsbnwvaeuwbbtrx.supabase.co"; // ← GANTI!
const SUPABASE_ANON_KEY = "sb_publishable_gtdzoKATO-RATTSPT0FvrQ_bY7mB01d"; // ← GANTI!

// === UTIL ===
function getTelegramUser() {
  if (!window.Telegram?.WebApp?.initData) {
    showError("Harus dibuka dari Telegram!");
    return null;
  }
  const params = new URLSearchParams(window.Telegram.WebApp.initData);
  return JSON.parse(params.get('user') || '{}');
}

function showError(msg) {
  document.getElementById('error').textContent = msg;
  document.getElementById('error').style.display = 'block';
}

async function fetchFromSupabase(endpoint, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// === MAIN ===
document.addEventListener('DOMContentLoaded', async () => {
  const WebApp = window.Telegram?.WebApp;
  if (WebApp) {
    WebApp.expand();
    WebApp.ready();
  }

  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  const track = urlParams.get('track');
  const artist = urlParams.get('artist');
  const youtube = urlParams.get('youtube');

  const user = getTelegramUser();
  if (!user) return;

  document.getElementById('loading').style.display = 'none';

  if (action === 'save') {
    showSaveView(user.id, track, artist, youtube);
  } else if (track && artist) {
    showLyricsView(track, artist);
  } else {
    showPlaylistView(user.id);
  }
});

// === VIEWS ===
async function showLyricsView(track, artist) {
  document.getElementById('main').style.background = 'linear-gradient(135deg, #A8D8EA, #6BB9E0)';
  document.getElementById('lyrics-view').style.display = 'block';
  document.getElementById('song-title').textContent = decodeURIComponent(track);
  document.getElementById('song-artist').textContent = decodeURIComponent(artist);

  try {
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(track + ' ' + artist)}`);
    const data = await res.json();
    if (data.length === 0) throw new Error('Not found');
    const lyrics = data[0].syncedLyrics || data[0].plainLyrics || 'Lirik tidak tersedia.';
    
    const container = document.getElementById('lyrics-container');
    if (lyrics.includes('[') && lyrics.includes(']')) {
      const lines = parseLrc(lyrics);
      lines.forEach(line => {
        const div = document.createElement('div');
        div.className = 'line';
        div.textContent = line.text;
        container.appendChild(div);
      });
      simulateSync();
    } else {
      lyrics.split('\n').filter(l => l.trim()).forEach(line => {
        const div = document.createElement('div');
        div.className = 'line';
        div.textContent = line;
        container.appendChild(div);
      });
    }
  } catch (e) {
    document.getElementById('lyrics-container').innerHTML = '<p>Lirik tidak ditemukan.</p>';
  }
}

async function showSaveView(userId, track, artist, youtube) {
  document.getElementById('save-view').style.display = 'block';
  
  // Buat playlist baru
  document.getElementById('new-playlist-btn').onclick = async () => {
    const name = prompt("Nama playlist baru:");
    if (!name) return;
    await fetchFromSupabase('playlists', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId.toString(), name })
    });
    loadPlaylists(userId, track, artist, youtube);
  };

  loadPlaylists(userId, track, artist, youtube);
}

async function loadPlaylists(userId, track, artist, youtube) {
  const playlists = await fetchFromSupabase(`playlists?user_id=eq.${userId}`);
  const listEl = document.getElementById('playlists-list');
  listEl.innerHTML = '';

  playlists.forEach(pl => {
    const btn = document.createElement('button');
    btn.className = 'playlist-item';
    btn.textContent = `${pl.name}`;
    btn.onclick = async () => {
      await fetchFromSupabase('playlist_items', {
        method: 'POST',
        body: JSON.stringify({
          playlist_id: pl.id,
          track_name: decodeURIComponent(track),
          artist_name: decodeURIComponent(artist),
          youtube_url: youtube ? decodeURIComponent(youtube) : ''
        })
      });
      alert('✅ Lagu disimpan!');
      window.location.href = `?`;
    };
    listEl.appendChild(btn);
  });
}

async function showPlaylistView(userId) {
  document.getElementById('playlist-view').style.display = 'block';
  const playlists = await fetchFromSupabase(`playlists?user_id=eq.${userId}&order=name.asc`);
  const container = document.getElementById('playlist-items');
  container.innerHTML = '<h3>Daftar Playlist</h3>';

  for (const pl of playlists) {
    const items = await fetchFromSupabase(`playlist_items?playlist_id=eq.${pl.id}`);
    const div = document.createElement('div');
    div.innerHTML = `<h4>${pl.name} (${items.length})</h4>`;
    
    items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'song-btn';
      btn.innerHTML = `${item.track_name} – ${item.artist_name}`;
      btn.onclick = () => {
        const track = encodeURIComponent(item.track_name);
        const artist = encodeURIComponent(item.artist_name);
        window.open(item.youtube_url, '_blank');
        // Atau buka lirik: window.location.href = `?track=${track}&artist=${artist}`;
      };
      div.appendChild(btn);
    });
    container.appendChild(div);
  }
}

// === LIRIK UTIL ===
function parseLrc(lrc) {
  const lines = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/g;
  let match;
  while ((match = regex.exec(lrc)) !== null) {
    const mins = parseInt(match[1]);
    const secs = parseInt(match[2]);
    const mills = parseInt(match[3].padEnd(3, '0'));
    const time = mins * 60 + secs + mills / 1000;
    const text = match[4].trim();
    if (text) lines.push({ time, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

function simulateSync() {
  const lines = document.querySelectorAll('.line');
  if (lines.length === 0) return;
  let i = 0;
  setInterval(() => {
    lines.forEach((el, idx) => el.classList.toggle('active', idx === i));
    i = (i + 1) % lines.length;
  }, 2500);
}