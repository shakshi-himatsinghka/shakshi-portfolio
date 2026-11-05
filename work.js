// the work page: highlights that show one kind of work at a time, and one shared player for every reel
const KINDS = [
  { id: 'shot', name: 'Shot by me', full: 'shot & edited by me' },
  { id: 'brands', name: 'Brands', full: 'brands & stores' },
  { id: 'food', name: 'Food', full: 'cafés & food' },
  { id: 'creators', name: 'Creators', full: 'creators' },
];
const tiles = [...document.querySelectorAll('.tile')];

// each reel's details come from its caption: the label in <b>, then what I did · the length
const lines = tile => {
  const cap = tile.querySelector('figcaption');
  const role = [...cap.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
  const post = cap.querySelector('a.post');
  return { label: cap.querySelector('b').textContent.trim(), role, len: (role.match(/(\d+:\d\d)$/) || [])[1] || '', post: post && post.href };
};

// on each cover: its length, and a tag on reels I shot myself
tiles.forEach(tile => {
  const { label, role, len } = lines(tile);
  const cover = tile.querySelector('.cover');
  cover.setAttribute('aria-label', `Play ${label}, ${role}`);
  if (len) cover.insertAdjacentHTML('beforeend', `<span class="len" aria-hidden="true">${len}</span>`);
  if (/^shot & edited/i.test(role)) cover.insertAdjacentHTML('beforeend', '<span class="tag" aria-hidden="true">shot &amp; edited by me</span>');
});

// the counts in the profile
const kinds = KINDS.filter(k => tiles.some(t => t.dataset.kind === k.id));
const count = (key, n) => { const el = document.querySelector(`[data-count="${key}"]`); if (el) el.textContent = n; };
count('reels', tiles.length);
count('kinds', kinds.length);
count('shot', tiles.filter(t => t.dataset.kind === 'shot').length);

// highlights: "All", then one per kind that has reels, each with its first reel's poster
const strip = document.querySelector('.highlights');
const status = document.getElementById('filter-status');
const poster = id => (tiles.find(t => !id || t.dataset.kind === id) || tiles[0]).querySelector('img').getAttribute('src');
strip.innerHTML = [{ id: '', name: 'All' }, ...kinds].map(k =>
  `<button type="button" class="hl"${k.id ? ` id="${k.id}"` : ''} data-kind="${k.id}" aria-pressed="false"><i><img src="${poster(k.id)}" alt=""></i>${k.name}</button>`).join('');
const buttons = [...strip.querySelectorAll('.hl')];

let shown = tiles;
const show = (id, fromLink) => {
  buttons.forEach(b => b.setAttribute('aria-pressed', b.dataset.kind === id));
  tiles.forEach(t => { t.hidden = !!id && t.dataset.kind !== id; });
  shown = tiles.filter(t => !t.hidden);
  const kind = KINDS.find(k => k.id === id);
  status.textContent = `Showing ${shown.length} reel${shown.length === 1 ? '' : 's'}${kind ? ': ' + kind.full : ''}`;
  // keep the address in step, so a link copied now opens on the same kind
  if (!fromLink) history.replaceState(null, '', id ? `#${id}` : location.pathname);
};
strip.addEventListener('click', e => { const b = e.target.closest('.hl'); if (b) show(b.dataset.kind); });

// a link like /work/#creators opens with that kind picked
const fromHash = () => { const id = location.hash.slice(1); return kinds.some(k => k.id === id) ? id : ''; };
show(fromHash(), true);
if (fromHash()) document.getElementById(fromHash()).scrollIntoView({ block: 'start' });
addEventListener('hashchange', () => show(fromHash(), true));

// ---------- the player: one <video> for the whole page ----------
const player = document.getElementById('player');
const video = player.querySelector('video');
const title = document.getElementById('player-title');
const roleText = player.querySelector('.player-role');
const postLink = player.querySelector('.player-post');
const position = player.querySelector('.player-count');
let list = tiles, current = 0, opener = null;

const play = i => {
  current = (i + list.length) % list.length;
  const tile = list[current], info = lines(tile);
  video.pause();
  video.poster = tile.querySelector('img').src;
  video.src = tile.querySelector('.cover').getAttribute('href');
  video.setAttribute('aria-label', info.label);
  title.textContent = info.label;
  roleText.textContent = info.role;
  postLink.hidden = !info.post;
  if (info.post) postLink.href = info.post;
  position.textContent = `${current + 1} of ${list.length}`;
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

const open = (tile, from) => {
  list = shown; // next and previous stay within the kind being shown
  opener = from;
  if (player.showModal) player.showModal();
  else player.setAttribute('open', '');
  document.documentElement.classList.add('player-open');
  video.muted = false; // a fresh tap always starts with sound; next and previous keep whatever the viewer chose
  play(list.indexOf(tile));
  player.querySelector('.player-close').focus();
};

const close = () => {
  if (!player.hasAttribute('open')) return;
  if (player.close) player.close(); // the 'close' event below does the clearing
  else { player.removeAttribute('open'); clear(); }
};

player.addEventListener('close', clear);
player.querySelector('.player-close').addEventListener('click', close);
player.querySelector('.player-prev').addEventListener('click', () => play(current - 1));
player.querySelector('.player-next').addEventListener('click', () => play(current + 1));

// a tap outside the video closes it
player.addEventListener('click', e => {
  if (e.target === player || e.target.classList.contains('player-box')) close();
});

player.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !player.close) { close(); return; }
  if (e.target === video) return; // the video's own controls use the arrow keys
  if (e.key === 'ArrowRight') { play(current + 1); e.preventDefault(); }
  if (e.key === 'ArrowLeft') { play(current - 1); e.preventDefault(); }
});

tiles.forEach(tile => tile.querySelector('.cover').addEventListener('click', e => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let people open the file in a new tab
  e.preventDefault();
  open(tile, e.currentTarget);
}));
