import { useState, useRef, useCallback, useEffect } from "react";
import { extractLSB, embedLSB, analyzeImageForSteg } from "../crypto/lsbStego.js";
import { DEMO_IMAGE_1, DEMO_IMAGE_2, DEMO_IMAGE_3 } from "../data/demoImages.js";

const DEMO_IMAGES = [
  {
    id: "demo1",
    label: "Gradient",
    hint: "Red ch · 1bit",
    thumb: DEMO_IMAGE_1,
    channel: "red",
    bitDepth: 1,
    description: "Purple-cyan gradient — hidden flag in the RED channel.",
  },
  {
    id: "demo2",
    label: "Noise",
    hint: "Blue ch · 1bit",
    thumb: DEMO_IMAGE_2,
    channel: "blue",
    bitDepth: 1,
    description: "Colorful noise image — secret hidden in the BLUE channel.",
  },
  {
    id: "demo3",
    label: "Circuit",
    hint: "Green ch · 1bit",
    thumb: DEMO_IMAGE_3,
    channel: "green",
    bitDepth: 1,
    description: "Dark circuit-board pattern — secret in the GREEN channel.",
  },
];

function loadImageData(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve({ imageData: ctx.getImageData(0, 0, img.width, img.height), canvas, ctx, img });
    };
    img.onerror = reject;
    img.src = src;
  });
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="copy-btn"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "✓ COPIED" : "COPY"}
    </button>
  );
}

function ChannelBadge({ channel }) {
  const colors = {
    red:   { bg: "#300010", color: "#ff3d5a", border: "#ff3d5a44" },
    green: { bg: "#003315", color: "#00e87a", border: "#00e87a44" },
    blue:  { bg: "#001030", color: "#00d4ff", border: "#00d4ff44" },
    alpha: { bg: "#1a1530", color: "#a78bfa", border: "#a78bfa44" },
  };
  const s = colors[channel] || colors.alpha;
  return (
    <span style={{
      display: "inline-block", padding: "1px 8px", borderRadius: 20,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
      fontFamily: "var(--font-mono)",
    }}>
      {channel}
    </span>
  );
}

