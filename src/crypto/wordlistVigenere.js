import { vigDec } from "./vigenere.js";
import { scoreText } from "./analysis.js";

// ─── English wordlist (top ~300 common words as Vigenère key candidates) ──────

export const KEY_WORDLIST = [
  // Common English words
  "the","be","to","of","and","in","that","have","it","for","not","on","with",
  "he","as","you","do","at","this","but","his","by","from","they","we","say",
  "her","she","or","an","will","my","one","all","would","there","their","what",
  "so","up","out","if","about","who","get","which","go","me","when","make",
  "can","like","time","no","just","him","know","take","people","into","year",
  "your","good","some","could","them","see","other","than","then","now","look",
  "only","come","its","over","think","also","back","after","use","two","how",
  "our","work","first","well","way","even","new","want","because","any","these",
  "give","day","most","us","great","between","need","large","often","hand","high",
  // Common key words (CTF-style)
  "key","secret","flag","ctf","hack","password","cipher","crypto","crypt","code",
  "lemon","orange","apple","banana","cherry","dragon","monkey","master","alpha",
  "beta","gamma","delta","omega","sigma","theta","kappa","lambda","access","admin",
  "login","test","demo","sample","hello","world","python","linux","magic","power",
  "light","dark","night","day","sun","moon","star","fire","water","earth","wind",
  "king","queen","jack","ace","card","game","play","win","lose","draw","match",
  // Longer candidate keys (4-8 chars — common Vigenère key lengths in CTFs)
  "secure","hidden","private","public","encode","decode","encrypt","decrypt",
  "attack","defense","breach","exploit","shield","sword","armor","weapon",
  "winter","summer","spring","autumn","monday","friday","sunday","weekly",
  "matrix","vector","scalar","binary","octal","hexa","decimal","unicode",
  "python","javascript","typescript","golang","kotlin","swift","kotlin","rust",
  "caesar","vigenere","playfair","atbash","affine","beaufort","enigma","blowfish",
  "aes","des","rsa","sha","md5","hmac","pbkdf","scrypt","bcrypt","argon",
];

// ─── Score a decryption attempt ───────────────────────────────────────────────

function scorePair(key, decrypted) {
  return {
    key,
    decrypted,
    score: scoreText(decrypted),
    hasFlag: /flag\{[^}]+\}/i.test(decrypted),
  };
}

// ─── Wordlist attack ──────────────────────────────────────────────────────────

export function wordlistVigenereAttack(ciphertext, customWords = []) {
  const words = [...new Set([...KEY_WORDLIST, ...customWords.map(w => w.trim()).filter(Boolean)])];
  const results = [];

  for (const word of words) {
    if (!word || word.length < 2) continue;
    try {
      const decrypted = vigDec(ciphertext, word);
      const scored = scorePair(word, decrypted);
      if (scored.score > 0 || scored.hasFlag) results.push(scored);
    } catch {}
  }

  // Also try uppercase, reversed, and l33tspeak variants of top hits
  const topWords = words.slice(0, 50);
  for (const word of topWords) {
    for (const variant of [word.toUpperCase(), word.split("").reverse().join(""), word + word]) {
      try {
        const decrypted = vigDec(ciphertext, variant);
        const scored = scorePair(variant, decrypted);
        if (scored.score > 5) results.push(scored);
      } catch {}
    }
  }

  return results
    .sort((a, b) => {
      if (a.hasFlag && !b.hasFlag) return -1;
      if (!a.hasFlag && b.hasFlag) return 1;
      return b.score - a.score;
    })
    .slice(0, 30)
    .filter(r => r.score > 0);
}
