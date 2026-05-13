// ─── Comprehensive Hash Identification ────────────────────────────────────────

const HASH_DB = [
  // ── Hex-based hashes by length ─────────────────────────────────────────────
  { len:8,  hex:true,  type:"CRC-32",          conf:"High",    note:"8 hex chars — checksum, not cryptographic" },
  { len:16, hex:true,  type:"MD5 (half)",       conf:"Low",     note:"Truncated MD5 or MySQL OLD_PASSWORD" },
  { len:32, hex:true,  type:"MD5",              conf:"High",    note:"128-bit — broken, use SHA-256+ instead" },
  { len:32, hex:true,  type:"NTLM",             conf:"Medium",  note:"Windows NTLM password hash" },
  { len:32, hex:true,  type:"MD4",              conf:"Low",     note:"Predecessor to MD5, also broken" },
  { len:32, hex:true,  type:"LM (half)",        conf:"Low",     note:"LAN Manager half-hash (Windows legacy)" },
  { len:40, hex:true,  type:"SHA-1",            conf:"High",    note:"160-bit — deprecated, collision attacks known" },
  { len:40, hex:true,  type:"MySQL 4.1+",       conf:"Medium",  note:"MySQL SHA-1 password hash" },
  { len:40, hex:true,  type:"RIPEMD-160",       conf:"Medium",  note:"160-bit European alternative to SHA-1" },
  { len:48, hex:true,  type:"Tiger-192",        conf:"Medium",  note:"192-bit Tiger hash" },
  { len:56, hex:true,  type:"SHA-224",          conf:"High",    note:"SHA-2 family, 224-bit output" },
  { len:56, hex:true,  type:"SHA3-224",         conf:"Medium",  note:"SHA-3 Keccak 224-bit variant" },
  { len:64, hex:true,  type:"SHA-256",          conf:"High",    note:"Most common SHA-2, used in TLS/Bitcoin" },
  { len:64, hex:true,  type:"SHA3-256",         conf:"Medium",  note:"SHA-3 Keccak 256-bit variant" },
  { len:64, hex:true,  type:"BLAKE2s",          conf:"Low",     note:"Fast 256-bit hash (TLS 1.3)" },
  { len:64, hex:true,  type:"Keccak-256",       conf:"Medium",  note:"Ethereum address derivation hash" },
  { len:80, hex:true,  type:"RIPEMD-320",       conf:"Medium",  note:"320-bit RIPEMD extension" },
  { len:96, hex:true,  type:"SHA-384",          conf:"High",    note:"SHA-2 family, 384-bit output" },
  { len:96, hex:true,  type:"SHA3-384",         conf:"Medium",  note:"SHA-3 Keccak 384-bit variant" },
  { len:128,hex:true,  type:"SHA-512",          conf:"High",    note:"SHA-2 family, 512-bit — very strong" },
  { len:128,hex:true,  type:"SHA3-512",         conf:"Medium",  note:"SHA-3 Keccak 512-bit variant" },
  { len:128,hex:true,  type:"Whirlpool",        conf:"Low",     note:"512-bit AES-based hash" },
  { len:128,hex:true,  type:"BLAKE2b",          conf:"Low",     note:"Fast 512-bit hash" },
];

