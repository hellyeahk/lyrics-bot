// Ambil data dari URL parameter (dikirim bot Telegram)
const urlParams = new URLSearchParams(window.location.search);
const track = urlParams.get('track') || 'Unknown Track';
const artist = urlParams.get('artist') || 'Unknown Artist';

// Inisialisasi Telegram Web App
if (window.Telegram?.WebApp) {
  const WebApp = window.Telegram.WebApp;
  WebApp.expand();
  WebApp.ready();
}

// Tampilkan info lagu
document.getElementById('song-title').textContent = track;
document.getElementById('song-artist').textContent = artist;

// Sembunyikan loading
document.getElementById('loading').style.display = 'none';
document.getElementById('content').style.display = 'block';

// Ambil lirik dari LRCLIB
fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(track + ' ' + artist)}`)
  .then(res => {
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  })
  .then(data => {
    if (!data || data.length === 0) throw new Error('Not found');
    return data[0];
  })
  .then(song => {
    const synced = song.syncedLyrics;
    const plain = song.plainLyrics;
    
    if (synced) {
      renderSyncedLyrics(synced);
      simulateSync(); // Simulasi highlight karena tidak ada audio
    } else if (plain) {
      renderPlainLyrics(plain);
    } else {
      showError('Lirik tidak tersedia.');
    }
  })
  .catch(err => {
    console.error(err);
    showError('Gagal memuat lirik. Coba lagu lain!');
  });

function renderSyncedLyrics(lrc) {
  const container = document.getElementById('lyrics-container');
  const lines = parseLrc(lrc);
  container.innerHTML = '';
  lines.forEach(line => {
    const div = document.createElement('div');
    div.className = 'line';
    div.textContent = line.text;
    div.dataset.time = line.time;
    container.appendChild(div);
  });
}

function renderPlainLyrics(text) {
  const container = document.getElementById('lyrics-container');
  const paragraphs = text.split('\n').filter(p => p.trim());
  container.innerHTML = '';
  paragraphs.forEach(p => {
    const div = document.createElement('div');
    div.className = 'line';
    div.textContent = p;
    container.appendChild(div);
  });
}

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
  const interval = setInterval(() => {
    lines.forEach((el, idx) => {
      el.classList.toggle('active', idx === i);
    });
    i = (i + 1) % lines.length;
  }, 3000);
}

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.style.display = 'block';
  document.getElementById('content').style.display = 'none';
}