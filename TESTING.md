# CryptoKit — Test Examples for Every Feature

Copy-paste these inputs directly into each tool. Expected outputs are shown so
you can confirm everything is working correctly.

---

## 1. Caesar Cipher

**Tool:** Sidebar → Classical Ciphers → Caesar

### Encrypt
| Field  | Value |
|--------|-------|
| Mode   | Encrypt |
| Input  | `Hello World` |
| Shift  | `3` |
| Output | `Khoor Zruog` |

### Decrypt
| Field  | Value |
|--------|-------|
| Mode   | Decrypt |
| Input  | `Khoor Zruog` |
| Shift  | `3` |
| Output | `Hello World` |

### Edge cases to try
- Shift `0` → output identical to input
- Shift `26` → same as shift 0 (full rotation)
- Shift `13` → same result as the ROT-13 tool
- Mixed case: `"Hello, World! 123"` → non-alpha chars unchanged
- Negative shift via decrypt: set mode=Encrypt, shift=23 → same as decrypt shift=3

---

## 2. ROT-13

**Tool:** Sidebar → Classical Ciphers → ROT-13

### Transform
| Input  | Output |
|--------|--------|
| `Hello World` | `Uryyb Jbeyq` |
| `Uryyb Jbeyq` | `Hello World` ← self-inverse |
| `flag{secret}` | `synt{frperg}` |
| `synt{frperg}` | `flag{secret}` |

### What to verify
Apply the output back as input — you must get the original text back (self-inverse property).

---

## 3. Vigenère Cipher

**Tool:** Sidebar → Classical Ciphers → Vigenère

### Encrypt
| Field   | Value |
|---------|-------|
| Mode    | Encrypt |
| Input   | `Attack at dawn` |
| Keyword | `LEMON` |
| Output  | `Lxfopv ef rnhr` |

### Decrypt
| Field   | Value |
|---------|-------|
| Mode    | Decrypt |
| Input   | `Lxfopv ef rnhr` |
| Keyword | `LEMON` |
| Output  | `Attack at dawn` |

