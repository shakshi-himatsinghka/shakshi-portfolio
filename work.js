// the reel player: one <video> for the whole page, opened from any reel on it
const player = document.getElementById('player');
const video = player.querySelector('video');
const title = document.getElementById('player-title');
const role = player.querySelector('.player-role');
const count = player.querySelector('.player-count');
const reels = [...document.querySelectorAll('.tile .window')];
let current = 0, opener = null;

// each reel's two lines come from its caption: the label in <b>, then what I did and the length
const lines = link => {
  const cap = link.closest('.tile').querySelector('figcaption');
  const text = [...cap.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join(' ');
  return { label: cap.querySelector('b').textContent.trim(), role: text.replace(/\s+/g, ' ').trim() };
};
reels.forEach(link => {
  const { label, role } = lines(link);
  link.setAttribute('aria-label', `Play ${label}, ${role}`);
});

const show = i => {
  current = (i + reels.length) % reels.length;
  const link = reels[current], info = lines(link);
  video.pause();
  video.poster = link.querySelector('img').src;
  video.src = link.getAttribute('href');
  video.setAttribute('aria-label', info.label);
  title.textContent = info.label;
  role.textContent = info.role;
  count.textContent = `${current + 1} of ${reels.length}`;
  // started straight from a tap, so phones allow sound; if a browser still says no, the controls are there
  const playing = video.play();
  if (playing) playing.catch(() => {});
};

// closing pauses and empties the video, so only one reel is ever loaded
const clear = () => {
  video.pause();
  video.removeAttribute('src');
  video.removeAttribute('poster');
  video.load();
  document.documentElement.classList.remove('player-open');
  if (opener) opener.focus();
};

const open = (i, from) => {
  opener = from;
  if (player.showModal) player.showModal();
  else player.setAttribute('open', '');
  document.documentElement.classList.add('player-open');
  video.muted = false; // a fresh tap always starts with sound; next and previous keep whatever the viewer chose
  show(i);
  player.querySelector('.player-close').focus();
};

const close = () => {
  if (!player.hasAttribute('open')) return;
  if (player.close) player.close(); // the 'close' event below does the clearing
  else { player.removeAttribute('open'); clear(); }
};

player.addEventListener('close', clear);
player.querySelector('.player-close').addEventListener('click', close);
player.querySelector('.player-prev').addEventListener('click', () => show(current - 1));
player.querySelector('.player-next').addEventListener('click', () => show(current + 1));

// a tap outside the video closes it
player.addEventListener('click', e => {
  if (e.target === player || e.target.classList.contains('player-box')) close();
});

player.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !player.close) { close(); return; }
  if (e.target === video) return; // the video's own controls use the arrow keys
  if (e.key === 'ArrowRight') { show(current + 1); e.preventDefault(); }
  if (e.key === 'ArrowLeft') { show(current - 1); e.preventDefault(); }
});

reels.forEach((link, i) => link.addEventListener('click', e => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let people open the file in a new tab
  e.preventDefault();
  open(i, link);
}));