const PREFIX_DB = [
  // ── Unix/Linux crypt formats ────────────────────────────────────────────────
  { prefix:"$1$",       type:"MD5crypt",          conf:"Very High", note:"Unix MD5 crypt ($1$ prefix)" },
  { prefix:"$2a$",      type:"bcrypt",            conf:"Very High", note:"bcrypt (cost factor embedded)" },
  { prefix:"$2b$",      type:"bcrypt",            conf:"Very High", note:"bcrypt v2b variant" },
  { prefix:"$2x$",      type:"bcrypt",            conf:"Very High", note:"bcrypt legacy (vulnerable version)" },
  { prefix:"$2y$",      type:"bcrypt",            conf:"Very High", note:"bcrypt PHP variant" },
  { prefix:"$5$",       type:"SHA-256crypt",      conf:"Very High", note:"Unix SHA-256 crypt (rounds optional)" },
  { prefix:"$6$",       type:"SHA-512crypt",      conf:"Very High", note:"Unix SHA-512 crypt — Linux default" },
  { prefix:"$7$",       type:"scrypt",            conf:"Very High", note:"scrypt KDF hash" },
  { prefix:"$y$",       type:"yescrypt",          conf:"Very High", note:"yescrypt — modern Linux default" },
  { prefix:"$sha1$",    type:"SHA-1crypt",        conf:"Very High", note:"NetBSD SHA-1 crypt" },
  // ── KDF formats ─────────────────────────────────────────────────────────────
  { prefix:"$argon2i$", type:"Argon2i",           conf:"Very High", note:"Argon2 (data-independent, side-channel resistant)" },
  { prefix:"$argon2d$", type:"Argon2d",           conf:"Very High", note:"Argon2 (data-dependent, GPU resistant)" },
  { prefix:"$argon2id$",type:"Argon2id",          conf:"Very High", note:"Argon2id — recommended modern KDF" },
  { prefix:"pbkdf2",    type:"PBKDF2",            conf:"High",      note:"PBKDF2 key derivation (Django/iOS/Android)" },
  // ── Framework hashes ────────────────────────────────────────────────────────
  { prefix:"sha1$",     type:"Django SHA-1",      conf:"Very High", note:"Django legacy SHA-1 hash" },
  { prefix:"sha256$",   type:"Django SHA-256",    conf:"Very High", note:"Django SHA-256 hash" },
  { prefix:"bcrypt$$",  type:"Django bcrypt",     conf:"Very High", note:"Django-wrapped bcrypt" },
  { prefix:"md5$$",     type:"Django MD5",        conf:"Very High", note:"Django legacy MD5 (insecure)" },
  { prefix:"$P$",       type:"WordPress/PHPass",  conf:"Very High", note:"WordPress password hash (MD5 iterated)" },
  { prefix:"$H$",       type:"phpBB/PHPass",      conf:"Very High", note:"phpBB/PHPass portable hash" },
  { prefix:"$S$",       type:"Drupal SHA-512",    conf:"Very High", note:"Drupal 7+ salted SHA-512" },
  { prefix:"$apr1$",    type:"Apache MD5",        conf:"Very High", note:"Apache .htpasswd MD5 format" },
  { prefix:"{SHA}",     type:"SHA-1 (LDAP/Base64)",conf:"Very High",note:"LDAP SHA-1, Base64-encoded" },
  { prefix:"{SSHA}",    type:"Salted SHA-1 (LDAP)",conf:"Very High",note:"LDAP salted SHA-1, Base64-encoded" },
  { prefix:"{MD5}",     type:"MD5 (LDAP/Base64)", conf:"Very High", note:"LDAP MD5, Base64-encoded" },
  { prefix:"U$P$",      type:"WordPress (portable)",conf:"Very High",note:"Portable password hash" },
  // ── Database / App hashes ───────────────────────────────────────────────────
  { prefix:"*",         type:"MySQL SHA-1",       conf:"Medium",    note:"MySQL 4.1+ SHA-1 password (41 chars total)" },
  // ── Cisco ───────────────────────────────────────────────────────────────────
  { prefix:"$9$",       type:"Cisco Type-9",      conf:"Very High", note:"Cisco IOS scrypt hash" },
  { prefix:"$8$",       type:"Cisco Type-8",      conf:"Very High", note:"Cisco IOS PBKDF2-SHA-256" },
];