### IC reading to check
Paste `Lxfopv ef rnhr` into the input box. The IC display should show a value
around `0.04`–`0.05` (lower than English 0.065 — confirming it's not plaintext).

---

## 4. XOR Cipher

**Tool:** Sidebar → Classical Ciphers → XOR

### Encrypt (text → hex)
| Field  | Value |
|--------|-------|
| Mode   | Encrypt |
| Input  | `Hello` |
| Key    | `KEY` |
| Output | `032035272a` |

### Decrypt (hex → text)
| Field  | Value |
|--------|-------|
| Mode   | Decrypt |
| Input  | `032035272a` |
| Key    | `KEY` |
| Output | `Hello` |

### Edge cases
- Key = same as message → all zero bytes → output `0000000000`
- Long key longer than message → only first N key bytes used
- Empty key → no output (requires a key)

---

## 5. Atbash

**Tool:** Sidebar → Classical Ciphers → Atbash

| Input         | Output        |
|---------------|---------------|
| `Hello World` | `Svool Dliow` |
| `Svool Dliow` | `Hello World` ← self-inverse |
| `ABCDEFGHIJKLMNOPQRSTUVWXYZ` | `ZYXWVUTSRQPONMLKJIHGFEDCBA` |
| `flag{test}` | `uozt{gvhg}` |

Apply the output as input — you must get back the original (self-inverse).

---

## 6. Base64

**Tool:** Sidebar → Encoding → Base64

### Encode
| Input           | Output                       |
|-----------------|------------------------------|
| `Hello World`   | `SGVsbG8gV29ybGQ=`           |
| `flag{test_value}` | `ZmxhZ3t0ZXN0X3ZhbHVlfQ==` |
| `a`             | `YQ==`                       |
| (empty string)  | (empty output)               |

### Decode
| Input                        | Output           |
|------------------------------|------------------|
| `SGVsbG8gV29ybGQ=`           | `Hello World`    |
| `ZmxhZ3t0ZXN0X3ZhbHVlfQ==` | `flag{test_value}` |
| `YQ==`                       | `a`              |
| `invalid!!!`                 | `Invalid Base64` |

---

## 7. Morse Code

**Tool:** Sidebar → Encoding → Morse Code

### Encode
| Input     | Output |
|-----------|--------|
| `SOS`     | `... --- ...` |
| `Hello`   | `.... . .-.. .-.. ---` |
| `Hi Mom`  | `.... .. / -- --- --` |
| `A`       | `.-` |

### Decode
| Input                             | Output  |
|-----------------------------------|---------|
| `... --- ...`                     | `sos`   |
| `.... . .-.. .-.. ---`            | `hello` |
| `.... .. / -- --- --`             | `hi mom` |
| `.- -... -.-. -..`                | `abcd`  |

> Note: words are separated by ` / ` (space-slash-space) in Morse mode.

---

## 8. Base Converter (Auto-detect)

**Tool:** Sidebar → CTF Tools → Base Converter

Paste each input — the tool should auto-detect the format and show all representations.

### Hex input
```
48 65 6c 6c 6f 20 57 6f 72 6c 64
```
- Detected: **Hex**
- ASCII: `Hello World`
- Binary: `01001000 01100101 ...`
- Decimal: `72 101 108 108 111 32 87 111 114 108 100`

### Binary input
```
01001000 01100101 01101100 01101100 01101111
```
- Detected: **Binary**
- ASCII: `Hello`
- Hex: `48 65 6c 6c 6f`

### Decimal bytes input
```
72 101 108 108 111
```
- Detected: **Decimal bytes**
- ASCII: `Hello`

### Base64 input
```
SGVsbG8gV29ybGQ=
```
- Detected: **Base64**
- ASCII: `Hello World`

### URL-encoded input
```
Hello%20World%21
```
- Detected: **URL encoded**
- ASCII: `Hello World!`

### Plain text input
```
Hello
```
- Detected: **ASCII / Text**
- Hex: `48 65 6c 6c 6f`
- Base64: `SGVsbG8=`

---

## 9. Pipeline

**Tool:** Sidebar → CTF Tools → Pipeline

### Test 1: Single Base64 layer
```
Input:  SGVsbG8gV29ybGQ=
Steps:  [Base64 → Text]
Output: Hello World
```

### Test 2: Double-encoded (Base64 → Base64)
```
Input:  U0dWc2JHOCJWW29ybGQ9
Steps:  [Base64 → Text] → [Base64 → Text]
```

### Test 3: Triple layer (B64 → ROT13 → B64) — classic CTF pattern
```
Input:  TXprdU0zZ2puS095b1R5aE1JOTNvM1dlcDMwPQ==
Steps:  [Base64 → Text] → [ROT-13] → [Base64 → Text]
Output: flag{pipeline_works}
```

### Test 4: Hex → ASCII → Uppercase
```
Input:  48656c6c6f
Steps:  [Hex → ASCII] → [Uppercase]
Output: HELLO
```

### Test 5: Reverse a string
```
Input:  .desrever si siht
Steps:  [Reverse]
Output: this is reversed.
```

### Test 6: Strip spaces then Hex decode
```
Input:  48 65 6c 6c 6f
Steps:  [Strip spaces] → [Hex → ASCII]
Output: Hello
```

---

## 10. XOR Cracker — Single-Byte

**Tool:** Sidebar → Cryptanalysis → XOR Bruteforce

Paste this hex — encrypted with single byte `0x42`:
```
362a2762242e2325622b31622a2b2626272c622a273027
```
- Expected top result: key `0x42` (66), plaintext `the flag is hidden here`

Second test — encrypted with `0x7f` (from challenge c07):
```
1b1b0a161b0b00171c191b061b1c031b020a1b0f1a06060d1f000516001b1b0a1c060e000617
```
- Expected: key `0x7f`, readable English plaintext

---

## 11. XOR Cracker — Repeating-Key (Cryptopals)

**Tool:** Sidebar → CTF Tools → XOR Cracker → tab: Repeating-Key Crack

### Test 1: Short key "ICE"
```
0b3637272a2b2e6320246324252f69690a65282e653b36272b2637692730633e2e6b3b3120286439602830292a2b2e663b296530
```
- Expected key length candidate: **3**
- Expected key: `ICE`
- Expected plaintext: `Burning em all, I am rubber duck...`

### Test 2: Key "cookie" (6 bytes — from challenge c11)
```
0e0b213f1b4d5a4f415d5015161a560d1d0606132e15460a0b170b2c0b120e1408121d0a010006051b0d140a0f041715060913020f02081f2e1f1e090d090813000d0308141709001e00060f1c1a14170e1d090d0c0a1c161c0c170a00091e10071716
```
- Expected key length: **6**
- Expected key string: `cookie`

---

## 12. XOR Cracker — Crib Drag (Two-Time Pad)

**Tool:** Sidebar → CTF Tools → XOR Cracker → tab: Crib Drag

Two messages XOR'd with the same key `SECRET`:

**Hex 1** (= "the quick brown fox" XOR "SECRET"):
```
27 2d 26 72 34 21 3a 26 28 72 27 26 3c 32 2d 72 23 3b 2b
```

**Hex 2** (= "attack at midnight!" XOR "SECRET"):
```
32 31 37 33 26 3f 73 24 37 72 28 3d 37 2b 2a 35 2d 20 72
```

Steps:
1. Paste Hex 1 and Hex 2 into the two input boxes
2. Click "XOR Together" — you get msg1 XOR msg2
3. Enter crib `the` and click Drag
4. Find the offset where the result is printable — that offset tells you where "the" appears in msg2
5. Try cribs: `the`, `at`, `fox`, `attack`

---

## 13. Substitution Solver

**Tool:** Sidebar → CTF Tools → Substitution Solver

### Test 1: Auto-guess starting point
Paste this Caesar-17 encoded paragraph (looks like substitution since no key is obvious):
```
Vmvip dfiezex kyv uvkvtkzmv vordzevu kyv vmzuvetv trivwlccp. Kyv trjv yru drep jkirexv tclvj yzuuve ze gcrze jzxyk. Efkyzex nrj rj zk jvvdvu kf sv.
```
- Click **Auto-Guess** → frequency mapping gives a close approximation
- The most common cipher letter `V` should map to `e` or `t`
- After a few manual adjustments, you'll read: `Every morning the detective...`

### What to look for
- Blue = cipher letters (top row)  
- Green = their current plain letter mapping  
- Frequency bars: the tallest bar in the cipher matches `e` in English  
- Unmapped letters show as `·` in the decoded output

---

## 14. Rail Fence

**Tool:** Sidebar → CTF Tools → Transposition → Rail Fence tab

### Encrypt
| Field  | Value |
|--------|-------|
| Mode   | Encrypt |
| Input  | `WEAREDISCOVEREDFLEEAATONCE` |
| Rails  | `3` |
| Output | `WECRLACERDSOEEFEATNEAIVDEO` |

### Decrypt
| Field  | Value |
|--------|-------|
| Mode   | Decrypt |
| Input  | `WECRLACERDSOEEFEATNEAIVDEO` |
| Rails  | `3` |
| Output | `WEAREDISCOVEREDFLEEAATONCE` |

### Bruteforce test
Switch to Decrypt mode, paste `fa_sfntoarli{ec}lge`, and look at the
bruteforce section. Rail count **4** should give `flag{rail_fence_classic}`.

### Grid visualization
Encrypt `HELLOWORLD` with 3 rails. You should see:
```
Rail 0: H . . . O . . . L .
Rail 1: . E . L . W . R . D
Rail 2: . . L . . . O . . .
```
Output: `HOLELWRDLO`

---

## 15. Columnar Transposition

**Tool:** Sidebar → CTF Tools → Transposition → Columnar tab

### Encrypt
| Field  | Value |
|--------|-------|
| Mode   | Encrypt |
| Input  | `WEAREDISCOVEREDFLEEAATONCE` |
| Key    | `ZEBRAS` |
| Output | `EVLOXACDAXESEAEROFTXDEENXWIREC` |

### Decrypt
| Field  | Value |
|--------|-------|
| Mode   | Decrypt |
| Input  | `EVLOXACDAXESEAEROFTXDEENXWIREC` |
| Key    | `ZEBRAS` |
| Output | `WEAREDISCOVEREDFLEEAATONCEX` (X = padding) |

### Grid to verify
Key `ZEBRAS` sorted → column read order is: A(1), B(2), E(0), R(3), S(4), Z(5).
The grid view should highlight each column in its read-order color.

---

## 16. JWT Inspector

**Tool:** Sidebar → CTF Tools → JWT Inspector

### Test 1: Valid HS256 JWT
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```
Expected decode:
- Header: `{"alg":"HS256","typ":"JWT"}`
- Payload: `{"sub":"1234567890","name":"John Doe","iat":1516239022}`
- `iat` → human date: Jan 18, 2018
- Security: warns about HS256 brute-forcing risk, notes no `exp` claim

### Test 2: alg:none JWT (critical vulnerability)
```
eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJndWVzdCIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.
```
Expected:
- 🚨 **Critical** flag: `alg:none — no signature verification`
- Header: `{"alg":"none","typ":"JWT"}`
- Click **Generate alg:none variant** → produces a forged token

### Test 3: Expired token
Paste this and note the expiry warning:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxMDAwMDAwMDAwfQ.signature
```
- `exp` = 2001 → token expired decades ago → ⚠️ shown

### alg:none attack flow
1. Paste any valid JWT
2. Click **Generate alg:none variant**
3. Copy the output (ends with a bare `.`)
4. The payload is unchanged — if the server skips verification, it accepts the forged token

---

## 17. Vigenère Auto-Crack

**Tool:** Sidebar → CTF Tools → Vigenère Crack

### Test: Key = CRYPTO (6 letters, 157-letter ciphertext)
```
Vyc hrgvvk lx iuv ddk qtpnihutrnwr wu mcgr wogmgmopk gc fcfvpc vcogsibbi. Ngiacwk qtvitv ccvfagrxhb, ccj dnf rigkthg dchloivq lhinu zt kscuyqes dp ycrcpv uwh wpkcgvsrkq iaso fl ias pvrlhfm.
```
Expected:
- Kasiski votes: highest for length **6**
- Column IC: candidate keylen=6 shows IC closest to 0.065
- Recovered key: **CRYPTO**
- Decrypted: `The system we use for cryptography is very important...`

### Reading the UI
- Higher Kasiski votes = stronger signal for that key length
- IC > 0.055 = likely correct length (column IC cards show green ✓)
- Column breakdown shows each key character and its chi-squared score
- Use **Manual Key Override** to test alternative keys if auto-crack isn't perfect

---

## 18. Caesar Bruteforce

**Tool:** Sidebar → Cryptanalysis → Caesar Bruteforce

### Test 1: ROT-13
```
Gur synt vf: synt{pnrfne_vf_rnfl}
```
- Shift 13 should score highest → `The flag is: flag{caesar_is_easy}`

### Test 2: Shift 7
```
Aol xbpjr iyvdu mve qbtwz vcly aol shgf kvn. Aol mpcl ivepun dpghykz qbtw xbpjrsf.
```
- Shift 19 (= 26−7) should score highest → recovers the original pangram

### Test 3: Gibberish (no clear winner)
```
xkcd1234abcdefghij
```
- Scores will be close together — no shift produces clear English

---

## 19. Frequency Analysis

**Tool:** Sidebar → Cryptanalysis → Frequency Analysis

### Test 1: English plaintext (baseline)
```
The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.
```
- IC: ~0.065 (English expected)
- Most frequent: `o`, `e`, `t`, `h`
- Bars should roughly match English expected (grey bars)

### Test 2: Caesar ciphertext (shifted distribution)
```
Aol xbpjr iyvdu mve qbtwz vcly aol shgf kvn. Aol mpcl ivepun dpghykz qbtw xbpjrsf.
```
- IC: still ~0.065 (monoalphabetic preserves IC)
- Distribution shape same as English, just shifted — most common letter `l` maps to `e`

### Test 3: Vigenère ciphertext (flat distribution)
```
Vyc hrgvvk lx iuv ddk qtpnihutrnwr wu mcgr wogmgmopk gc fcfvpc vcogsibbi
```
- IC: ~0.040–0.050 (lower than English, flatter distribution)
- No single letter dominates — polyalphabetic effect

### What to compare
Blue bars = observed. Grey bars = English expected.
A Caesar cipher: blue bars are shifted but shaped like grey bars.
A Vigenère cipher: blue bars are flatter, closer to uniform.

---

## 20. Entropy Visualizer

**Tool:** Sidebar → CTF Tools → Entropy Visualizer

### Test 1: Plain English text (low entropy ~4.0)
Mode: Plain text
```
The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump.
```
- Global entropy: ~4.0 bits/byte
- Classification: **Structured text**
- Heatmap: mostly green/blue blocks

### Test 2: XOR-encrypted blob (higher entropy ~5.2)
Mode: Hex
```
173a3c70253a22263263302b3f23216b23363b723325393f38653635372b7020272e65352228207030202c6b7913333a3b742232653b2c2a79273d3b23653f2a243c703020312037633e3021212039653336352a7e7407243279353721393a28273c79322730333f6f2f243f37722335363d2a3679292734207a
```
- Entropy: ~5.2 bits/byte
- Classification: **Compressed/encoded**
- Higher entropy than plaintext but not maxed — key repetition creates patterns

### Test 3: Single repeated byte (zero entropy)
Mode: Hex
```
41 41 41 41 41 41 41 41 41 41 41 41 41 41 41 41
```
- Entropy: **0.0** bits/byte (uniform — all byte value 0x41 = 'A')
- Byte frequency grid: only one column lit

### Test 4: Base64 encoded data
Mode: Base64
```
SGVsbG8gV29ybGQ=
```
- Decodes to `Hello World` before analysis
- Entropy similar to Test 1

### Entropy scale reference
| Range | Meaning |
|-------|---------|
| 0 – 1 | Constant / single value |
| 1 – 3.5 | Structured text / source code |
| 3.5 – 5.5 | Compressed or encoded (Base64, gzip) |
| 5.5 – 7.0 | Likely encrypted |
| 7.0 – 8.0 | Max entropy — truly random or strongly encrypted |

---

## 21. Cipher Wheel

**Tool:** Sidebar → CTF Tools → Cipher Wheel

### What to verify
1. Click the **ROT13** preset button → wheel snaps to shift 13
2. Type `Hello World` → output shows `Uryyb Jbeyq`
3. Type the output back into input → returns `Hello World` (self-inverse)
4. Drag the wheel left/right → shift number updates live
5. The **decrypt shift** note at the bottom: shift 3 → decrypt is 23

### Specific shifts to test
| Shift | Input | Output |
|-------|-------|--------|
| 3     | `ABC` | `DEF` |
| 13    | `ABC` | `NOP` |
| 25    | `ABC` | `ZAB` |
| 1     | `ZAB` | `ABC` |

---

## 22. Hash Identification

**Tool:** Sidebar → Hash Tools → Hash Identification

Paste each hash and verify the identified type:

| Hash | Expected type |
|------|---------------|
| `d8578edf8458ce06fbc5bb76a58c5ca4` | MD5 (High), NTLM (Medium) |
| `da39a3ee5e6b4b0d3255bfef95601890afd80709` | SHA-1 (High) |
| `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | SHA-256 (High) |
| `$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW` | bcrypt (Very High) |
| `$argon2id$v=19$m=65536,t=3,p=4$hash` | Argon2 (Very High) |
| `$6$rounds=5000$saltsalt$hashvalue` | SHA-512crypt (Very High) |
| `abc` | Unknown (length 3) |

---

## 23. Password Audit

**Tool:** Sidebar → Hash Tools → Password Audit

| Password | Expected strength | Entropy | Issues |
|----------|-------------------|---------|--------|
| `abc` | Weak | ~14 bits | Short, no uppercase, no digits, no special chars |
| `password123` | Moderate | ~57 bits | Contains "password" common pattern |
| `P@ssw0rd!` | Moderate | ~59 bits | Contains "password" weak pattern |
| `Tr0ub4dor&3` | Strong | ~77 bits | No issues detected |
| `correcthorsebatterystaple` | Moderate | ~59 bits | No special chars |
| `X9#mK!pL2@qR7$nW` | Very Strong | ~110 bits | No issues |

### What to verify
- Entropy bar fills proportionally
- Crack time escalates: Weak = "< 1 second", Very Strong = "Practically uncrackable"
- Issues list catches: common words, repeated chars, year patterns (`2023`), alpha-only

---

## 24. CTF Challenge Mode

**Tool:** Sidebar → CTF Tools → 🏁 Challenge Mode

Full walkthroughs for all 15 challenges:

| ID | Title | Tool to use | Answer |
|----|-------|-------------|--------|
| c01 | Shifted Secrets | Caesar Bruteforce | `flag{caesar_is_easy}` |
| c02 | Binary Breakfast | Base Converter | `flag{binary_fun}` |
| c03 | Hexed | Base Converter | `flag{hex_is_not_encryption}` |
| c04 | Morse Madness | Morse Code (Decode) | `flag{morse_is_old}` |
| c05 | 64 Encoded | Base64 (Decode) | `flag{base64_is_not_secure}` |
| c06 | Keyword Lock | Vigenère (Decrypt, key=LEMON) | `flag{vigenere_cipher_cracks}` |
| c07 | Repeating Pattern | XOR Bruteforce | `flag{xor_byte_cracked}` |
| c08 | Rail Rider | Transposition, Rail Fence 4, Decrypt | `flag{rail_fence_classic}` |
| c09 | Layer Cake | Pipeline: B64 → ROT13 → B64 | `flag{pipeline_master}` |
| c10 | Atbash Ancient | Atbash | `flag{atbash_mirrored}` |
| c11 | Repeating Key | XOR Cracker (repeating) | `flag{cookieisthekey}` |
| c12 | Substitute Teacher | Substitution Solver + auto-guess | `flag{substitution_yar_decrypted}` |
| c13 | Token Trouble | JWT Inspector | `flag{alg_none_is_dangerous}` |
| c14 | Kasiski's Ghost | Vigenère Crack | `flag{we_love_is_kasiski}` |
| c15 | Columnar Confusion | Transposition, Columnar, key=FALL | `flag{fall_columns}` |

### Scoring system
- Beginner (×1): 100 pts max
- Intermediate (×2): 200 pts max  
- Advanced (×3): 300 pts max
- Each hint: −25 pts
- Max total: 2,500 pts

---

## Quick Reference — What each tool is for in CTF

| Scenario | Tool to reach for |
|----------|-------------------|
| Hex string, unknown content | Base Converter → auto-detect |
| Multiple encoding layers | Pipeline |
| ROT/shift cipher | Caesar Bruteforce |
| "Key" provided, alphabetic | Vigenère Decrypt |
| No key, long ciphertext | Vigenère Crack |
| XOR hex, no key | XOR Bruteforce (single-byte) |
| XOR hex, long, no key | XOR Cracker (repeating-key) |
| Two ciphertexts, same key | XOR Cracker → Crib Drag |
| Letters rearranged, no substitution | Transposition (Rail/Columnar) |
| Letters consistently replaced | Substitution Solver |
| JWT in web challenge | JWT Inspector |
| Random-looking blob, unknown type | Entropy Visualizer |
| `$2a$`, `sha256:`, `md5:` string | Hash Identification |
