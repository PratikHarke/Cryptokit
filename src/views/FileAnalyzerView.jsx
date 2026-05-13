import { useState, useCallback, useRef, useEffect } from "react";
import { autoSolve } from "../crypto/autoSolver.js";
import { shannonEntropy } from "../crypto/entropy.js";
import TerminalLog, { PerfBadge, ConfidenceBar } from "../components/TerminalLog.jsx";
import { CopyBtn } from "../components/Output.jsx";

// ── File magic bytes → type detection ────────────────────────────────────────
const MAGIC = [
  { sig: [0x89,0x50,0x4e,0x47], type: "PNG image",   ext: "png"  },
  { sig: [0xff,0xd8,0xff],       type: "JPEG image",  ext: "jpg"  },
  { sig: [0x47,0x49,0x46],       type: "GIF image",   ext: "gif"  },
  { sig: [0x42,0x4d],            type: "BMP image",   ext: "bmp"  },
  { sig: [0x50,0x4b,0x03,0x04],  type: "ZIP archive", ext: "zip"  },
  { sig: [0x1f,0x8b],            type: "Gzip archive",ext: "gz"   },
  { sig: [0x78,0x9c],            type: "Zlib stream", ext: "zlib" },
  { sig: [0x78,0x01],            type: "Zlib stream (low compression)", ext: "zlib" },
  { sig: [0x78,0xda],            type: "Zlib stream (best compression)", ext: "zlib" },
  { sig: [0x25,0x50,0x44,0x46],  type: "PDF document",ext: "pdf"  },
  { sig: [0x7f,0x45,0x4c,0x46],  type: "ELF binary",  ext: "elf"  },
  { sig: [0x4d,0x5a],            type: "Windows EXE", ext: "exe"  },
  { sig: [0xff,0xfe],            type: "UTF-16 LE text", ext: "txt" },
  { sig: [0xef,0xbb,0xbf],       type: "UTF-8 BOM text", ext: "txt" },
];

function detectMagic(bytes) {
  for (const m of MAGIC) {
    if (m.sig.every((b, i) => bytes[i] === b)) return m;
  }
  return null;
}

// ── Extract readable strings from binary ─────────────────────────────────────
function extractStrings(bytes, minLen = 4) {
  const strs = [];
  let cur = "";
  for (const b of bytes) {
    if (b >= 32 && b < 127) {
      cur += String.fromCharCode(b);
    } else {
      if (cur.length >= minLen) strs.push(cur);
      cur = "";
    }
  }
  if (cur.length >= minLen) strs.push(cur);
  return strs;
}

