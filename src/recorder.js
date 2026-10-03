// F9 records the game to a video file: the canvas picture and the game's own sound, nothing
// else (no cursor, no browser, no notifications). Press F9 again to stop; the browser then
// downloads the file. The red REC badge is a page element above the canvas, so it does not
// end up in the video.
import { audioStream } from './audio.js';

let rec = null,
  started = 0,
  tick = null;
const badge = () => document.getElementById('rec');

/** The best format this browser can record: WebM (Chrome, Firefox, Edge) or MP4 (Safari). */
export function pickFormat(isSupported) {
  const options = [
    ['video/webm;codecs=vp9,opus', 'webm'],
    ['video/webm;codecs=vp8,opus', 'webm'],
    ['video/webm', 'webm'],
    ['video/mp4;codecs=avc1,mp4a', 'mp4'],
    ['video/mp4', 'mp4'],
  ];
  return options.find(([type]) => isSupported(type)) || null;
}
/** A file name like raithwyn-2026-10-03-14-05-09.webm */
export function fileName(ext, d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `raithwyn-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}.${ext}`;
}
function show(text, on) {
  const b = badge();
  if (!b) return;
  b.textContent = text;
  b.className = on ? 'on' : text ? 'msg' : '';
}
export const recording = () => !!rec;

export function toggleRecording(canvas) {
  if (rec) {
    rec.stop();
    return;
  }
  const fmt =
    typeof MediaRecorder !== 'undefined' && pickFormat((t) => MediaRecorder.isTypeSupported(t));
  if (!fmt || !canvas.captureStream) {
    show('REC ✕', false);
    setTimeout(() => show('', false), 2500);
    return;
  }
  const stream = canvas.captureStream(60),
    sound = audioStream();
  if (sound) for (const track of sound.getAudioTracks()) stream.addTrack(track);
  const chunks = [];
  rec = new MediaRecorder(stream, { mimeType: fmt[0], videoBitsPerSecond: 8_000_000 });
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    clearInterval(tick);
    show('', false);
    rec = null;
    for (const track of stream.getVideoTracks()) track.stop();
    const url = URL.createObjectURL(new Blob(chunks, { type: fmt[0] })),
      a = document.createElement('a');
    a.href = url;
    a.download = fileName(fmt[1]);
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };
  rec.start(1000);
  started = performance.now();
  const update = () => {
    const s = Math.floor((performance.now() - started) / 1000);
    show(`● REC ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, true);
  };
  update();
  tick = setInterval(update, 250);
}
