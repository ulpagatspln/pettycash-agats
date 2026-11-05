// Perkecil foto kwitansi agar hemat kuota Firestore (target maksimal 150 KB per foto).
const MAX_BYTES = 150 * 1024;
const SIZES = [800, 640, 480];
const QUALITIES = [0.6, 0.45, 0.3];

const bytesOf = (dataUrl) => Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gambar tidak bisa dibaca')); };
    img.src = url;
  });
}

export async function compressImage(file) {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let result = '';

  for (const size of SIZES) {
    const scale = Math.min(1, size / Math.max(img.width, img.height));
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const quality of QUALITIES) {
      result = canvas.toDataURL('image/jpeg', quality);
      if (bytesOf(result) <= MAX_BYTES) return result;
    }
  }
  return result; // Hasil terkecil, tetap di bawah batas aturan Firestore untuk foto wajar
}