// Pattern-based detection (regex)
const PATTERN_DB = [
  { re:/^\$[0-9a-f]{8,}\$[0-9a-f]+$/i,          type:"Cisco Type-5",          conf:"High",  note:"Cisco MD5 enable secret" },
  { re:/^[0-9a-f]{32}:[0-9a-f]{32}$/i,           type:"LM:NTLM",               conf:"High",  note:"Windows LM:NTLM dump format" },
  { re:/^[0-9a-f]{64}:[a-z0-9]+$/i,              type:"SHA-256 + salt",         conf:"Medium",note:"Salted SHA-256 (format: hash:salt)" },
  { re:/^\{[A-Z0-9]+\}[A-Za-z0-9+/]+=*$/,       type:"LDAP hash",              conf:"High",  note:"LDAP hashed password" },
  { re:/^[0-9a-f]{32}:[0-9a-zA-Z]+$/i,           type:"MD5 + salt",             conf:"Medium",note:"Salted MD5 (format: hash:salt)" },
  { re:/^sha[0-9]+:[0-9]:[a-zA-Z0-9+/=:]+$/,    type:"PBKDF2 (portable)",      conf:"High",  note:"PBKDF2 portable format" },
  { re:/^0x[0-9a-f]+$/i,                          type:"Hex prefixed",           conf:"Low",   note:"Hex with 0x prefix — convert to check length" },
  { re:/^[A-Za-z0-9+/]{43}=$/,                   type:"SHA-256 (Base64)",       conf:"Medium",note:"43 Base64 chars + padding = 256 bits" },
  { re:/^[A-Za-z0-9+/]{27}=$/,                   type:"SHA-1 (Base64)",         conf:"Medium",note:"28 Base64 chars = 160 bits" },
  { re:/^[A-Za-z0-9+/]{86}==$/,                  type:"SHA-512 (Base64)",       conf:"Medium",note:"88 Base64 chars = 512 bits" },
  { re:/^\$mysql\$/i,                              type:"MySQL (new format)",     conf:"High",  note:"MySQL 8.0+ caching_sha2_password" },
  { re:/^[0-9a-f]{16}$/i,                         type:"MySQL v3 (OLD_PASSWORD)",conf:"Medium",note:"MySQL pre-4.1 password hash" },
];

// Special detections
function detectSpecial(h) {
  const results = [];
  
  // JWT
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(h)) {
    try {
      const [header] = h.split(".");
      JSON.parse(atob(header.replace(/-/g,"+").replace(/_/g,"/")));
      results.push({ type:"JWT (JSON Web Token)", conf:"Very High", note:"3-part base64url format — use JWT Inspector" });
    } catch {}
  }
  
  // RSA public key
  if (h.includes("-----BEGIN")) {
    if (h.includes("PUBLIC KEY")) results.push({ type:"RSA Public Key (PEM)", conf:"Very High", note:"PEM-encoded RSA/EC public key" });
    else if (h.includes("PRIVATE KEY")) results.push({ type:"RSA Private Key (PEM)", conf:"Very High", note:"PEM-encoded private key — SENSITIVE!" });
    else if (h.includes("CERTIFICATE")) results.push({ type:"X.509 Certificate (PEM)", conf:"Very High", note:"TLS/SSL certificate" });
    else if (h.includes("RSA")) results.push({ type:"RSA Key (PEM)", conf:"Very High", note:"PEM-encoded RSA key block" });
  }
  
  // ntds.dit format
  if (/^[^:]+:[0-9]+:[a-f0-9]{32}:[a-f0-9]{32}::$/.test(h)) {
    results.push({ type:"NTDS.dit (Active Directory)", conf:"Very High", note:"username:RID:LM:NTLM:: format" });
  }
  
  // Shadow file format
  if (/^[^:]+:\$[0-9a-z]+\$.+:[0-9:]+$/.test(h)) {
    results.push({ type:"/etc/shadow entry", conf:"High", note:"Linux shadow password file format" });
  }

  // Bitcoin WIF private key
  if (/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(h)) {
    results.push({ type:"Bitcoin WIF Private Key", conf:"Medium", note:"Wallet Import Format — 51 base58 chars" });
  }
  
  // Ethereum address
  if (/^0x[0-9a-fA-F]{40}$/.test(h)) {
    results.push({ type:"Ethereum Address", conf:"High", note:"20-byte hex Ethereum/EVM address" });
  }
  
  // Base32
  if (/^[A-Z2-7]+=*$/.test(h) && h.length % 8 === 0) {
    results.push({ type:"Base32 encoded", conf:"Medium", note:"Base32 alphabet (A-Z, 2-7) — not a hash, decode it" });
  }
  
  return results;
}