// ── Byte frequency histogram ──────────────────────────────────────────────────
function ByteHistogram({ bytes }) {
  const freq = new Uint32Array(256);
  for (const b of bytes) freq[b]++;
  const max = Math.max(...freq);

  // Show top 16 most frequent bytes
  const top = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 16);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 40 }}>
      {top.map(([byte, count]) => (
        <div key={byte} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
          <div style={{
            width: "100%",
            height: Math.max(2, Math.round((count / max) * 36)),
            background: byte >= 32 && byte < 127 ? "#00d4ff" : "#475569",
            borderRadius: "1px 1px 0 0",
            transition: ".3s",
          }} />
          <div style={{ fontSize: 7, color: "#334155", fontFamily: "var(--font-mono)", marginTop: 2 }}>
            {byte.toString(16).padStart(2,"0")}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function Stat({ label, value, color }) {
  return (
    <div style={{
      background: "#030b15",
      border: "1px solid #0f2035",
      borderRadius: 6,
      padding: "8px 12px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 9, color: "#475569", fontFamily: "var(--font-mono)", letterSpacing: "1px", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || "var(--text-1)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{value}</div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function FileAnalyzerView({ addHistory, onNavigate }) {
  const [file, setFile]         = useState(null);
  const [bytes, setBytes]       = useState(null);
  const [text, setText]         = useState("");
  const [logs, setLogs]         = useState([]);
  const [strings, setStrings]   = useState([]);
  const [autoResults, setAutoResults] = useState([]);
  const [elapsed, setElapsed]   = useState(null);
  const [tab, setTab]           = useState("overview");
  const [running, setRunning]   = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const analyze = useCallback(async (buf, name) => {
    setRunning(true);
    setLogs([{ type: "cmd", text: `analyze "${name}"` }, { type: "sep" }]);
    const t0 = performance.now();

    const byteArr = new Uint8Array(buf);
    setBytes(byteArr);

    // Magic bytes
    const magic = detectMagic(byteArr);
    const newLogs = [
      { type: "cmd", text: `analyze "${name}"` },
      { type: "sep" },
      { type: "info", text: `File size: ${byteArr.length} bytes (${(byteArr.length / 1024).toFixed(1)} KB)` },
      { type: "info", text: `Type: ${magic ? magic.type : "Unknown / binary"}` },
    ];

    // Entropy
    const H = shannonEntropy(Array.from(byteArr));
    newLogs.push({ type: "info", text: `Shannon entropy: ${H.toFixed(3)} bits/byte` });
    if (H > 7.5) newLogs.push({ type: "warn", text: "High entropy — likely encrypted or compressed" });
    else if (H < 2) newLogs.push({ type: "warn", text: "Very low entropy — repeated patterns / simple cipher" });
    else newLogs.push({ type: "ok", text: "Entropy consistent with text/structured data" });

    // Strings extraction
    const strs = extractStrings(byteArr, 4);
    setStrings(strs);
    newLogs.push({ type: "sep" });
    newLogs.push({ type: "info", text: `Extracted ${strs.length} printable string${strs.length !== 1 ? "s" : ""} (≥4 chars)` });

    // Look for flags in strings
    const flagStrs = strs.filter(s => /flag\{|ctf\{|[a-z_]{2,20}\{[^}]+\}/i.test(s));
    if (flagStrs.length > 0) {
      newLogs.push({ type: "flag", text: `Possible flag in strings: ${flagStrs[0]}` });
    }

    // Try to read as text
    let textContent = "";
    try {
      textContent = new TextDecoder("utf-8", { fatal: false }).decode(byteArr);
      setText(textContent);
    } catch {
      textContent = strs.slice(0, 20).join("\n");
      setText(textContent);
    }

    // Auto-solve on text content (first 2000 chars)
    const sample = textContent.trim().slice(0, 2000);
    if (sample.length >= 4) {
      newLogs.push({ type: "sep" });
      newLogs.push({ type: "info", text: "Running auto-solve on text content…" });

      try {
        const res = await autoSolve(sample);
        setAutoResults(res);
        if (res.length > 0) {
          newLogs.push({ type: "ok", text: `Auto-solve: ${res.length} candidate(s)` });
          if (res[0].hasFlag) {
            newLogs.push({ type: "flag", text: `FLAG: ${res[0].output}` });
          } else {
            newLogs.push({ type: "ok", text: `Best: [${res[0].method}] ${res[0].output.slice(0, 60)}` });
          }
        } else {
          newLogs.push({ type: "dim", text: "No decodings detected in text content." });
        }
      } catch (e) {
        newLogs.push({ type: "error", text: `Auto-solve error: ${e.message}` });
      }
    }

    const ms = Math.round(performance.now() - t0);
    setElapsed(ms);
    newLogs.push({ type: "sep" });
    newLogs.push({ type: "ok", text: `Analysis complete in ${ms}ms` });
    setLogs(newLogs);

    addHistory?.(
      "File Analyzer",
      name,
      magic ? `${magic.type} · ${byteArr.length}B · H=${H.toFixed(2)}` : `${byteArr.length}B · H=${H.toFixed(2)}`,
    );

    setRunning(false);
    setTab("overview");
  }, [addHistory]);

  // Clear file buffer from memory on unmount — file content never persists
  useEffect(() => {
    return () => {
      setFile(null);
      setBytes(null);
      setLogs([]);
      setStrings([]);
      setAutoResults([]);
    };
  }, []);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

  const handleFile = useCallback((f) => {
    if (f.size > MAX_FILE_SIZE) {
      setLogs([{
        type: "error",
        text: `File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum supported size is 50 MB.`,
      }]);
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => analyze(e.target.result, f.name);
    reader.onerror = () => setLogs([{ type: "error", text: "Failed to read file." }]);
    reader.readAsArrayBuffer(f);
  }, [analyze]);

  const handleDrop = useCallback(e => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const magic  = bytes ? detectMagic(bytes) : null;
  const H      = bytes ? shannonEntropy(Array.from(bytes)) : 0;

  return (
    <div>
      <div className="section-header">
        <h3>File Analyzer</h3>
        <p>Drop any file — binary, text, image, archive. Extracts strings, runs auto-solve, checks entropy and magic bytes.</p>
        <p style={{ fontSize:10, color:"var(--text-3)", marginTop:4, fontFamily:"var(--font-mono)" }}>
          🔒 Files are processed locally in your browser and never uploaded to any server. Content is cleared from memory when you leave this view.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "#00d4ff" : file ? "#00e87a44" : "#1e3a5f"}`,
          borderRadius: 8,
          padding: "28px 20px",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? "#00d4ff04" : "#020810",
          transition: "all .15s",
          marginBottom: 12,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          style={{ display: "none" }}
          onChange={e => e.target.files[0] && handleFile(e.target.files[0])}
        />
        <div style={{ fontSize: 28, marginBottom: 8 }}>{file ? "📄" : "📂"}</div>
        <div style={{ fontSize: 13, color: "var(--text-1)", fontFamily: "var(--font-mono)" }}>
          {file ? file.name : "Drop file here or click to browse"}
        </div>
        <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
          {file
            ? `${(file.size / 1024).toFixed(1)} KB · ${file.type || "unknown type"}`
            : ".txt · .bin · .png · .jpg · .zip · any file"}
        </div>
      </div>

      {bytes && (
        <>
          {/* Stats bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
            <Stat label="Size" value={`${bytes.length}B`} color="#00d4ff" />
            <Stat label="Type" value={magic?.ext.toUpperCase() || "BIN"} color="#a78bfa" />
            <Stat label="Entropy" value={H.toFixed(2)} color={H > 7.5 ? "#f87171" : H < 2 ? "#fbbf24" : "#00e87a"} />
            <Stat label="Strings" value={strings.length} color="#fbbf24" />
          </div>

          {elapsed !== null && <PerfBadge ms={elapsed} label="analysis" />}

          <div className="tabs-wrap" style={{ marginTop: 10 }}>
            {[["overview","Overview"],["strings","Strings"],["autosolver","Auto-Solve"],["hex","Hex view"]].map(([id, label]) => (
              <button key={id} className={`tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>
                {label}
                {id === "autosolver" && autoResults.length > 0 && (
                  <span style={{ marginLeft: 4, fontSize: 9, color: autoResults[0].hasFlag ? "#00e87a" : "#00d4ff" }}>
                    {autoResults.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <TerminalLog lines={logs} running={running} label={file?.name} maxHeight={380} />
              <div className="card">
                <div className="card-title">Byte frequency (top 16)</div>
                <ByteHistogram bytes={bytes} />
                <div style={{ marginTop: 12 }}>
                  <div className="card-title">Entropy</div>
                  <ConfidenceBar pct={Math.round((H / 8) * 100)} color={H > 7.5 ? "#f87171" : H < 2 ? "#fbbf24" : "#00e87a"} />
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    {H > 7.5 ? "Encrypted / compressed — no decodings likely" :
                     H > 5   ? "Moderate entropy — could be encoded text" :
                                "Low entropy — likely plaintext or simple encoding"}
                  </div>
                </div>
                {magic && (
                  <div style={{ marginTop: 12 }}>
                    <div className="card-title">File type</div>
                    <div style={{ fontSize: 13, color: "#00d4ff", fontFamily: "var(--font-mono)" }}>
                      {magic.type}
                    </div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                      Detected via magic bytes at offset 0
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "strings" && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>
                  Extracted strings ({strings.length})
                </div>
                <CopyBtn text={strings.join("\n")} />
              </div>
              {strings.length === 0 && <div className="empty">No printable strings found (≥4 chars).</div>}
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {strings.slice(0, 200).map((s, i) => {
                  const isFlag = /flag\{|ctf\{/i.test(s);
                  return (
                    <div key={i} style={{
                      display: "flex",
                      gap: 10,
                      padding: "3px 0",
                      borderBottom: "1px solid #0a1628",
                      alignItems: "baseline",
                    }}>
                      <span style={{ fontSize: 9, color: "#1e3a5f", fontFamily: "var(--font-mono)", minWidth: 28 }}>
                        {i + 1}
                      </span>
                      <span style={{
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        color: isFlag ? "#00e87a" : "var(--text-2)",
                        wordBreak: "break-all",
                      }}>
                        {isFlag && "🏁 "}{s}
                      </span>
                    </div>
                  );
                })}
                {strings.length > 200 && (
                  <div style={{ fontSize: 11, color: "#475569", padding: "8px 0" }}>
                    +{strings.length - 200} more strings…
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "autosolver" && (
            <div>
              {autoResults.length === 0 ? (
                <div className="card"><div className="empty">No decodings detected in file content.</div></div>
              ) : (
                autoResults.slice(0, 8).map((r, i) => (
                  <div key={i} className="card" style={{
                    marginBottom: 8,
                    borderColor: r.hasFlag ? "#00e87a30" : "var(--border)",
                    background: r.hasFlag ? "#001a0a" : "var(--bg-card)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {r.hasFlag && <span>🏁</span>}
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)" }}>{r.method}</span>
                        <span style={{ fontSize: 10, color: "#475569" }}>[{r.category}]</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#00d4ff" }}>
                          {r.confidence}%
                        </span>
                        <CopyBtn text={r.output} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      color: r.hasFlag ? "#00e87a" : "var(--text-2)",
                      wordBreak: "break-all",
                      lineHeight: 1.5,
                    }}>
                      {r.output.slice(0, 200)}{r.output.length > 200 ? "…" : ""}
                    </div>
                    <ConfidenceBar pct={r.confidence} color={r.hasFlag ? "#00e87a" : "#00d4ff"} />
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "hex" && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>Hex dump (first 512 bytes)</div>
                <CopyBtn text={Array.from(bytes.slice(0, 512)).map(b => b.toString(16).padStart(2,"0")).join(" ")} />
              </div>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-2)",
                lineHeight: 1.8,
                maxHeight: 360,
                overflowY: "auto",
              }}>
                {Array.from({ length: Math.ceil(Math.min(bytes.length, 512) / 16) }, (_, row) => {
                  const offset = row * 16;
                  const chunk = bytes.slice(offset, offset + 16);
                  const hex = Array.from(chunk).map(b => b.toString(16).padStart(2,"0")).join(" ");
                  const ascii = Array.from(chunk).map(b => (b >= 32 && b < 127 ? String.fromCharCode(b) : "·")).join("");
                  return (
                    <div key={row} style={{ display: "flex", gap: 16 }}>
                      <span style={{ color: "#1e3a5f", minWidth: 36 }}>
                        {offset.toString(16).padStart(4,"0")}
                      </span>
                      <span style={{ flex: 1 }}>{hex.padEnd(47)}</span>
                      <span style={{ color: "#475569" }}>{ascii}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
