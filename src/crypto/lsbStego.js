// ─── LSB Steganography ────────────────────────────────────────────────────────

/** Extract LSB-hidden message from ImageData (or raw RGBA bytes) */
export function extractLSB(imageData, channel = "red", bitDepth = 1) {
  const { data, width, height } = imageData;
  const chanOffset = { red: 0, green: 1, blue: 2, alpha: 3 }[channel] ?? 0;
  const mask = (1 << bitDepth) - 1;
  
  const bits = [];
  for (let i = 0; i < data.length; i += 4) {
    const byte = data[i + chanOffset];
    for (let b = bitDepth - 1; b >= 0; b--) {
      bits.push((byte >> b) & 1);
    }
  }
  
  // Reconstruct bytes
  const bytes = [];
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let val = 0;
    for (let b = 0; b < 8; b++) val = (val << 1) | bits[i + b];
    if (val === 0) break; // null terminator
    bytes.push(val);
  }
  
  return {
    text: bytes.map(b => String.fromCharCode(b)).join(""),
    bytes,
    totalPixels: width * height,
    bitsExtracted: bits.length,
    capacity: Math.floor((width * height * bitDepth) / 8) + " bytes",
  };
}

/** Embed a message into ImageData (returns new Uint8ClampedArray) */
export function embedLSB(imageData, message, channel = "red", bitDepth = 1) {
  const { data, width, height } = imageData;
  const chanOffset = { red: 0, green: 1, blue: 2, alpha: 3 }[channel] ?? 0;
  const mask = (1 << bitDepth) - 1;
  
  const msgBytes = [...(message + "\x00")].map(c => c.charCodeAt(0));
  const bits = [];
  for (const byte of msgBytes) {
    for (let b = 7; b >= 0; b--) bits.push((byte >> b) & 1);
  }
  
  const maxCapacity = Math.floor((width * height * bitDepth) / 8);
  if (msgBytes.length > maxCapacity) {
    return { error: `Message too long. Max: ${maxCapacity} bytes` };
  }
  
  const newData = new Uint8ClampedArray(data);
  let bitIdx = 0;
  
  for (let i = 0; i < newData.length && bitIdx < bits.length; i += 4) {
    let byte = newData[i + chanOffset];
    for (let b = bitDepth - 1; b >= 0 && bitIdx < bits.length; b--) {
      byte = (byte & ~(1 << b)) | (bits[bitIdx++] << b);
    }
    newData[i + chanOffset] = byte;
  }
  
  return { data: newData, bitsEmbedded: bitIdx, modified: true };
}

/** Analyze image for steganographic artifacts */
export function analyzeImageForSteg(imageData) {
  const { data, width, height } = imageData;
  const lsbCounts = { red: [0, 0], green: [0, 0], blue: [0, 0] };
  
  for (let i = 0; i < data.length; i += 4) {
    lsbCounts.red[data[i] & 1]++;
    lsbCounts.green[data[i+1] & 1]++;
    lsbCounts.blue[data[i+2] & 1]++;
  }
  
  const totalPixels = width * height;
  const results = {};
  
  for (const [ch, [zeros, ones]] of Object.entries(lsbCounts)) {
    const ratio = ones / (zeros + ones);
    // Uniform: ~0.5. Natural images: varies. Stego: suspiciously close to 0.5
    const deviation = Math.abs(ratio - 0.5);
    results[ch] = {
      zeros, ones,
      ratio: ratio.toFixed(4),
      deviation: deviation.toFixed(4),
      suspicious: deviation < 0.02,
    };
  }
  
  return {
    width, height, pixels: totalPixels,
    lsb: results,
    capacity1bit: Math.floor(totalPixels * 3 / 8) + " bytes (all channels)",
  };
}