export function identifyHash(h) {
  const clean = h.trim();
  if (!clean) return [{ type:"(empty input)", conf:"None", note:"Paste a hash value above" }];
  
  const results = [];
  const seen = new Set();
  const add = (r) => { if (!seen.has(r.type)) { seen.add(r.type); results.push(r); } };

  // Special patterns first
  detectSpecial(clean).forEach(add);
  
  // Prefix matching
  for (const p of PREFIX_DB) {
    if (clean.startsWith(p.prefix)) add(p);
  }
  
  // Pattern regex matching
  for (const p of PATTERN_DB) {
    if (p.re.test(clean)) add({ type:p.type, conf:p.conf, note:p.note });
  }
  
  // Length+hex matching
  const isHex = /^[a-fA-F0-9]+$/.test(clean);
  if (isHex) {
    for (const h of HASH_DB) {
      if (h.hex && h.len === clean.length) add(h);
    }
  }
  
  if (results.length === 0) {
    // Unknown — give diagnostic info
    results.push({
      type:"Unknown",
      conf:"None",
      note:`Length: ${clean.length} chars | Hex: ${isHex} | Charset: ${[...new Set(clean)].sort().join("").slice(0,20)}…`,
    });
  }

  // Sort by confidence
  const order = { "Very High":0, "High":1, "Medium":2, "Low":3, "None":4 };
  return results.sort((a,b) => (order[a.conf]??5) - (order[b.conf]??5));
}

// ─── Password Audit ───────────────────────────────────────────────────────────
export function auditPassword(pw) {
  if (!pw) return null;
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 32;
  const entropy = pool > 0 ? Math.round(pw.length * Math.log2(pool)) : 0;
  const issues = [];
  if (pw.length < 8) issues.push("Too short (< 8 chars)");
  if (!/[a-z]/.test(pw)) issues.push("No lowercase letters");
  if (!/[A-Z]/.test(pw)) issues.push("No uppercase letters");
  if (!/[0-9]/.test(pw)) issues.push("No digits");
  if (!/[^a-zA-Z0-9]/.test(pw)) issues.push("No special characters");
  if (/(.)\\1{2,}/.test(pw)) issues.push("Repeated characters (aaa)");
  if (/^[0-9]+$/.test(pw)) issues.push("Numeric-only");
  if (/^[a-zA-Z]+$/.test(pw)) issues.push("Alpha-only");
  if (["password","qwerty","123456","letmein","admin","welcome","monkey","dragon","iloveyou","princess"]
    .some(w => pw.toLowerCase().includes(w))) issues.push("Contains common weak pattern");
  if (/(19|20)\\d{2}/.test(pw)) issues.push("Contains year pattern");
  if (/(.{2,})\\1{2,}/.test(pw)) issues.push("Contains repeated sequence");
  const strength = entropy < 40 ? "Weak" : entropy < 60 ? "Moderate" : entropy < 80 ? "Strong" : "Very Strong";
  const strengthColor = { Weak:"#ef4444", Moderate:"#f59e0b", Strong:"#22c55e", "Very Strong":"#3b82f6" }[strength];
  const crackTime = entropy < 28 ? "Instant" : entropy < 40 ? "< 1 second" : entropy < 55 ? "Hours to days" : entropy < 80 ? "Years to centuries" : "Practically uncrackable";
  return { entropy, pool, strength, strengthColor, crackTime, issues, pct: Math.min(100, Math.round(entropy * 1.25)) };
}
