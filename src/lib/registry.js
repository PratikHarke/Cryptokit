import { lazy } from "react";

// ── Tool registry ─────────────────────────────────────────────────────────────
// Single source of truth. id → label → icon → section → lazy component.
// ─────────────────────────────────────────────────────────────────────────────

export const TOOL_REGISTRY = [

  // ── Workbench (primary tools) ─────────────────────────────────────────────
  { id:"smartsolver",  section:"workbench", basic:true,  type:"ctf",
    icon:"🧠", label:"Smart Solver",      desc:"Quick Scan · Deep Scan · Guided Mode",
    tags:["auto","detect","pipeline","chain","smart","decode","ctf","entropy","frequency","analysis","aggressive","beam","guided"],
    component: lazy(()=>import("../views/SmartSolverView.jsx")) },

  { id:"manualpipeline", section:"workbench", basic:true, type:"utility",
    icon:"⛓",  label:"Manual Pipeline",   desc:"CyberChef-style recipe chaining with step output",
    tags:["chain","pipeline","transform","compose","recipe","cyberchef","manual"],
    component: lazy(()=>import("../views/PipelineView.jsx")) },

  { id:"fileanalyzer", section:"workbench", basic:true, type:"ctf",
    icon:"📂", label:"File Analyzer",     desc:"Drop any file — strings, entropy, magic bytes",
    tags:["file","binary","strings","entropy","hex","forensics","upload","magic"],
    component: lazy(()=>import("../views/FileAnalyzerView.jsx")) },

  { id:"xoranalyzer",  section:"workbench", basic:true, type:"ctf",
    icon:"⊕",  label:"XOR Analyzer",      desc:"Encrypt · Brute Force · Repeating-key Crack · Crib Drag",
    tags:["xor","bitwise","stream","brute","single byte","repeating","crib","drag","crack"],
    component: lazy(()=>import("../views/XORAnalyzerView.jsx")) },

  { id:"hashanalyzer", section:"workbench", basic:true, type:"ctf",
    icon:"#",  label:"Hash Analyzer",     desc:"Identify · Generate · Verify · Dictionary Attack · Argon2",
    tags:["hash","identify","md5","sha","bcrypt","argon2","crack","dictionary","kdf","phc","verify"],
    component: lazy(()=>import("../views/HashAnalyzerView.jsx")) },

  { id:"jwt",          section:"workbench", basic:true, type:"utility",
    icon:"🪙", label:"JWT Inspector",     desc:"Decode · audit · alg:none attack",
    tags:["jwt","json web token","alg none","auth","bearer"],
    component: lazy(()=>import("../views/JWTView.jsx")) },

  { id:"writeup",      section:"workbench", basic:true, type:"utility",
    icon:"📝", label:"Writeup Generator", desc:"Export your CTF solution as Markdown",
    tags:["writeup","markdown","export","ctf","report","write","document"],
    component: null /* handled by App.jsx special case */ },

  { id:"ctf",          section:"workbench", basic:true, type:"ctf",
    icon:"🏁", label:"Challenge Mode",   desc:"15 built-in CTF puzzles + leaderboard",
    tags:["challenge","puzzle","game","ctf","leaderboard"],
    component: lazy(()=>import("../views/CTFChallengeView.jsx")) },

  // ── Encoding Tools ────────────────────────────────────────────────────────
  { id:"base64",    section:"encoding", basic:true,  type:"utility",
    icon:"64", label:"Base64",          desc:"Encode / decode Base64 & Base64URL",
    tags:["base64","encode","decode","base64url"],
    component: lazy(()=>import("../views/Base64View.jsx")) },
  { id:"converter", section:"encoding", basic:true,  type:"utility",
    icon:"⬡",  label:"Base Converter",  desc:"Hex · Binary · Octal · ASCII · Decimal",
    tags:["hex","binary","octal","ascii","convert","base"],
    component: lazy(()=>import("../views/ConverterView.jsx")) },
  { id:"morse",     section:"encoding", basic:true,  type:"utility",
    icon:"📡", label:"Morse Code",      desc:"Encode / decode dots & dashes",
    tags:["morse","dots","dashes","telegraph"],
    component: lazy(()=>import("../views/MorseView.jsx")) },
  { id:"modernenc", section:"encoding", basic:false, type:"utility",
    icon:"🌐", label:"Modern Encoding", desc:"URL · HTML · Unicode · Zero-Width",
    tags:["url","html","unicode","urlencode","entity","percent","zero width"],
    component: lazy(()=>import("../views/ModernEncodingView.jsx")) },

  // ── Classical Ciphers ─────────────────────────────────────────────────────
  { id:"caesar",         section:"classical", basic:true,  type:"educational",
    icon:"C",  label:"Caesar",           desc:"Shift cipher A→D",
    tags:["caesar","shift","rot","classical"],
    component: lazy(()=>import("../views/CaesarView.jsx")) },
  { id:"rot13",          section:"classical", basic:true,  type:"utility",
    icon:"13", label:"ROT-13",           desc:"Caesar with shift 13",
    tags:["rot13","shift"],
    component: lazy(()=>import("../views/ROT13View.jsx")) },
  { id:"vigenere",       section:"classical", basic:true,  type:"educational",
    icon:"V",  label:"Vigenère",          desc:"Polyalphabetic cipher",
    tags:["vigenere","polyalphabetic","key"],
    component: lazy(()=>import("../views/VigenereView.jsx")) },
  { id:"atbash",         section:"classical", basic:true,  type:"educational",
    icon:"↔",  label:"Atbash",            desc:"Reverse alphabet A↔Z",
    tags:["atbash","reverse","mirror"],
    component: lazy(()=>import("../views/AtbashView.jsx")) },
  { id:"classicalextra", section:"classical", basic:false, type:"educational",
    icon:"+",  label:"More Ciphers",      desc:"Affine · Bacon · Playfair · Rail Fence",
    tags:["affine","bacon","playfair","beaufort","rail fence","columnar"],
    component: lazy(()=>import("../views/ClassicalExtraView.jsx")) },
  { id:"rc4",            section:"classical", basic:false, type:"utility",
    icon:"~",  label:"RC4 Stream",        desc:"RC4 stream cipher",
    tags:["rc4","stream","arcfour"],
    component: lazy(()=>import("../views/RC4View.jsx")) },

  // ── Cryptanalysis ─────────────────────────────────────────────────────────
  { id:"bf_caesar",    section:"cryptanalysis", basic:true,  type:"ctf",
    icon:"⟳",  label:"Caesar Bruteforce",  desc:"All 26 shifts scored by English frequency",
    tags:["brute","force","caesar","attack","shift"],
    component: lazy(()=>import("../views/BFCaesarView.jsx")) },
  { id:"vigcrack",     section:"cryptanalysis", basic:false, type:"ctf",
    icon:"🗝",  label:"Vigenère Crack",     desc:"Kasiski + IC auto-attack",
    tags:["vigenere","kasiski","ic","crack"],
    component: lazy(()=>import("../views/VigenereAttackView.jsx")) },
  { id:"substitution", section:"cryptanalysis", basic:false, type:"ctf",
    icon:"🔤", label:"Substitution Solver", desc:"Interactive monoalphabetic solver",
    tags:["substitution","monoalphabetic","solve"],
    component: lazy(()=>import("../views/SubstitutionView.jsx")) },
  { id:"freq",         section:"cryptanalysis", basic:false, type:"educational",
    icon:"📊", label:"Frequency Analysis",  desc:"Letter distribution chart",
    tags:["frequency","histogram","chart","letter"],
    component: lazy(()=>import("../views/FreqView.jsx")) },
  { id:"railfence",    section:"cryptanalysis", basic:false, type:"educational",
    icon:"⋮",  label:"Transposition",       desc:"Rail fence + columnar",
    tags:["rail fence","columnar","transposition"],
    component: lazy(()=>import("../views/RailFenceView.jsx")) },
  { id:"wordlistvig",  section:"cryptanalysis", basic:false, type:"ctf",
    icon:"📖", label:"Vigenère Wordlist",   desc:"Dictionary key attack",
    tags:["vigenere","wordlist","dictionary"],
    component: lazy(()=>import("../views/WordlistVigView.jsx")) },

  // ── Modern Crypto ─────────────────────────────────────────────────────────
  { id:"rsa",       section:"moderncrypto", basic:false, type:"ctf",
    icon:"🔏", label:"RSA Attacks",       desc:"Fermat · Wiener · GCD factoring",
    tags:["rsa","fermat","wiener","gcd","public key","factoring"],
    component: lazy(()=>import("../views/RSAView.jsx")) },
  { id:"aesblock",  section:"moderncrypto", basic:false, type:"educational",
    icon:"□",  label:"AES Block Modes",   desc:"ECB vs CBC visualizer",
    tags:["aes","ecb","cbc","block","mode","visual"],
    component: lazy(()=>import("../views/AESBlockView.jsx")) },
  { id:"numtheory", section:"moderncrypto", basic:false, type:"utility",
    icon:"∑",  label:"Number Theory",     desc:"GCD · ModInv · CRT · Primes",
    tags:["gcd","mod inverse","crt","prime","euler","number theory"],
    component: lazy(()=>import("../views/NumberTheoryView.jsx")) },

  // ── Steganography ─────────────────────────────────────────────────────────
  { id:"lsbstego", section:"stego", basic:true, type:"ctf",
    icon:"👁",  label:"LSB Steganography", desc:"Hide / extract data in image pixels",
    tags:["lsb","stego","image","pixel","hide","extract","forensics"],
    component: lazy(()=>import("../views/LSBStegoView.jsx")) },

  // ── Utilities ─────────────────────────────────────────────────────────────
  { id:"entropy",  section:"utilities", basic:false, type:"educational",
    icon:"〜", label:"Entropy Visualizer", desc:"Byte heatmap & Shannon entropy",
    tags:["entropy","shannon","heatmap","randomness"],
    component: lazy(()=>import("../views/EntropyView.jsx")) },
  { id:"wheel",    section:"utilities", basic:false, type:"educational",
    icon:"○",  label:"Cipher Wheel",       desc:"Interactive Caesar wheel",
    tags:["wheel","cipher","caesar","visual","interactive"],
    component: lazy(()=>import("../views/CipherWheelView.jsx")) },
  { id:"passaudit",section:"utilities", basic:false, type:"utility",
    icon:"🔒", label:"Password Audit",     desc:"Entropy & strength check",
    tags:["password","strength","entropy","audit","zxcvbn"],
    component: lazy(()=>import("../views/PassAuditView.jsx")) },
];

// ── Section metadata ──────────────────────────────────────────────────────────
export const SECTION_META = [
  { id:"workbench",     label:"Workbench",         icon:"⚡" },
  { id:"encoding",      label:"Encoding Tools",    icon:"📦" },
  { id:"classical",     label:"Classical Ciphers", icon:"🔐" },
  { id:"cryptanalysis", label:"Cryptanalysis",     icon:"🔎" },
  { id:"moderncrypto",  label:"Modern Crypto",     icon:"🔑" },
  { id:"stego",         label:"Steganography",     icon:"🖼️" },
  { id:"utilities",     label:"Utilities",         icon:"🛠️" },
];

// ── Derived lookups ────────────────────────────────────────────────────────────
export const TOOL_MAP = Object.fromEntries(TOOL_REGISTRY.map(t => [t.id, t]));

export const SECTIONS = SECTION_META
  .map(meta => ({ ...meta, items: TOOL_REGISTRY.filter(t => t.section === meta.id) }))
  .filter(s => s.items.length > 0);

export const ALL_TOOLS = TOOL_REGISTRY;