export default function LSBStegoView({ addHistory }) {
  const [tab, setTab]             = useState("extract");
  const [imgSrc, setImgSrc]       = useState(null);
  const [imgMeta, setImgMeta]     = useState(null);
  const [channel, setChannel]     = useState("red");
  const [bitDepth, setBitDepth]   = useState(1);
  const [extracted, setExtracted] = useState(null);
  const [analysis, setAnalysis]   = useState(null);
  const [embedMsg, setEmbedMsg]   = useState("");
  const [embedResult, setEmbedResult] = useState(null);
  const [dragging, setDragging]   = useState(false);
  const [imageData, setImageData] = useState(null);
  const [error, setError]         = useState(null);
  const [scanning, setScanning]   = useState(false);
  const [activeDemo, setActiveDemo] = useState(null);

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setError(null);
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    setExtracted(null); setAnalysis(null); setEmbedResult(null); setActiveDemo(null);
    try {
      const { imageData: id, img } = await loadImageData(url);
      setImageData(id);
      setImgMeta({ width: img.width, height: img.height, name: file.name, size: file.size });
    } catch (e) {
      setError("Failed to load image: " + e.message);
      setImgMeta(null);
    }
  }, []);

  const handleDrop = useCallback(e => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleBase64 = useCallback(async (b64, name = "challenge.png") => {
    setError(null);
    const src = `data:image/png;base64,${b64}`;
    setImgSrc(src);
    setExtracted(null); setAnalysis(null); setEmbedResult(null);
    try {
      const { imageData: id, img } = await loadImageData(src);
      setImageData(id);
      setImgMeta({ width: img.width, height: img.height, name, size: Math.round(b64.length * 0.75) });
    } catch (e) {
      setError("Failed to decode image: " + e.message);
    }
  }, []);

  const loadDemo = useCallback(async (demo) => {
    setActiveDemo(demo.id);
    setChannel(demo.channel);
    setBitDepth(demo.bitDepth);
    setExtracted(null); setAnalysis(null); setEmbedResult(null);
    await handleBase64(demo.thumb, `${demo.label.toLowerCase()}_demo.png`);
  }, [handleBase64]);

  useEffect(() => {
    const b64 = sessionStorage.getItem("ctf_challenge_image");
    if (b64) {
      sessionStorage.removeItem("ctf_challenge_image");
      handleBase64(b64);
    }
  }, [handleBase64]);

  const doExtract = useCallback(() => {
    if (!imageData) return;
    try {
      const r = extractLSB(imageData, channel, bitDepth);
      setExtracted(r);
      addHistory?.("LSB Extract", `${channel} ch, ${bitDepth}bit`, r.text.slice(0, 80));
    } catch (e) { setError("Extract error: " + e.message); }
  }, [imageData, channel, bitDepth, addHistory]);

  const doAutoScan = useCallback(() => {
    if (!imageData) return;
    setScanning(true);
    setTimeout(() => {
      try {
        const results = ["red", "green", "blue", "alpha"].flatMap(ch =>
          [1, 2].map(bd => {
            const r = extractLSB(imageData, ch, bd);
            const score = r.text.split("").filter(c => {
              const code = c.charCodeAt(0);
              return code >= 32 && code < 127;
            }).length / Math.max(r.text.length, 1);
            return { ch, bd, text: r.text, score };
          })
        );
        const best = results.sort((a, b) => b.score - a.score)[0];
        if (best) {
          setChannel(best.ch);
          setBitDepth(best.bd);
          const r = extractLSB(imageData, best.ch, best.bd);
          setExtracted(r);
        }
      } catch (e) { setError("Scan error: " + e.message); }
      setScanning(false);
    }, 400);
  }, [imageData]);

  const doAnalyze = useCallback(() => {
    if (!imageData) return;
    try { setAnalysis(analyzeImageForSteg(imageData)); }
    catch (e) { setError("Analyze error: " + e.message); }
  }, [imageData]);

  const doEmbed = useCallback(async () => {
    if (!imageData || !embedMsg) return;
    try {
      const r = embedLSB(imageData, embedMsg, channel, bitDepth);
      if (r.error) { setEmbedResult({ error: r.error }); return; }
      const canvas = document.createElement("canvas");
      canvas.width = imageData.width; canvas.height = imageData.height;
      const ctx = canvas.getContext("2d");
      ctx.putImageData(new ImageData(r.data, imageData.width, imageData.height), 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      setEmbedResult({ src: dataUrl, bits: r.bitsEmbedded });
      addHistory?.("LSB Embed", embedMsg, `${r.bitsEmbedded} bits embedded`);
    } catch (e) { setEmbedResult({ error: e.message }); }
  }, [imageData, embedMsg, channel, bitDepth, addHistory]);

  const capacityBytes = imageData
    ? Math.floor((imageData.width * imageData.height * bitDepth) / 8)
    : 0;

  const chOptions = [
    { value: "red",   label: "Red",   color: "#ff3d5a" },
    { value: "green", label: "Green", color: "#00e87a" },
    { value: "blue",  label: "Blue",  color: "#00d4ff" },
    { value: "alpha", label: "Alpha", color: "#a78bfa" },
  ];

  return (
    <div>
      <div className="section-header">
        <h3>🖼️ LSB Steganography</h3>
        <p>Extract or embed hidden messages using Least Significant Bit pixel encoding. Supports multi-channel &amp; multi-bit extraction.</p>
      </div>

      {error && (
        <div className="warn-box" style={{ marginBottom: 12 }}>⚠️ {error}</div>
      )}

      <div className="tab-bar" style={{ marginBottom: 14 }}>
        {[["extract", "🔍 Extract"], ["embed", "💉 Embed"], ["analyze", "📊 Analyze"]].map(([t, label]) => (
          <button key={t} className={`tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{label}</button>
        ))}
      </div>

      {/* ── Demo Images ──────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 8 }}>🎯 Demo Images — load a pre-embedded challenge</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {DEMO_IMAGES.map(demo => (
            <div
              key={demo.id}
              onClick={() => loadDemo(demo)}
              title={demo.description}
              style={{
                cursor: "pointer",
                border: `2px solid ${activeDemo === demo.id ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 8,
                overflow: "hidden",
                transition: ".15s",
                boxShadow: activeDemo === demo.id ? "0 0 14px var(--accent-glow)" : "none",
                flexShrink: 0,
              }}
            >
              <img
                src={`data:image/png;base64,${demo.thumb}`}
                alt={demo.label}
                style={{ width: 100, height: 75, display: "block", imageRendering: "pixelated" }}
              />
              <div style={{
                padding: "4px 8px",
                background: activeDemo === demo.id ? "var(--bg-active)" : "var(--bg-card-2)",
                borderTop: `1px solid ${activeDemo === demo.id ? "var(--accent)44" : "var(--border)"}`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: activeDemo === demo.id ? "var(--accent)" : "var(--text-1)" }}>
                  {demo.label}
                </div>
                <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 1 }}>{demo.hint}</div>
              </div>
            </div>
          ))}
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.7 }}>
              Each image has a secret message embedded in a specific channel.<br />
              <span style={{ color: "var(--accent)" }}>Load one → Extract → find the flag! 🚩</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Image Upload ─────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title">Image Input</div>
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => document.getElementById("lsb-file-input").click()}
          style={{
            border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
            borderRadius: 8, padding: 20, textAlign: "center", cursor: "pointer",
            transition: ".15s", marginBottom: 12,
            background: dragging ? "var(--accent-dim)" : "transparent",
          }}
        >
          <input id="lsb-file-input" type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => handleFile(e.target.files[0])} />
          {imgSrc ? (
            <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "relative" }}>
                <img src={imgSrc} alt="loaded" style={{
                  maxHeight: 100, maxWidth: 160, borderRadius: 6,
                  imageRendering: "pixelated", border: "1px solid var(--border)",
                  boxShadow: "0 4px 16px #000a",
                }} />
                {activeDemo && (
                  <div style={{
                    position: "absolute", top: 4, left: 4,
                    background: "var(--accent)", color: "#000",
                    fontSize: 8, fontWeight: 800, padding: "2px 5px", borderRadius: 3,
                    letterSpacing: 1, textTransform: "uppercase",
                  }}>DEMO</div>
                )}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700, color: "var(--text-1)", fontSize: 13, marginBottom: 4 }}>
                  {imgMeta?.name}
                </div>
                {imgMeta && !imgMeta.error && (
                  <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 4 }}>
                    {imgMeta.width} × {imgMeta.height} px · {(imgMeta.size / 1024).toFixed(1)} KB
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--accent)", marginBottom: 4 }}>
                  Capacity: <strong>{capacityBytes}</strong> bytes{" "}
                  <span style={{ color: "var(--text-3)" }}>({channel}, {bitDepth}bpp)</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>Click to change image</div>
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--text-3)" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
              <div style={{ fontSize: 13, color: "var(--text-2)" }}>Drop image here or click to upload</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>PNG recommended — JPEG compression destroys LSB data</div>
            </div>
          )}
        </div>

        {/* Channel selector — visual pill buttons */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Channel</label>
          <div style={{ display: "flex", gap: 6 }}>
            {chOptions.map(ch => (
              <button
                key={ch.value}
                onClick={() => setChannel(ch.value)}
                style={{
                  flex: 1, padding: "6px 0", borderRadius: 5, cursor: "pointer",
                  fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                  letterSpacing: 1, textTransform: "uppercase", transition: ".15s",
                  border: `1px solid ${channel === ch.value ? ch.color : "var(--border)"}`,
                  background: channel === ch.value ? `${ch.color}18` : "var(--bg-hover)",
                  color: channel === ch.value ? ch.color : "var(--text-3)",
                  boxShadow: channel === ch.value ? `0 0 10px ${ch.color}33` : "none",
                }}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label>Bit Depth</label>
          <select value={bitDepth} onChange={e => setBitDepth(Number(e.target.value))}>
            <option value={1}>1 bit — classic LSB (invisible)</option>
            <option value={2}>2 bits (still subtle)</option>
            <option value={3}>3 bits (slight artifacts)</option>
            <option value={4}>4 bits (noisy)</option>
          </select>
        </div>
      </div>

      {/* ── Extract tab ──────────────────────────────────────────────────────── */}
      {tab === "extract" && (
        <div className="card">
          <div className="card-title">Extract Hidden Message</div>

          {activeDemo && (
            <div className="info-box" style={{ marginBottom: 12 }}>
              💡 Demo: <strong style={{ color: "var(--accent)" }}>
                {DEMO_IMAGES.find(d => d.id === activeDemo)?.description}
              </strong>
              <br />
              Channel and bit depth are pre-set — just click Extract!
            </div>
          )}

          {!imageData && (
            <div className="info-box" style={{ marginBottom: 12 }}>
              Upload an image above or load a demo to start extraction.
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={doExtract} disabled={!imageData} style={{ flex: 2 }}>
              🔍 Extract from <ChannelBadge channel={channel} />
            </button>
            <button
              className="btn btn-ghost"
              onClick={doAutoScan}
              disabled={!imageData || scanning}
              style={{ flex: 1 }}
              title="Try all channels + bit depths and pick best result"
            >
              {scanning ? "⟳ Scanning…" : "⚡ Auto-Scan"}
            </button>
          </div>

          {extracted && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ margin: 0 }}>
                  Extracted — {extracted.bytes.length} bytes &nbsp;·&nbsp;
                  <ChannelBadge channel={channel} /> &nbsp;·&nbsp; {bitDepth} bpp
                </label>
                <CopyBtn text={extracted.text} />
              </div>
              <div className="output" style={{
                color: extracted.text ? "var(--green)" : "var(--text-3)",
                marginBottom: 8, maxHeight: 200, overflow: "auto",
                border: extracted.text ? "1px solid var(--green)33" : "1px solid var(--border)",
              }}>
                {extracted.text || "(no readable ASCII — try Auto-Scan or other channels)"}
              </div>

              {extracted.bytes.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ margin: 0 }}>Raw bytes (hex)</label>
                    <CopyBtn text={extracted.bytes.slice(0, 256).map(b => b.toString(16).padStart(2, "0")).join(" ")} />
                  </div>
                  <div className="output" style={{ fontSize: 11, color: "var(--accent)", maxHeight: 100, overflow: "auto" }}>
                    {extracted.bytes.slice(0, 256).map(b => b.toString(16).padStart(2, "0")).join(" ")}
                    {extracted.bytes.length > 256 && ` … +${extracted.bytes.length - 256} more`}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-3)", display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span>Pixels: <strong style={{ color: "var(--text-2)" }}>{extracted.totalPixels?.toLocaleString()}</strong></span>
                <span>Bits: <strong style={{ color: "var(--text-2)" }}>{extracted.bitsExtracted?.toLocaleString()}</strong></span>
                <span>Capacity: <strong style={{ color: "var(--accent)" }}>{capacityBytes} bytes</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Embed tab ────────────────────────────────────────────────────────── */}
      {tab === "embed" && (
        <div className="card">
          <div className="card-title">Embed Secret Message</div>
          <label>Secret message to hide</label>
          <textarea
            value={embedMsg}
            onChange={e => setEmbedMsg(e.target.value)}
            placeholder="flag{your_secret_here}"
            style={{ marginBottom: 6 }}
          />
          {imageData && (
            <div style={{ fontSize: 11, marginBottom: 10, color: embedMsg.length > capacityBytes ? "var(--red)" : "var(--text-3)" }}>
              <div style={{ height: 3, background: "var(--bg-hover)", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
                <div style={{
                  height: "100%", borderRadius: 2, transition: ".3s",
                  width: `${Math.min(100, (embedMsg.length / Math.max(capacityBytes, 1)) * 100)}%`,
                  background: embedMsg.length > capacityBytes ? "var(--red)" : "var(--accent)",
                }} />
              </div>
              {embedMsg.length} / {capacityBytes} bytes used
              {embedMsg.length > capacityBytes && " — message too long!"}
            </div>
          )}
          <button
            className="btn btn-primary"
            onClick={doEmbed}
            disabled={!imageData || !embedMsg || embedMsg.length > capacityBytes}
            style={{ width: "100%", marginBottom: 12 }}
          >
            💉 Embed in <ChannelBadge channel={channel} /> channel
          </button>

          {embedResult?.error && <div className="warn-box">⚠️ {embedResult.error}</div>}
          {embedResult?.src && (
            <div>
              <div className="success-box" style={{ marginBottom: 10 }}>
                ✓ Embedded {embedResult.bits} bits into <ChannelBadge channel={channel} /> channel.
                The image is visually identical to the original.
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: 1, marginBottom: 4 }}>ORIGINAL</div>
                  <img src={imgSrc} alt="original" style={{ height: 100, borderRadius: 4, border: "1px solid var(--border)", imageRendering: "pixelated" }} />
                </div>
                <div style={{ color: "var(--accent)", alignSelf: "center", fontSize: 18 }}>→</div>
                <div>
                  <div style={{ fontSize: 9, color: "var(--green)", letterSpacing: 1, marginBottom: 4 }}>STEGO OUTPUT</div>
                  <img src={embedResult.src} alt="stego" style={{ height: 100, borderRadius: 4, border: "1px solid var(--green)33", imageRendering: "pixelated" }} />
                </div>
              </div>
              <a href={embedResult.src} download="stego_image.png" className="btn btn-ghost btn-sm">⬇ Download PNG</a>
            </div>
          )}
        </div>
      )}

      {/* ── Analyze tab ──────────────────────────────────────────────────────── */}
      {tab === "analyze" && (
        <div className="card">
          <div className="card-title">Statistical LSB Analysis</div>
          <button className="btn btn-primary" onClick={doAnalyze} disabled={!imageData} style={{ width: "100%", marginBottom: 12 }}>
            📊 Analyze Pixel Distribution
          </button>
          {analysis && (
            <div>
              <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 12 }}>
                {analysis.width}×{analysis.height}px · {analysis.pixels?.toLocaleString()} pixels · Capacity: {analysis.capacity1bit}
              </div>
              {Object.entries(analysis.lsb).map(([ch, stat]) => {
                const chColor = { red: "var(--red)", green: "var(--green)", blue: "var(--accent)", alpha: "#a78bfa" }[ch] || "var(--accent)";
                return (
                  <div key={ch} style={{
                    marginBottom: 12, padding: "10px 12px",
                    background: "var(--bg-card-2)", borderRadius: 6,
                    border: `1px solid ${stat.suspicious ? "var(--yellow)33" : "var(--border-sub)"}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: chColor, textTransform: "capitalize" }}>
                        {ch} channel LSB
                      </span>
                      <span style={{
                        fontSize: 10, padding: "1px 8px", borderRadius: 20,
                        background: stat.suspicious ? "#2a1800" : "var(--bg-hover)",
                        color: stat.suspicious ? "var(--yellow)" : "var(--text-3)",
                        border: `1px solid ${stat.suspicious ? "var(--yellow)44" : "var(--border)"}`,
                      }}>
                        {stat.suspicious ? "⚠️ Suspicious" : "✓ Normal"}
                      </span>
                    </div>
                    <div style={{ background: "var(--bg-hover)", borderRadius: 4, height: 8, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{
                        width: `${stat.ratio * 100}%`, height: "100%",
                        background: stat.suspicious ? "var(--yellow)" : chColor,
                        transition: ".5s",
                      }} />
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--text-3)", flexWrap: "wrap" }}>
                      <span>0s: <strong style={{ color: "var(--text-2)" }}>{stat.zeros?.toLocaleString()}</strong></span>
                      <span>1s: <strong style={{ color: "var(--text-2)" }}>{stat.ones?.toLocaleString()}</strong></span>
                      <span>ratio: <strong style={{ color: stat.suspicious ? "var(--yellow)" : "var(--text-2)" }}>{stat.ratio}</strong></span>
                      <span>dev: <strong style={{ color: "var(--text-2)" }}>{stat.deviation}</strong></span>
                    </div>
                  </div>
                );
              })}
              <div className="info-box">
                A ratio close to <strong>0.5</strong> means equal 0s and 1s — the hallmark of LSB steganography.
                Natural images have irregular ratios. Deviation below <strong>0.02</strong> is suspicious.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">How LSB Works</div>
        <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.8 }}>
          Each pixel channel is an 8-bit number (0–255). The{" "}
          <strong style={{ color: "var(--text-1)" }}>Least Significant Bit</strong> changes pixel value by only 1
          — completely invisible to the human eye.
          <div style={{ margin: "10px 0", padding: "10px 14px", background: "var(--bg-code)", borderRadius: 5, fontFamily: "var(--font-mono)" }}>
            <div style={{ color: "var(--yellow)" }}>Original:  1011 0110  (182)</div>
            <div style={{ color: "var(--green)" }}>Stego bit: 1011 0111  (183) ← difference of 1/256</div>
          </div>
          A 512×512 PNG = 262,144 pixels × 3 channels ={" "}
          <strong style={{ color: "var(--accent)" }}>~98 KB hidden capacity</strong> with 1 bpp.
        </div>
      </div>
    </div>
  );
}
