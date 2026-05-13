// ─── CTF Challenge Bank ───────────────────────────────────────────────────────
// Each challenge:
//   id, title, category, difficulty (1-3), description, ciphertext,
//   flag (answer to check against, lowercased), hints[], tool (which sidebar tool to use),
//   explanation (shown after solve)

export const CHALLENGES = [
  // ── Beginner ─────────────────────────────────────────────────────────────────
  {
    id: "c01",
    title: "Shifted Secrets",
    category: "Classical",
    difficulty: 1,
    description:
      "We intercepted this message from a Roman general. He was known to shift his messages by a consistent amount. Find the shift and decode it.",
    ciphertext: "Gur synt vf: synt{pnrfne_vf_rnfl}",
    flag: "flag{caesar_is_easy}",
    hints: [
      "Julius Caesar used a specific cipher named after him.",
      "A shift cipher named after a famous Roman — every letter moves the same number of positions.",
      "Try all 26 possible shifts. One will produce readable English.",
    ],
    tool: "bf_caesar",
    explanation:
      "ROT-13 (shift 13) was used. The Caesar Bruteforce tool ranks all 26 shifts — shift 13 scores highest and reveals the flag.",
  },
  {
    id: "c02",
    title: "Binary Breakfast",
    category: "Encoding",
    difficulty: 1,
    description: "Someone sent us this string of 0s and 1s. Decode it to find the flag.",
    ciphertext:
      "01100110 01101100 01100001 01100111 01111011 01100010 01101001 01101110 01100001 01110010 01111001 01111111 01100110 01110101 01101110 01111101",
    flag: "flag{binary_fun}",
    hints: [
      "Each group of 8 bits is one ASCII character.",
      "Convert each 8-bit group into its decimal value, then map to ASCII.",
      "8 bits = 1 byte. 01100110 = 102 = 'f'.",
    ],
    tool: "converter",
    explanation:
      "Each 8-bit group is one byte. The Base Converter auto-detects binary and converts it to ASCII in one click.",
  },
  {
    id: "c03",
    title: "Hexed",
    category: "Encoding",
    difficulty: 1,
    description: "This hex string hides a flag. Convert it.",
    ciphertext: "666c61677b6865785f69735f6e6f745f656e6372797074696f6e7d",
    flag: "flag{hex_is_not_encryption}",
    hints: [
      "Hexadecimal uses digits 0-9 and letters a-f.",
      "Every two hex characters represent one ASCII byte.",
      "Convert every two hex characters into one ASCII character.",
    ],
    tool: "converter",
    explanation:
      "Pure hex encoding — not encryption. The Base Converter auto-detects it and converts to ASCII: flag{hex_is_not_encryption}.",
  },
  {
    id: "c04",
    title: "Morse Madness",
    category: "Encoding",
    difficulty: 1,
    description: "Decode this Morse code transmission to reveal the flag.",
    ciphertext:
      "..-. .-.. .- --. / { -- --- .-. ... . / .. ... / --- .-.. -.. } ",
    flag: "flag{morse_is_old}",
    hints: [
      "Dots and dashes represent letters. / separates words.",
      "Each letter-group maps to a unique dot/dash pattern. Spaces separate letters, / separates words.",
      "Spaces separate letters; / separates words.",
    ],
    tool: "morse",
    explanation:
      "Standard Morse code. The Morse decoder handles the dot-dash sequences and word separators (/) automatically.",
  },
  {
    id: "c05",
    title: "64 Encoded",
    category: "Encoding",
    difficulty: 1,
    description: "This string looks like Base64. Decode it.",
    ciphertext: "ZmxhZ3tiYXNlNjRfaXNfbm90X3NlY3VyZX0=",
    flag: "flag{base64_is_not_secure}",
    hints: [
      "Base64 strings often end with = or ==.",
      "Base64 strings only use A-Z, a-z, 0-9, +, / and end with = padding.",
      "Look for the flag{...} pattern in the decoded output.",
    ],
    tool: "base64",
    explanation:
      "Base64 is encoding, not encryption — anyone can decode it. Never confuse encoding with security.",
  },

  // ── Intermediate ──────────────────────────────────────────────────────────────
  {
    id: "c06",
    title: "Keyword Lock",
    category: "Classical",
    difficulty: 2,
    description:
      "This message was encrypted with a Vigenère cipher. Frequency analysis suggests the key is a common English word. The Index of Coincidence is 0.063 — very close to English. The key length is likely 5.",
    ciphertext: "Rijvs{zmmqirdm_gcjliv_gvegopw}",
    flag: "flag{vigenere_cipher_cracks}",
    hints: [
      "The IC of 0.063 is close to English — the key is short.",
      "The key is a 5-letter word. Try 'LEMON' as a starting point for the decryption tool.",
    ],
    tool: "vigenere",
    explanation:
      "Encrypted with key LEMON. The IC near 0.065 signals English plaintext; key length 5 confirmed by column IC analysis. The Vigenère Crack tool can recover this automatically.",
  },
  {
    id: "c07",
    title: "Repeating Pattern",
    category: "XOR",
    difficulty: 2,
    description:
      "This hex string was XOR'd with a repeating single-byte key. Find the key and decrypt the message.",
    ciphertext: "1b1b0a161b0b00171c191b061b1c031b020a1b0f1a06060d1f000516001b1b0a1c060e000617",
    flag: "flag{xor_byte_cracked}",
    hints: [
      "Single-byte XOR means every byte is XOR'd with the same value (0–255).",
      "The key is a printable ASCII character. Look at the top scored result.",
    ],
    tool: "bf_xor",
    explanation:
      "XOR'd with 0x7f (127). The single-byte XOR bruteforcer scores all 256 candidates using chi-squared + common word frequency and surfaces the correct key at the top.",
  },
  {
    id: "c08",
    title: "Rail Rider",
    category: "Transposition",
    difficulty: 2,
    description:
      "Someone scrambled this message by writing it in a zigzag across rails. The grid has 4 rails. Decode it.",
    ciphertext: "fa_sfntoarli{ec}lge",
    flag: "flag{rail_fence_classic}",
    hints: [
      "Rail fence (zigzag) writes text diagonally across N rows, then reads each row.",
      "Try different rail counts. The bruteforce section shows all possibilities at once.",
    ],
    tool: "railfence",
    explanation:
      "Rail fence with 4 rails. The visualization shows exactly how characters are distributed across rails — a key learning tool for understanding why transposition ciphers aren't secure.",
  },
  {
    id: "c09",
    title: "Layer Cake",
    category: "Encoding",
    difficulty: 2,
    description:
      "This flag has been encoded three times. Peel back each layer to find the flag. (Hint: the layers are all encoding, no keys required.)",
    ciphertext: "Um90MTN7Um90MTN7ZmxhZ3twaXBlbGluZV9tYXN0ZXJ9fX0=",
    flag: "flag{pipeline_master}",
    hints: [
      "Start by decoding the outer layer. What does it end with (= or ==)?",
      "After Base64, you'll see another encoded string. Keep going.",
      "Peel one layer at a time. After each decode, examine what you get before applying the next step.",
    ],
    tool: "pipeline",
    explanation:
      "Base64 → ROT-13 → Base64. The Pipeline tool chains these in order: each step's output feeds the next. This is a classic CTF multi-layer encoding challenge.",
  },
  {
    id: "c10",
    title: "Atbash Ancient",
    category: "Classical",
    difficulty: 1,
    description:
      "An ancient cipher maps each letter to its mirror in the alphabet (A↔Z, B↔Y, etc.). Decode this.",
    ciphertext: "uozt{zgyzhs_nriiliwv}",
    flag: "flag{atbash_mirrored}",
    hints: [
      "Atbash substitutes A→Z, B→Y, C→X, and so on.",
      "It's its own inverse — applying it twice restores the original.",
      "A mirror substitution: A↔Z, B↔Y, C↔X… It is its own inverse.",
    ],
    tool: "atbash",
    explanation:
      "Atbash cipher, originally used for Hebrew. It's a monoalphabetic substitution where position from start equals position from end.",
  },

  // ── Advanced ──────────────────────────────────────────────────────────────────
  {
    id: "c11",
    title: "Repeating Key",
    category: "XOR",
    difficulty: 3,
    description:
      "This hex string was XOR'd with a repeating multi-byte key. Recover the key and the plaintext. The key is a short English word.",
    ciphertext:
      "0e0b213f1b4d5a4f415d5015161a560d1d0606132e15460a0b170b2c0b120e1408121d0a010006051b0d140a0f041715060913020f02081f2e1f1e090d090813000d0308141709001e00060f1c1a14170e1d090d0c0a1c161c0c170a00091e10071716",
    flag: "flag{cookieisthekey}",
    hints: [
      "The edit distance between blocks of the ciphertext reveals the key length.",
      "The edit distance method will suggest key lengths. Try the top candidates.",
      "Once you know the key length, each column of the ciphertext was XOR'd with a single byte.",
    ],
    tool: "xorcracker",
    explanation:
      "Repeating-key XOR with key 'cookie' (6 bytes). The Cryptopals normalized edit distance method ranks keylen=6 highly. Column-wise chi-squared then recovers each key byte independently.",
  },
  {
    id: "c12",
    title: "Substitute Teacher",
    category: "Classical",
    difficulty: 3,
    description:
      "A monoalphabetic substitution cipher was applied — every letter consistently maps to a different letter. Use frequency analysis to crack it.",
    ciphertext:
      "Wkh txlfn eurzq ira mxpsv ryhu wkh odcb grj. Iodj{vxevwlwxwlrq bdu ghfubswhg}",
    flag: "flag{substitution_yar_decrypted}",
    hints: [
      "Count letter frequencies. The most common letter in English is 'e'.",
      "Map high-frequency cipher letters to common English letters: e, t, a, o, i, n…",
      "Common words like 'the', 'and', 'is' help confirm mappings. Look for 3-letter words.",
    ],
    tool: "substitution",
    explanation:
      "Caesar shift-3 disguised as substitution. Auto-guess gets most mappings right via frequency analysis. The interactive solver lets you drag-correct any wrong letters by pattern-matching words.",
  },
  {
    id: "c13",
    title: "Token Trouble",
    category: "Web Crypto",
    difficulty: 2,
    description:
      "A web app uses this JWT for authentication. Inspect it carefully — the developer made a critical mistake in the algorithm choice.",
    ciphertext:
      "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJndWVzdCIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.",
    flag: "flag{alg_none_is_dangerous}",
    hints: [
      "JSON Web Tokens have 3 base64url parts separated by dots: header.payload.signature",
      "Look at the 'alg' field in the header. What is its value?",
      "If no signature algorithm is used, what prevents someone from changing the payload?",
    ],
    tool: "jwt",
    explanation:
      "The JWT header declares alg:none — no signature verification. This means the server accepts any payload without checking authenticity. The JWT Inspector flags this as critical.",
  },
  {
    id: "c14",
    title: "Kasiski's Ghost",
    category: "Classical",
    difficulty: 3,
    description:
      "This long ciphertext was encrypted with Vigenère. No key given. Use the auto-crack tool to recover both the key and the plaintext flag.",
    ciphertext:
      "Lxfopv ef rnhr lxfopv ef rnhr. Piq tnsel bfz lvvgiq tnsel bfz lvvgi. Bzoik qe bfsap bzoik qe bfsap. Tlhr ymfthzsy tlhr ymfthzsy tlhr. Irhkz{yb_asnq_ef_pbzxb}",
    flag: "flag{we_love_is_kasiski}",
    hints: [
      "Look for repeated sequences in the ciphertext. Their spacing reveals the key length.",
      "Look at the column IC values — the correct key length will have IC closest to 0.065.",
      "Once you know the key length, frequency analysis on each column recovers the key.",
    ],
    tool: "vigcrack",
    explanation:
      "The repeated phrases 'Lxfopv ef rnhr' create strong Kasiski signals. The tool identifies the key length from trigram distance factors, then recovers each key character via chi-squared. Key: KASIS.",
  },
  {
    id: "c15",
    title: "Columnar Confusion",
    category: "Transposition",
    difficulty: 2,
    description:
      "A message was transposed using columnar transposition with a 4-letter key. The key was a season of the year.",
    ciphertext: "fa__dnf{oclual}sgm",
    flag: "flag{fall_columns}",
    hints: [
      "Seasons: spring, summer, autumn, fall, winter.",
      "Write the plaintext into columns determined by the alphabetical order of the key letters.",
      "Try 'FALL' as the key.",
    ],
    tool: "railfence",
    explanation:
      "Columnar transposition with key FALL (4 letters). The column grid shows how letters are rearranged — sorted column order F(1)A(0)L(2)L(3) determines the read order.",
  },

  // ── New CTF Challenges: File/Image/File Analysis ─────────────────────────────

  {
    id: "c16",
    title: "Pixel Secrets",
    category: "Steganography",
    difficulty: 2,
    description:
      "An analyst intercepted this image. Intelligence suggests it contains a hidden message in the pixel data — invisible to the naked eye. Extract the message to find the flag.",
    ciphertext: "Load the challenge image in the LSB Steganography tool → Extract tab.",
    imageFull: "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",
    flag: "flag{lsb_pixels_hide_secrets}",
    hints: [
      "LSB steganography hides data in the least significant bit of pixel values.",
      "Load the image in the LSB Steganography tool. Use the Extract tab.",
      "Try the Red channel with 1-bit depth.",
    ],
    tool: "lsbstego",
    explanation:
      "The image has a secret message hidden in the LSB of each red pixel. The color changes by only 1/256 — imperceptible — but the bits spell out the flag when reassembled.",
  },
  {
    id: "c17",
    title: "Green Mystery",
    category: "Steganography",
    difficulty: 3,
    description:
      "Another suspicious image was found. The red channel looks clean. Check the other channels — the flag is hidden somewhere in the LSBs.",
    ciphertext: "Load the challenge image in LSB Steganography. Try all channels.",
    imageFull: "iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAIAAAABc2X6AABCVUlEQVR4nGTPh04Ci6Io0PsR0nvvvcP7CJUARiCAsUQglihEIZZYYoliBDIwMrTBQRRFURRFURRFURTfHz2z83ZyTu76g/U//6cXMPQB+r6Yrjeu7QU1faC670DVm1D2Qoo+SN6XlPWmpH1pSV9a3JsR9WaFvbCgD+b35Xi9h9xehNOLsHvzrL4jZm+B0Veg9x3Tek+ovUVKX5Hcd0rqOyP2lgh9JXzfOa7vAttXxvSW0X2XqL6rnt4Kqq+C7rvG9N5ge6u4viq+75bQd0fsrZH6auS+e0rfA7W3Tuut0/seGb1PzN4Gq6/B7nvm9L5we5u8via/91XQ9ybsbYn6WuK+d0nvh7S3Letry3s/FX1fyt6Oqq+j7vvW9P5o+7q6vq6+79fQ+3//5/+He2O6vri2799w33+He9OS3rS4LyPq++9w37/h3v8V7i2Se/873PtPuO+fcO9/h/v+Dff+R7j3n3Bfnd77yOj773Dfv+Hef8O975K+D2nfP+G+/w73/Wh7u7ref8J9f+F+wGAE9MaYzhjX9oMaI6juP1D1J5T9kMIIyY1JWX9K2p+WGNPi/ozImBX2wwIjzDfmeP2H3H6EY0TYxjzLeMTsLzCMBbrxmNZ/QjUWKcYi2XhKMp4R+0sEYwlvPMcZL7DGMsZYRvdfooxXPf0VVH8F3X+N6b/B9ldx/VV8/y2h/47YXyP118j995T+B2p/ndZfp/c/MvqfmP0NVn+D3f/M6X/h9jd5/U1+/6ug/03Y3xL1t8T975L+D2l/W9bflvd/Kvq/lP0dVX9H3f+t6f/R9nd1/V19/6+h/y9s/I+w8Z+w8UBlTCiN/4aNKanxn7Dxn7Dx37DxkGv8j7Dx37Dxv8PG/xU2/hM2VlDGCtp4jTHeYI1VnLGKN94SjHdEY41krJGN9xTjA9VYpxnrdOMjw/jENDZYxgbb+MwxvnCNTZ6xyTe+CoxvQmNLZGyJje8S44fU2JYZ23Ljp8L4pTR2VMaO2vitMf5ojV2dsas3/hqMf2ETYDABelNMZ4prTaDGBKpNBypTQmmCFCZIbkrKTCmpKS0xpcWmjMiUFZpggQnmm3I80yHXhHBMCNuUZ5mOmKYCw1Sgm45pphOqqUgxFcmmU5LpjGgqEUwlvOkcZ7rAmsoYUxltukSZrnpMFZSpgjZdY0w3WFMVZ6riTbcE0x3RVCOZamTTPcX0QDXVaaY63fTIMD0xTQ2WqcE2PXNML1xTk2dq8k2vAtOb0NQSmVpi07vE9CE1tWWmttz0qTB9KU0dlamjNn1rTD9aU1dn6upNvwbTX9gMGMyA3hzTmeNaM6gxg2rzgcqcUJohhRmSm5Myc0pqTkvMabE5IzJnhWZYYIb55hzPfMg1IxwzwjbnWeYjprnAMBfo5mOa+YRqLlLMRbL5lGQ+I5pLBHMJbz7HmS+w5jLGXEabL1Hmqx5zBWWuoM3XGPMN1lzFmat48y3BfEc010jmGtl8TzE/UM11mrlONz8yzE9Mc4NlbrDNzxzzC9fc5JmbfPOrwPwmNLdE5pbY/C4xf0jNbZm5LTd/KsxfSnNHZe6ozd8a84/W3NWZu3rzr8H8F7YABgugt8R0lrjWAmosoNpyoLIklBZIYYHklqTMkpJa0hJLWmzJiCxZoQUWWGC+JcezHHItCMeCsC15luWIaSkwLAW65ZhmOaFaihRLkWw5JVnOiJYSwVLCW85xlguspYyxlNGWS5TlqsdSQVkqaMs1xnKDtVRxlireckuw3BEtNZKlRrbcUywPVEudZqnTLY8MyxPT0mBZGmzLM8fywrU0eZYm3/IqsLwJLS2RpSW2vEssH1JLW2Zpyy2fCsuX0tJRWTpqy7fG8qO1dHWWrt7ya7D8hQcAwwCgH4jpBuLaAVAzAKoHDlQDCeUApBiA5ANJ2UBKOpCWDKTFAxnRQFY4AAsGYP5AjjdwyB1AOAMIeyDPGjhiDhQYAwX6wDFt4IQ6UKQMFMkDp6SBM+JAiTBQwg+c4wYusANlzEAZPXCJGrjqGaigBirogWvMwA12oIobqOIHbgkDd8SBGmmgRh64pww8UAfqtIE6feCRMfDEHGiwBhrsgWfOwAt3oMkbaPIHXgUDb8KBlmigJR54lwx8SAfasoG2fOBTMfClHOioBjrqgW/NwI92oKsb6OoHfg0Df+FBwDAI6AdjusG4dhDUDILqwQPVYEI5CCkGIflgUjaYkg6mJYNp8WBGNJgVDsKCQZg/mOMNHnIHEc4gwh7MswaPmIMFxmCBPnhMGzyhDhYpg0Xy4Clp8Iw4WCIMlvCD57jBC+xgGTNYRg9eogavegYrqMEKevAaM3iDHaziBqv4wVvC4B1xsEYarJEH7ymDD9TBOm2wTh98ZAw+MQcbrMEGe/CZM/jCHWzyBpv8wVfB4JtwsCUabIkH3yWDH9LBtmywLR/8VAx+KQc7qsGOevBbM/ijHezqBrv6wV/D4F/YChisgN4a01njWiuosYJq64HKmlBaIYUVkluTMmtKak1LrGmxNSOyZoVWWGCF+dYcz3rItSIcK8K25lnWI6a1wLAW6NZjmvWEai1SrEWy9ZRkPSNaSwRrCW89x1kvsNYyxlpGWy9R1qseawVlraCt1xjrDdZaxVmreOstwXpHtNZI1hrZek+xPlCtdZq1Trc+MqxPTGuDZW2wrc8c6wvX2uRZm3zrq8D6JrS2RNaW2PousX5IrW2ZtS23fiqsX0prR2XtqK3fGuuP1trVWbt666/B+he2AQYboLfFdLa41gZqbKDadqCyJZQ2SGGD5LakzJaS2tISW1psy4hsWaENFthgvi3Hsx1ybQjHhrBteZbtiGkrMGwFuu2YZjuh2ooUW5FsOyXZzoi2EsFWwtvOcbYLrK2MsZXRtkuU7arHVkHZKmjbNcZ2g7VVcbYq3nZLsN0RbTWSrUa23VNsD1RbnWar022PDNsT09Zg2Rps2zPH9sK1NXm2Jt/2KrC9CW0tka0ltr1LbB9SW1tma8ttnwrbl9LWUdk6atu3xvajtXV1tq7e9muw/YXtgMEO6O0xnT2utYMaO6i2H6jsCaUdUtghuT0ps6ek9rTEnhbbMyJ7VmiHBXaYb8/x7IdcO8KxI2x7nmU/YtoLDHuBbj+m2U+o9iLFXiTbT0n2M6K9RLCX8PZznP0Cay9j7GW0/RJlv+qxV1D2Ctp+jbHfYO1VnL2Kt98S7HdEe41kr5Ht9xT7A9Vep9nrdPsjw/7EtDdY9gbb/syxv3DtTZ69ybe/CuxvQntLZG+J7e8S+4fU3pbZ23L7p8L+pbR3VPaO2v6tsf9o7V2dvau3/xrsf2EHYHAAekdM54hrHaDGAaodBypHQumAFA5I7kjKHCmpIy1xpMWOjMiRFTpggQPmO3I8xyHXgXAcCNuRZzmOmI4Cw1GgO45pjhOqo0hxFMmOU5LjjOgoERwlvOMc57jAOsoYRxntuEQ5rnocFZSjgnZcYxw3WEcV56jiHbcExx3RUSM5amTHPcXxQHXUaY463fHIcDwxHQ2Wo8F2PHMcL1xHk+do8h2vAseb0NESOVpix7vE8SF1tGWOttzxqXB8KR0dlaOjdnxrHD9aR1fn6OodvwbHX9gJGJyA3hnTOeNaJ6hxgmrngcqZUDohhROSO5MyZ0rqTEucabEzI3JmhU5Y4IT5zhzPech1IhwnwnbmWc4jprPAcBbozmOa84TqLFKcRbLzlOQ8IzpLBGcJ7zzHOS+wzjLGWUY7L1HOqx5nBeWsoJ3XGOcN1lnFOat45y3BeUd01kjOGtl5T3E+UJ11mrNOdz4ynE9MZ4PlbLCdzxznC9fZ5DmbfOerwPkmdLZEzpbY+S5xfkidbZmzLXd+KpxfSmdH5eyond8a54/W2dU5u3rnr8H5F3YBBhegd8V0rrjWBWpcoNp1oHIllC5I4YLkrqTMlZK60hJXWuzKiFxZoQsWuGC+K8dzHXJdCMeFsF15luuI6SowXAW665jmOqG6ihRXkew6JbnOiK4SwVXCu85xrgusq4xxldGuS5TrqsdVQbkqaNc1xnWDdVVxriredUtw3RFdNZKrRnbdU1wPVFed5qrTXY8M1xPT1WC5GmzXM8f1wnU1ea4m3/UqcL0JXS2RqyV2vUtcH1JXW+Zqy12fCteX0tVRuTpq17fG9aN1dXWurt71a3D9hYcAwxCgH4rphuLaIVAzBKqHDlRDCeUQpBiC5ENJ2VBKOpSWDKXFQxnRUFY4BAuGYP5Qjjd0yB1COEMIeyjPGjpiDhUYQwX60DFt6IQ6VKQMFclDp6ShM+JQiTBUwg+d44YusENlzFAZPXSJGrrqGaqghirooWvM0A12qIobquKHbglDd8ShGmmoRh66pww9UIfqtKE6feiRMfTEHGqwhhrsoWfO0At3qMkbavKHXgVDb8KhlmioJR56lwx9SIfasqG2fOhTMfSlHOqohjrqoW/N0I92qKsb6uqHfg1Df+FhwDAM6IdjuuG4dhjUDIPq4QPVcEI5DCmGIflwUjackg6nJcNp8XBGNJwVDsOCYZg/nOMNH3KHEc4wwh7Os4aPmMMFxnCBPnxMGz6hDhcpw0Xy8Clp+Iw4XCIMl/DD57jhC+xwGTNcRg9fooaveoYrqOEKevgaM3yDHa7ihqv44VvC8B1xuEYarpGH7ynDD9ThOm24Th9+ZAw/MYcbrOEGe/iZM/zCHW7yhpv84VfB8JtwuCUabomH3yXDH9Lhtmy4LR/+VAx/KYc7quGOevhbM/yjHe7qhrv64V/D8F94BDCMAPqRmG4krh0BNSOgeuRANZJQjkCKEUg+kpSNpKQjaclIWjySEY1khSOwYATmj+R4I4fcEYQzgrBH8qyRI+ZIgTFSoI8c00ZOqCNFykiRPHJKGjkjjpQIIyX8yDlu5AI7UsaMlNEjl6iRq56RCmqkgh65xozcYEequJEqfuSWMHJHHKmRRmrkkXvKyAN1pE4bqdNHHhkjT8yRBmukwR555oy8cEeavJEmf+RVMPImHGmJRlrikXfJyId0pC0bactHPhUjX8qRjmqkox751oz8aEe6upGufuTXMPIXHgUMo4B+NKYbjWtHQc0oqB49UI0mlKOQYhSSjyZloynpaFoymhaPZkSjWeEoLBiF+aM53ughdxThjCLs0Txr9Ig5WmCMFuijx7TRE+pokTJaJI+ekkbPiKMlwmgJP3qOG73AjpYxo2X06CVq9KpntIIaraBHrzGjN9jRKm60ih+9JYzeEUdrpNEaefSeMvpAHa3TRuv00UfG6BNztMEabbBHnzmjL9zRJm+0yR99FYy+CUdbotGWePRdMvohHW3LRtvy0U/F6JdytKMa7ahHvzWjP9rRrm60qx/9NYz+hccAwxigH4vpxuLaMVAzBqrHDlRjCeUYpBiD5GNJ2VhKOpaWjKXFYxnRWFY4BgvGYP5Yjjd2yB1DOGMIeyzPGjtijhUYYwX62DFt7IQ6VqSMFcljp6SxM+JYiTBWwo+d48YusGNlzFgZPXaJGrvqGaugxirosWvM2A12rIobq+LHbgljd8SxGmmsRh67p4w9UMfqtLE6feyRMfbEHGuwxhrssWfO2At3rMkba/LHXgVjb8KxlmisJR57l4x9SMfasrG2fOxTMfalHOuoxjrqsW/N2I92rKsb6+rHfg1jf+FxwDAO6MdjuvG4dhzUjIPq8QPVeEI5DinGIfl4Ujaeko6nJeNp8XhGNJ4VjsOCcZg/nuONH3LHEc44wh7Ps8aPmOMFxniBPn5MGz+hjhcp40Xy+Clp/Iw4XiKMl/Dj57jxC+x4GTNeRo9fosavesYrqPEKevwaM36DHa/ixqv48VvC+B1xvEYar5HH7ynjD9TxOm28Th9/ZIw/MccbrPEGe/yZM/7CHW/yxpv88VfB+JtwvCUab4nH3yXjH9Lxtmy8LR//VIx/Kcc7qvGOevxbM/6jHe/qxrv68V/D+F/YDRjcgN4d07njWjeocYNq94HKnVC6IYUbkruTMndK6k5L3GmxOyNyZ4VuWOCG+e4cz33IdSMcN8J251nuI6a7wHAX6O5jmvuE6i5S3EWy+5TkPiO6SwR3Ce8+x7kvsO4yxl1Guy9R7qsedwXlrqDd1xj3DdZdxbmrePctwX1HdNdI7hrZfU9xP1DddZq7Tnc/MtxPTHeD5W6w3c8c9wvX3eS5m3z3q8D9JnS3RO6W2P0ucX9I3W2Zuy13fyrcX0p3R+XuqN3fGveP1t3Vubt696/B/Rf2AAYPoPfEdJ641gNqPKDac6DyJJQeSOGB5J6kzJOSetIST1rsyYg8WaEHFnhgvifH8xxyPQjHg7A9eZbniOkpMDwFuueY5jmheooUT5HsOSV5zoieEsFTwnvOcZ4LrKeM8ZTRnkuU56rHU0F5KmjPNcZzg/VUcZ4q3nNL8NwRPTWSp0b23FM8D1RPneap0z2PDM8T09NgeRpszzPH88L1NHmeJt/zKvC8CT0tkacl9rxLPB9ST1vmacs9nwrPl9LTUXk6as+3xvOj9XR1nq7e82vw/IW9gMEL6L0xnTeu9YIaL6j2Hqi8CaUXUnghuTcp86ak3rTEmxZ7MyJvVuiFBV6Y783xvIdcL8LxImxvnuU9YnoLDG+B7j2meU+o3iLFWyR7T0neM6K3RPCW8N5znPcC6y1jvGW09xLlverxVlDeCtp7jfHeYL1VnLeK994SvHdEb43krZG99xTvA9Vbp3nrdO8jw/vE9DZY3gbb+8zxvnC9TZ63yfe+CrxvQm9L5G2Jve8S74fU25Z523Lvp8L7pfR2VN6O2vut8f5ovV2dt6v3/hq8f+EJwDAB6Cdiuom4dgLUTIDqiQPVREI5ASkmIPlEUjaRkk6kJRNp8URGNJEVTsCCCZg/keNNHHInEM4Ewp7IsyaOmBMFxkSBPnFMmzihThQpE0XyxClp4ow4USJMlPAT57iJC+xEGTNRRk9coiaueiYqqIkKeuIaM3GDnajiJqr4iVvCxB1xokaaqJEn7ikTD9SJOm2iTp94ZEw8MScarIkGe+KZM/HCnWjyJpr8iVfBxJtwoiWaaIkn3iUTH9KJtmyiLZ/4VEx8KSc6qomOeuJbM/GjnejqJrr6iV/DxF94EjBMAvrJmG4yrp0ENZOgevJANZlQTkKKSUg+mZRNpqSTaclkWjyZEU1mhZOwYBLmT+Z4k4fcSYQzibAn86zJI+ZkgTFZoE8e0yZPqJNFymSRPHlKmjwjTpYIkyX85Dlu8gI7WcZMltGTl6jJq57JCmqygp68xkzeYCeruMkqfvKWMHlHnKyRJmvkyXvK5AN1sk6brNMnHxmTT8zJBmuywZ585ky+cCebvMkmf/JVMPkmnGyJJlviyXfJ5Id0si2bbMsnPxWTX8rJjmqyo5781kz+aCe7usmufvLXMPkXngIMU4B+KqabimunQM0UqJ46UE0llFOQYgqSTyVlUynpVFoylRZPZURTWeEULJiC+VM53tQhdwrhTCHsqTxr6og5VWBMFehTx7SpE+pUkTJVJE+dkqbOiFMlwlQJP3WOm7rATpUxU2X01CVq6qpnqoKaqqCnrjFTN9ipKm6qip+6JUzdEadqpKkaeeqeMvVAnarTpur0qUfG1BNzqsGaarCnnjlTL9ypJm+qyZ96FUy9CadaoqmWeOpdMvUhnWrLptryqU/F1JdyqqOa6qinvjVTP9qprm6qq5/6NUz9hacBwzSgn47ppuPaaVAzDaqnD1TTCeU0pJiG5NNJ2XRKOp2WTKfF0xnRdFY4DQumYf50jjd9yJ1GONMIezrPmj5iThcY0wX69DFt+oQ6XaRMF8nTp6TpM+J0iTBdwk+f46YvsNNlzHQZPX2Jmr7qma6gpivo6WvM9A12uoqbruKnbwnTd8TpGmm6Rp6+p0w/UKfrtOk6ffqRMf3EnG6wphvs6WfO9At3usmbbvKnXwXTb8Lplmi6JZ5+l0x/SKfbsum2fPpTMf2lnO6opjvq6W/N9I92uqub7uqnfw3Tf+EZwDAD6Gdiupm4dgbUzIDqmQPVTEI5AylmIPlMUjaTks6kJTNp8UxGNJMVzsCCGZg/k+PNHHJnEM4Mwp7Js2aOmDMFxkyBPnNMmzmhzhQpM0XyzClp5ow4UyLMlPAz57iZC+xMGTNTRs9comauemYqqJkKeuYaM3ODnaniZqr4mVvCzB1xpkaaqZFn7ikzD9SZOm2mTp95ZMw8MWcarJkGe+aZM/PCnWnyZpr8mVfBzJtwpiWaaYln3iUzH9KZtmymLZ/5VMx8KWc6qpmOeuZbM/OjnenqZrr6mV/DzF94FjDMAvrZmG42rp0FNbOgevZANZtQzkKKWUg+m5TNpqSzaclsWjybEc1mhbOwYBbmz+Z4s4fcWYQzi7Bn86zZI+ZsgTFboM8e02ZPqLNFymyRPHtKmj0jzpYIsyX87Dlu9gI7W8bMltGzl6jZq57ZCmq2gp69xszeYGeruNkqfvaWMHtHnK2RZmvk2XvK7AN1tk6brdNnHxmzT8zZBmu2wZ595sy+cGebvNkmf/ZVMPsmnG2JZlvi2XfJ7Id0ti2bbctnPxWzX8rZjmq2o5791sz+aGe7utmufvbXMPsX9gEGH6D3xXS+uNYHanyg2neg8iWUPkjhg+S+pMyXkvrSEl9a7MuIfFmhDxb4YL4vx/Mdcn0Ix4ewfXmW74jpKzB8BbrvmOY7ofqKFF+R7Dsl+c6IvhLBV8L7znG+C6yvjPGV0b5LlO+qx1dB+Spo3zXGd4P1VXG+Kt53S/DdEX01kq9G9t1TfA9UX53mq9N9jwzfE9PXYPkabN8zx/fC9TV5vibf9yrwvQl9LZGvJfa9S3wfUl9b5mvLfZ8K35fS11H5Omrft8b3o/V1db6u3vdr8P2F/YDBD+j9MZ0/rvWDGj+o9h+o/AmlH1L4Ibk/KfOnpP60xJ8W+zMif1bohwV+mO/P8fyHXD/C8SNsf57lP2L6Cwx/ge4/pvlPqP4ixV8k+09J/jOiv0Twl/D+c5z/AusvY/xltP8S5b/q8VdQ/graf43x32D9VZy/ivffEvx3RH+N5K+R/fcU/wPVX6f563T/I8P/xPQ3WP4G2//M8b9w/U2ev8n3vwr8b0J/S+Rvif3vEv+H1N+W+dty/6fC/6X0d1T+jtr/rfH/aP1dnb+r9/8a/H/hOcAwB+jnYrq5uHYO1MyB6rkD1VxCOQcp5iD5XFI2l5LOpSVzafFcRjSXFc7BgjmYP5fjzR1y5xDOHMKey7PmjphzBcZcgT53TJs7oc4VKXNF8twpae6MOFcizJXwc+e4uQvsXBkzV0bPXaLmrnrmKqi5CnruGjN3g52r4uaq+Llbwtwdca5GmquR5+4pcw/UuTptrk6fe2TMPTHnGqy5BnvumTP3wp1r8uaa/LlXwdybcK4lmmuJ594lcx/SubZsri2f+1TMfSnnOqq5jnruWzP3o53r6ua6+rlfw9xfeB4wzAP6+ZhuPq6dBzXzoHr+QDWfUM5DinlIPp+Uzaek82nJfFo8nxHNZ4XzsGAe5s/nePOH3HmEM4+w5/Os+SPmfIExX6DPH9PmT6jzRcp8kTx/Spo/I86XCPMl/Pw5bv4CO1/GzJfR85eo+aue+QpqvoKev8bM32Dnq7j5Kn7+ljB/R5yvkeZr5Pl7yvwDdb5Om6/T5x8Z80/M+QZrvsGef+bMv3Dnm7z5Jn/+VTD/JpxvieZb4vl3yfyHdL4tm2/L5z8V81/K+Y5qvqOe/9bM/2jnu7r5rn7+1zD/Fw4AhgCgD8R0gbg2AGoCoDpwoAoklAFIEYDkgaQskJIG0pJAWhzIiAJZYQAWBGB+IMcLHHIDCCeAsAN5VuCIGSgwAgV64JgWOKEGipRAkRw4JQXOiIESIVDCB85xgQtsoIwJlNGBS1TgqidQQQUq6MA1JnCDDVRxgSo+cEsI3BEDNVKgRg7cUwIP1ECdFqjTA4+MwBMz0GAFGuzAMyfwwg00eYEmP/AqCLwJAy1RoCUOvEsCH9JAWxZoywOfisCXMtBRBTrqwLcm8KMNdHWBrj7wawj8hYOAIQjogzFdMK4NgpogqA4eqIIJZRBSBCF5MCkLpqTBtCSYFgczomBWGIQFQZgfzPGCh9wgwgki7GCeFTxiBguMYIEePKYFT6jBIiVYJAdPScEzYrBECJbwwXNc8AIbLGOCZXTwEhW86glWUMEKOniNCd5gg1VcsIoP3hKCd8RgjRSskYP3lOADNVinBev04CMj+MQMNljBBjv4zAm+cINNXrDJD74Kgm/CYEsUbImD75LghzTYlgXb8uCnIvilDHZUwY46+K0J/miDXV2wqw/+GoJ/4QXAsADoF2K6hbh2AdQsgOqFA9VCQrkAKRYg+UJStpCSLqQlC2nxQka0kBUuwIIFmL+Q4y0cchcQzgLCXsizFo6YCwXGQoG+cExbOKEuFCkLRfLCKWnhjLhQIiyU8AvnuIUL7EIZs1BGL1yiFq56FiqohQp64RqzcINdqOIWqviFW8LCHXGhRlqokRfuKQsP1IU6baFOX3hkLDwxFxqshQZ74Zmz8MJdaPIWmvyFV8HCm3ChJVpoiRfeJQsf0oW2bKEtX/hULHwpFzqqhY564Vuz8KNd6OoWuvqFX8PCX3gRMCwC+sWYbjGuXQQ1i6B68UC1mFAuQopFSL6YlC2mpItpyWJavJgRLWaFi7BgEeYv5niLh9xFhLOIsBfzrMUj5mKBsVigLx7TFk+oi0XKYpG8eEpaPCMulgiLJfziOW7xArtYxiyW0YuXqMWrnsUKarGCXrzGLN5gF6u4xSp+8ZaweEdcrJEWa+TFe8riA3WxTlus0xcfGYtPzMUGa7HBXnzmLL5wF5u8xSZ/8VWw+CZcbIkWW+LFd8nih3SxLVtsyxc/FYtfysWOarGjXvzWLP5oF7u6xa5+8dew+BdeAgxLgH4ppluKa5dAzRKoXjpQLSWUS5BiCZIvJWVLKelSWrKUFi9lREtZ4RIsWIL5Szne0iF3CeEsIeylPGvpiLlUYCwV6EvHtKUT6lKRslQkL52Sls6ISyXCUgm/dI5busAulTFLZfTSJWrpqmepglqqoJeuMUs32KUqbqmKX7olLN0Rl2qkpRp56Z6y9EBdqtOW6vSlR8bSE3OpwVpqsJeeOUsv3KUmb6nJX3oVLL0Jl1qipZZ46V2y9CFdasuW2vKlT8XSl3Kpo1rqqJe+NUs/2qWubqmrX/o1LP2FlwHDMqBfjumW49plULMMqpcPVMsJ5TKkWIbky0nZckq6nJYsp8XLGdFyVrgMC5Zh/nKOt3zIXUY4ywh7Oc9aPmIuFxjLBfryMW35hLpcpCwXycunpOUz4nKJsFzCL5/jli+wy2XMchm9fIlavupZrqCWK+jla8zyDXa5iluu4pdvCct3xOUaablGXr6nLD9Ql+u05Tp9+ZGx/MRcbrCWG+zlZ87yC3e5yVtu8pdfBctvwuWWaLklXn6XLH9Il9uy5bZ8+VOx/KVc7qiWO+rlb83yj3a5q1vu6pd/Dct/4RXAsALoV2K6lbh2BdSsgOqVA9VKQrkCKVYg+UpStpKSrqQlK2nxSka0khWuwIIVmL+S460cclcQzgrCXsmzVo6YKwXGSoG+ckxbOaGuFCkrRfLKKWnljLhSIqyU8CvnuJUL7EoZs1JGr1yiVq56ViqolQp65RqzcoNdqeJWqviVW8LKHXGlRlqpkVfuKSsP1JU6baVOX3lkrDwxVxqslQZ75Zmz8sJdafJWmvyVV8HKm3ClJVppiVfeJSsf0pW2bKUtX/lUrHwpVzqqlY565Vuz8qNd6epWuvqVX8PKX3gVMKwC+tWYbjWuXQU1q6B69UC1mlCuQopVSL6alK2mpKtpyWpavJoRrWaFq7BgFeav5nirh9xVhLOKsFfzrNUj5mqBsVqgrx7TVk+oq0XKapG8ekpaPSOulgirJfzqOW71ArtaxqyW0auXqNWrntUKarWCXr3GrN5gV6u41Sp+9ZawekdcrZFWa+TVe8rqA3W1Tlut01cfGatPzNUGa7XBXn3mrL5wV5u81SZ/9VWw+iZcbYlWW+LVd8nqh3S1LVtty1c/FatfytWOarWjXv3WrP5oV7u61a5+9dew+hdeAwxrgH4tpluLa9dAzRqoXjtQrSWUa5BiDZKvJWVrKelaWrKWFq9lRGtZ4RosWIP5azne2iF3DeGsIey1PGvtiLlWYKwV6GvHtLUT6lqRslYkr52S1s6IayXCWgm/do5bu8CulTFrZfTaJWrtqmetglqroNeuMWs32LUqbq2KX7slrN0R12qktRp57Z6y9kBdq9PW6vS1R8baE3OtwVprsNeeOWsv3LUmb63JX3sVrL0J11qitZZ47V2y9iFda8vW2vK1T8Xal3Kto1rrqNe+NWs/2rWubq2rX/s1rP2F1wHDOqBfj+nW49p1ULMOqtcPVOsJ5TqkWIfk60nZekq6npasp8XrGdF6VrgOC9Zh/nqOt37IXUc46wh7Pc9aP2KuFxjrBfr6MW39hLpepKwXyeunpPUz4nqJsF7Cr5/j1i+w62XMehm9folav+pZr6DWK+j1a8z6DXa9iluv4tdvCet3xPUaab1GXr+nrD9Q1+u09Tp9/ZGx/sRcb7DWG+z1Z876C3e9yVtv8tdfBetvwvWWaL0lXn+XrH9I19uy9bZ8/VOx/qVc76jWO+r1b836j3a9q1vv6td/Det/4Q3AsAHoN2K6jbh2A9RsgOqNA9VGQrkBKTYg+UZStpGSbqQlG2nxRka0kRVuwIINmL+R420ccjcQzgbC3sizNo6YGwXGRoG+cUzbOKFuFCkbRfLGKWnjjLhRImyU8BvnuI0L7EYZs1FGb1yiNq56NiqojQp64xqzcYPdqOI2qviNW8LGHXGjRtqokTfuKRsP1I06baNO33hkbDwxNxqsjQZ745mz8cLdaPI2mvyNV8HGm3CjJdpoiTfeJRsf0o22bKMt3/hUbHwpNzqqjY5641uz8aPd6Oo2uvqNX8PGX3gTMGwC+s2YbjOu3QQ1m6B680C1mVBuQopNSL6ZlG2mpJtpyWZavJkRbWaFm7BgE+Zv5nibh9xNhLOJsDfzrM0j5maBsVmgbx7TNk+om0XKZpG8eUraPCNulgibJfzmOW7zArtZxmyW0ZuXqM2rns0KarOC3rzGbN5gN6u4zSp+85aweUfcrJE2a+TNe8rmA3WzTtus0zcfGZtPzM0Ga7PB3nzmbL5wN5u8zSZ/81Ww+SbcbIk2W+LNd8nmh3SzLdtsyzc/FZtfys2OarOj3vzWbP5oN7u6za5+89ew+RfeAgxbgH4rptuKa7dAzRao3jpQbSWUW5BiC5JvJWVbKelWWrKVFm9lRFtZ4RYs2IL5Wzne1iF3C+FsIeytPGvriLlVYGwV6FvHtK0T6laRslUkb52Sts6IWyXCVgm/dY7busBulTFbZfTWJWrrqmergtqqoLeuMVs32K0qbquK37olbN0Rt2qkrRp5656y9UDdqtO26vStR8bWE3OrwdpqsLeeOVsv3K0mb6vJ33oVbL0Jt1qirZZ4612y9SHdasu22vKtT8XWl3Kro9rqqLe+NVs/2q2ubqur3/o1bP2FtwHDNqDfjum249ptULMNqrcPVNsJ5Tak2Ibk20nZdkq6nZZsp8XbGdF2VrgNC7Zh/naOt33I3UY42wh7O8/aPmJuFxjbBfr2MW37hLpdpGwXydunpO0z4naJsF3Cb5/jti+w22XMdhm9fYnavurZrqC2K+jta8z2DXa7ituu4rdvCdt3xO0aabtG3r6nbD9Qt+u07Tp9+5Gx/cTcbrC2G+ztZ872C3e7ydtu8rdfBdtvwu2WaLsl3n6XbH9It9uy7bZ8+1Ox/aXc7qi2O+rtb832j3a7q9vu6rd/Ddt/4R3AsAPod2K6nbh2B9TsgOqdA9VOQrkDKXYg+U5StpOS7qQlO2nxTka0kxXuwIIdmL+T4+0ccncQzg7C3smzdo6YOwXGToG+c0zbOaHuFCk7RfLOKWnnjLhTIuyU8DvnuJ0L7E4Zs1NG71yidq56diqonQp65xqzc4PdqeJ2qvidW8LOHXGnRtqpkXfuKTsP1J06badO33lk7DwxdxqsnQZ755mz88LdafJ2mvydV8HOm3CnJdppiXfeJTsf0p22bKct3/lU7HwpdzqqnY5651uz86Pd6ep2uvqdX8POX3gXMOwC+t2Ybjeu3QU1u6B690C1m1DuQopdSL6blO2mpLtpyW5avJsR7WaFu7BgF+bv5ni7h9xdhLOLsHfzrN0j5m6BsVug7x7Tdk+ou0XKbpG8e0raPSPulgi7JfzuOW73ArtbxuyW0buXqN2rnt0KareC3r3G7N5gd6u43Sp+95awe0fcrZF2a+Tde8ruA3W3Ttut03cfGbtPzN0Ga7fB3n3m7L5wd5u83SZ/91Ww+ybcbYl2W+Ldd8nuh3S3Ldtty3c/Fbtfyt2Oarej3v3W7P5od7u63a5+99ew+xcOAYYQoA/FdKG4NgRqQqA6dKAKJZQhSBGC5KGkLJSShtKSUFocyohCWWEIFoRgfijHCx1yQwgnhLBDeVboiBkqMEIFeuiYFjqhhoqUUJEcOiWFzoihEiFUwofOcaELbKiMCZXRoUtU6KonVEGFKujQNSZ0gw1VcaEqPnRLCN0RQzVSqEYO3VNCD9RQnRaq00OPjNATM9RghRrs0DMn9MINNXmhJj/0Kgi9CUMtUaglDr1LQh/SUFsWastDn4rQlzLUUYU66tC3JvSjDXV1oa4+9GsI/YX3AMMeoN+L6fbi2j1Qsweq9w5UewnlHqTYg+R7SdleSrqXluylxXsZ0V5WuAcL9mD+Xo63d8jdQzh7CHsvz9o7Yu4VGHsF+t4xbe+Eulek7BXJe6ekvTPiXomwV8LvneP2LrB7ZcxeGb13idq76tmroPYq6L1rzN4Ndq+K26vi924Je3fEvRppr0beu6fsPVD36rS9On3vkbH3xNxrsPYa7L1nzt4Ld6/J22vy914Fe2/CvZZoryXee5fsfUj32rK9tnzvU7H3pdzrqPY66r1vzd6Pdq+r2+vq934Ne3/hfcCwD+j3Y7r9uHYf1OyD6v0D1X5CuQ8p9iH5flK2n5LupyX7afF+RrSfFe7Dgn2Yv5/j7R9y9xHOPsLez7P2j5j7BcZ+gb5/TNs/oe4XKftF8v4paf+MuF8i7Jfw++e4/QvsfhmzX0bvX6L2r3r2K6j9Cnr/GrN/g92v4var+P1bwv4dcb9G2q+R9+8p+w/U/Tptv07ff2TsPzH3G6z9Bnv/mbP/wt1v8vab/P1Xwf6bcL8l2m+J998l+x/S/bZsvy3f/1Tsfyn3O6r9jnr/W7P/o93v6va7+v1fw/5fOAwYwoA+HNOF49owqAmD6vCBKpxQhiFFGJKHk7JwShpOS8JpcTgjCmeFYVgQhvnhHC98yA0jnDDCDudZ4SNmuMAIF+jhY1r4hBouUsJFcviUFD4jhkuEcAkfPseFL7DhMiZcRocvUeGrnnAFFa6gw9eY8A02XMWFq/jwLSF8RwzXSOEaOXxPCT9Qw3VauE4PPzLCT8xwgxVusMPPnPALN9zkhZv88Ksg/CYMt0Thljj8Lgl/SMNtWbgtD38qwl/KcEcV7qjD35rwjzbc1YW7+vCvIfwXjgCGCKCPxHSRuDYCaiKgOnKgiiSUEUgRgeSRpCySkkbSkkhaHMmIIllhBBZEYH4kx4scciMIJ4KwI3lW5IgZKTAiBXrkmBY5oUaKlEiRHDklRc6IkRIhUsJHznGRC2ykjImU0ZFLVOSqJ1JBRSroyDUmcoONVHGRKj5yS4jcESM1UqRGjtxTIg/USJ0WqdMjj4zIEzPSYEUa7MgzJ/LCjTR5kSY/8iqIvAkjLVGkJY68SyIf0khbFmnLI5+KyJcy0lFFOurItybyo410dZGuPvJriPyFo4AhCuijMV00ro2Cmiiojh6oogllFFJEIXk0KYumpNG0JJoWRzOiaFYYhQVRmB/N8aKH3CjCiSLsaJ4VPWJGC4xogR49pkVPqNEiJVokR09J0TNitESIlvDRc1z0AhstY6JldPQSFb3qiVZQ0Qo6eo2J3mCjVVy0io/eEqJ3xGiNFK2Ro/eU6AM1WqdF6/ToIyP6xIw2WNEGO/rMib5wo01etMmPvgqib8JoSxRtiaPvkuiHNNqWRdvy6Kci+qWMdlTRjjr6rYn+aKNdXbSrj/4aon9hADAAgB6I6YC4FgA1AKgGDlRAQglACgCSA0kZkJICaQmQFgMZEZAVArAAgPlAjgcccgGEAyBsIM8CjphAgQEU6MAxDTihAkUKUCQDpyTgjAiUCEAJD5zjgAssUMYAZTRwiQKueoAKCqiggWsMcIMFqjigigduCcAdEaiRgBoZuKcAD1SgTgPqdOCRATwxgQYLaLCBZw7wwgWaPKDJB14FwJsQaImAlhh4lwAfUqAtA9py4FMBfCmBjgroqIFvDfCjBbo6oKsHfg3AXzgGGGKAPhbTxeLaGKiJgerYgSqWUMYgRQySx5KyWEoaS0tiaXEsI4plhTFYEIP5sRwvdsiNIZwYwo7lWbEjZqzAiBXosWNa7IQaK1JiRXLslBQ7I8ZKhFgJHzvHxS6wsTImVkbHLlGxq55YBRWroGPXmNgNNlbFxar42C0hdkeM1UixGjl2T4k9UGN1WqxOjz0yYk/MWIMVa7Bjz5zYCzfW5MWa/NirIPYmjLVEsZY49i6JfUhjbVmsLY99KmJfylhHFeuoY9+a2I821tXFuvrYryH2F44Dhjigj8d08bg2DmrioDp+oIonlHFIEYfk8aQsnpLG05J4WhzPiOJZYRwWxGF+PMeLH3LjCCeOsON5VvyIGS8w4gV6/JgWP6HGi5R4kRw/JcXPiPESIV7Cx89x8QtsvIyJl9HxS1T8qideQcUr6Pg1Jn6DjVdx8So+fkuI3xHjNVK8Ro7fU+IP1HidFq/T44+M+BMz3mDFG+z4Myf+wo03efEmP/4qiL8J4y1RvCWOv0viH9J4WxZvy+OfiviXMt5RxTvq+Lcm/qONd3Xxrj7+a4j/hUHAAAJ6MKYD41oQ1ICgGjxQgQklCClASA4mZWBKCqYlYFoMZkRgVgjCAhDmgzkeeMgFEQ6IsME8CzxiggUGWKCDxzTwhAoWKWCRDJ6SwDMiWCKAJTx4jgMvsGAZA5bR4CUKvOoBKyiwggavMeANFqziwCoevCWAd0SwRgJrZPCeAj5QwToNrNPBRwb4xAQbLLDBBp854AsXbPLAJh98FYBvQrAlAlti8F0CfkjBtgxsy8FPBfilBDsqsKMGvzXgjxbs6sCuHvw1gH/hBGBIAPpETJeIaxOgJgGqEweqREKZgBQJSJ5IyhIpaSItSaTFiYwokRUmYEEC5idyvMQhN4FwEgg7kWcljpiJAiNRoCeOaYkTaqJISRTJiVNS4oyYKBESJXziHJe4wCbKmEQZnbhEJa56EhVUooJOXGMSN9hEFZeo4hO3hMQdMVEjJWrkxD0l8UBN1GmJOj3xyEg8MRMNVqLBTjxzEi/cRJOXaPITr4LEmzDREiVa4sS7JPEhTbRlibY88alIfCkTHVWio058axI/2kRXl+jqE7+GxF8YAgwQoIdiOiiuhUANBKqhAxWUUEKQAoLkUFIGpaRQWgKlxVBGBGWFECyAYD6U40GHXAjhQAgbyrOgIyZUYEAFOnRMg06oUJECFcnQKQk6I0IlAlTCQ+c46AILlTFQGQ1doqCrHqiCgipo6BoD3WChKg6q4qFbAnRHhGokqEaG7inQAxWq06A6HXpkQE9MqMGCGmzomQO9cKEmD2ryoVcB9CaEWiKoJYbeJdCHFGrLoLYc+lRAX0qoo4I6auhbA/1ooa4O6uqhXwP0F04ChiSgT8Z0ybg2CWqSoDp5oEomlElIkYTkyaQsmZIm05JkWpzMiJJZYRIWJGF+MsdLHnKTCCeJsJN5VvKImSwwkgV68piWPKEmi5RkkZw8JSXPiMkSIVnCJ89xyQtssoxJltHJS1TyqidZQSUr6OQ1JnmDTVZxySo+eUtI3hGTNVKyRk7eU5IP1GSdlqzTk4+M5BMz2WAlG+zkMyf5wk02eckmP/kqSL4Jky1RsiVOvkuSH9JkW5Zsy5OfiuSXMtlRJTvq5Lcm+aNNdnXJrj75a0j+hVOAIQXoUzFdKq5NgZoUqE4dqFIJZQpSpCB5KilLpaSptCSVFqcyolRWmIIFKZifyvFSh9wUwkkh7FSelTpipgqMVIGeOqalTqipIiVVJKdOSakzYqpESJXwqXNc6gKbKmNSZXTqEpW66klVUKkKOnWNSd1gU1VcqopP3RJSd8RUjZSqkVP3lNQDNVWnper01CMj9cRMNVipBjv1zEm9cFNNXqrJT70KUm/CVEuUaolT75LUhzTVlqXa8tSnIvWlTHVUqY469a1J/WhTXV2qq0/9GlJ/4QxgyAD6TEyXiWszoCYDqjMHqkxCmYEUGUieScoyKWkmLcmkxZmMKJMVZmBBBuZncrzMITeDcDIIO5NnZY6YmQIjU6BnjmmZE2qmSMkUyZlTUuaMmCkRMiV85hyXucBmyphMGZ25RGWuejIVVKaCzlxjMjfYTBWXqeIzt4TMHTFTI2Vq5Mw9JfNAzdRpmTo988jIPDEzDVamwc48czIv3EyTl2nyM6+CzJsw0xJlWuLMuyTzIc20ZZm2PPOpyHwpMx1VpqPOfGsyP9pMV5fp6jO/hsxfOAsYsoA+G9Nl49osqMmC6uyBKptQZiFFFpJnk7JsSppNS7JpcTYjymaFWViQhfnZHC97yM0inCzCzuZZ2SNmtsDIFujZY1r2hJotUrJFcvaUlD0jZkuEbAmfPcdlL7DZMiZbRmcvUdmrnmwFla2gs9eY7A02W8Vlq/jsLSF7R8zWSNkaOXtPyT5Qs3Vatk7PPjKyT8xsg5VtsLPPnOwLN9vkZZv87Ksg+ybMtkTZljj7Lsl+SLNtWbYtz34qsl/KbEeV7aiz35rsjzbb1WW7+uyvIfsXhgEDDOjhmA6Oa2FQA4Nq+EAFJ5QwpIAhOZyUwSkpnJbAaTGcEcFZIQwLYJgP53jwIRdGODDChvMs+IgJFxhwgQ4f0+ATKlykwEUyfEqCz4hwiQCX8PA5Dr7AwmUMXEbDlyj4qgeuoOAKGr7GwDdYuIqDq3j4lgDfEeEaCa6R4XsK/ECF6zS4TocfGfATE26w4AYbfubAL1y4yYObfPhVAL8J4ZYIbonhdwn8IYXbMrgthz8V8JcS7qjgjhr+1sA/Wrirg7t6+NcA/4VzgCEH6HMxXS6uzYGaHKjOHahyCWUOUuQgeS4py6WkubQklxbnMqJcVpiDBTmYn8vxcofcHMLJIexcnpU7YuYKjFyBnjum5U6ouSIlVyTnTkm5M2KuRMiV8LlzXO4CmytjcmV07hKVu+rJVVC5Cjp3jcndYHNVXK6Kz90ScnfEXI2Uq5Fz95TcAzVXp+Xq9NwjI/fEzDVYuQY798zJvXBzTV6uyc+9CnJvwlxLlGuJc++S3Ic015bl2vLcpyL3pcx1VLmOOvetyf1oc11drqvP/Rpyf2EEMCCAHonpkLgWATUIqEYOVEhCiUAKBJIjSRmSkiJpCZIWIxkRkhUisACB+UiOhxxyEYSDIGwkz0KOmEiBgRToyDENOaEiRQpSJCOnJOSMiJQISAmPnOOQCyxSxiBlNHKJQq56kAoKqaCRawxyg0WqOKSKR24JyB0RqZGQGhm5pyAPVKROQ+p05JGBPDGRBgtpsJFnDvLCRZo8pMlHXgXImxBpiZCWGHmXIB9SpC1D2nLkU4F8KZGOCumokW8N8qNFujqkq0d+DchfOA8Y8oA+H9Pl49o8qMmD6vyBKp9Q5iFFHpLnk7J8SppPS/JpcT4jymeFeViQh/n5HC9/yM0jnDzCzudZ+SNmvsDIF+j5Y1r+hJovUvJFcv6UlD8j5kuEfAmfP8flL7D5MiZfRucvUfmrnnwFla+g89eY/A02X8Xlq/j8/2t4ThSRDaIAgL6E9n3f973eMyIi+uaaO9PMHRHRQkRE/jf6nTc49x7rwWvNfNbMbz0GrKegNQ9Z87C1iFjLqLWKWau49ZywXpLWOmWt09ZrxnrLWpuctclb7wXro2htS9a2bH1WrK+qtatZu7r13bB+mta+Ze3b1m/H+guzbod12+ywxY6arNdgvTo7rrGTKutXWL/MTkvsrMgGBTbIs/Mcu8iyYYYN0+wyxa6SbJRgozizYoxFGUQYhNl1iPEgwwBDPxM+Jr1s7GFjN1Mupp2MHIzszNjYzQGb2NjEzm4d7M7Jpi42dbN7D3vwspmPzfzsMcCegmweYvMwW0TYMspWMbaKs+cEe0mydYqt0+w1w96ybJNjmzx7L7CPItuW2LbMPivsq8p2Nbars+8G+2myfYvt2+y3w/7C0O1Atw2HLThqQq8BvToc1+CkCv0K9MtwWoKzIgwKMMjDeQ4usjDMwDANlym4SsIoAaM4WDFgUYAIQBiuQ8CDgAFAPwgfSC+MPTB2g3KBdgI5gOxgbHBzABMbTOxw64A7J0xdMHXDvQcevDDzwcwPjwF4CsI8BPMwLCKwjMIqBqs4PCfgJQnrFKzT8JqBtyxscrDJw3sBPoqwLcG2DJ8V+KrCrga7Onw34KcJ+xbs2/Dbgb8w73Z4t80PW/yoyXsN3qvz4xo/qfJ+hffL/LTEz4p8UOCDPD/P8YssH2b4MM0vU/wqyUcJPopzK8ZZlEOEQ5hfhzgPcgxw9HPh49LLxx4+dnPl4trJycHJzo2N3xzwiY1P7PzWwe+cfOriUze/9/AHL5/5+MzPHwP8KcjnIT4P80WEL6N8FeOrOH9O8JckX6f4Os1fM/wtyzc5vsnz9wL/KPJtiW/L/LPCv6p8V+O7Ov9u8J8m37f4vs1/O/wvjN0Odtt42MKjJvYa2KvjcQ1PqtivYL+MpyU8K+KggIM8nufwIovDDA7TeJnCqySOEjiKoxVDFkWIIITxOoQ8iBhA9KPwofTi2INjNyoXaieSA8mOxoY3Bzix4cSOtw68c+LUhVM33nvwwYszH878+BjApyDOQzgP4yKCyyiuYriK43MCX5K4TuE6ja8ZfMviJoebPL4X8KOI2xJuy/hZwa8q7mq4q+N3A3+auG/hvo2/HfwLi25HdNvisCWOmqLXEL26OK6Jk6roV0S/LE5L4qwoBgUxyIvznLjIimFGDNPiMiWukmKUEKO4sGKCRQVEBITFdUjwoMCAQL8QPiG9YuwRY7dQLqGdghyC7MLYxM2BmNjExC5uHeLOKaYuMXWLe4948IqZT8z84jEgnoJiHhLzsFhExDIqVjGxiovnhHhJinVKrNPiNSPesmKTE5u8eC+Ij6LYlsS2LD4r4qsqdjWxq4vvhvhpin1L7NvityP+wrLbkd22PGzJo6bsNWSvLo9r8qQq+xXZL8vTkjwrykFBDvLyPCcvsnKYkcO0vEzJq6QcJeQoLq2YZFEJEQlheR2SPCgxINEvhU9Krxx75NgtlUtqpySHJLs0NnlzICc2ObHLW4e8c8qpS07d8t4jH7xy5pMzv3wMyKegnIfkPCwXEbmMylVMruLyOSFfknKdkuu0fM3It6zc5OQmL98L8qMotyW5LcvPivyqyl1N7uryuyF/mnLfkvu2/O3Iv7DqdlS3rQ5b6qipeg3Vq6vjmjqpqn5F9cvqtKTOimpQUIO8Os+pi6waZtQwrS5T6iqpRgk1iisrplhUQURBWF2HFA8qDCj0K+FT0qvGHjV2K+VS2qnIociujE3dHKiJTU3s6tah7pxq6lJTt7r3qAevmvnUzK8eA+opqOYhNQ+rRUQto2oVU6u4ek6ol6Rap9Q6rV4z6i2rNjm1yav3gvooqm1Jbcvqs6K+qmpXU7u6+m6on6bat9S+rX476i+sux3dbevDlj5q6l5D9+r6uKZPqrpf0f2yPi3ps6IeFPQgr89z+iKrhxk9TOvLlL5K6lFCj+LaimkW1RDRENbXIc2DGgMa/Vr4tPTqsUeP3Vq5tHZqcmiya2PTNwd6YtMTu7516Dunnrr01K3vPfrBq2c+PfPrx4B+Cup5SM/DehHRy6hexfQqrp8T+iWp1ym9TuvXjH7L6k1Ob/L6vaA/inpb0tuy/qzor6re1fSurr8b+qep9y29b+vfjv4LU7dD3TYdtuioSb0G9ep0XKOTKvUr1C/TaYnOijQo0CBP5zm6yNIwQ8M0XaboKkmjBI3iZMWIRQkiBGG6DhEPEgYI/SR8JL009tDYTcpF2knkILKTsdHNAU1sNLHTrYPunDR10dRN9x568NLMRzM/PQboKUjzEM3DtIjQMkqrGK3i9JyglyStU7RO02uG3rK0ydEmT+8F+ijStkTbMn1W6KtKuxrt6vTdoJ8m7Vu0b9Nvh/7Cptsx3bY5bJmjpuk1TK9ujmvmpGr6FdMvm9OSOSuaQcEM8uY8Zy6yZpgxw7S5TJmrpBklzChurJhhUQMRA2FzHTI8aDBg0G+Ez0ivGXvM2G2Uy2inIYchuzE2c3NgJjYzsZtbh7lzmqnLTN3m3mMevGbmMzO/eQyYp6CZh8w8bBYRs4yaVcys4uY5YV6SZp0y67R5zZi3rNnkzCZv3gvmo2i2JbMtm8+K+aqaXc3s6ua7YX6aZt8y+7b57Zh//wE9zQRh2W4rngAAAABJRU5ErkJggg==",
    flag: "flag{green_channel_stego}",
    hints: [
      "Not every stego image uses the red channel.",
      "Try the Green channel in the LSB Steganography extract tool.",
      "The flag is hidden in the LSB of the green channel.",
    ],
    tool: "lsbstego",
    explanation:
      "The flag was hidden in the green channel LSBs. Statistical analysis (Analyze tab) shows a suspicious LSB ratio close to 0.5 in the green channel — a classic stego tell.",
  },
  {
    id: "c18",
    title: "RC4 Relics",
    category: "Stream Cipher",
    difficulty: 2,
    description:
      "An old system used RC4 for encryption. The key was found in a config file. Decrypt this hex-encoded ciphertext.",
    ciphertext: "8568eb4b5b541eae6ee361d1712e0e9ffefdbd",
    flag: "flag{rc4_is_broken}",
    hints: [
      "The key is: ctfkey",
      "Paste the hex in the input and enter the key.",
    ],
    tool: "rc4",
    explanation:
      "RC4 with key 'ctfkey'. The hex ciphertext XOR'd with the RC4 keystream reveals the plaintext. RC4 is deprecated — biased output and key-reuse vulnerabilities make it unsuitable for modern use.",
  },
  {
    id: "c19",
    title: "Affine Intercept",
    category: "Classical",
    difficulty: 2,
    description:
      "A spy used an affine cipher: C = (a*P + b) mod 26. We know a=7 and b=11. Decrypt the message to find the flag.",
    ciphertext: "uklb{luupyn_oin_lyzpnyo}",
    flag: "flag{affine_the_ancient}",
    hints: [
      "Set a=7, b=11 and mode=Decrypt.",
      "The affine cipher maps each letter using modular arithmetic.",
    ],
    tool: "classicalextra",
    explanation:
      "Affine cipher with a=7, b=11. Decryption requires modular inverse of a (mod 26) = 15. Each letter maps as P = 15*(C - 11) mod 26.",
  },
  {
    id: "c20",
    title: "Bacon's Secret",
    category: "Classical",
    difficulty: 2,
    description:
      "Francis Bacon invented a binary-like cipher encoding letters as groups of A/B. Decode this message to find the flag hidden inside.",
    ciphertext: "AABAB ABABB AAAAA AABBA AAAAB AAAAA AAABA ABBBA ABBAB AAAAB ABAAA BAABB BAABA",
    flag: "flag{bacon_bits}",
    hints: [
      "Bacon cipher uses A=0 and B=1. Each 5-character group encodes one letter.",
      "Use More Ciphers → Bacon tab → Decode mode.",
      "AAAAA=A, AAAAB=B, AAABA=C, AAABB=D...",
    ],
    tool: "classicalextra",
    explanation:
      "Bacon cipher (1605) encodes each letter as 5 binary digits using A/B. AABBA=G, AABBB=H, etc. Originally used to hide messages within normal text by varying font style.",
  },
  {
    id: "c21",
    title: "Playfair Protocol",
    category: "Classical",
    difficulty: 3,
    description:
      "A WWI-era cipher was used to encrypt this message. The key is a word found in nature. Decrypt it.",
    ciphertext: "OOPKKQKBAFOXKQ",
    flag: "flag{playfair_wins}",
    hints: [
      "Playfair cipher uses a 5x5 key grid. Use More Ciphers → Playfair tab.",
      "Try the key: NATURE",
      "Playfair encrypts pairs of letters (digraphs) using the key square.",
    ],
    tool: "classicalextra",
    explanation:
      "Playfair with key NATURE. The cipher encrypts letter pairs using a 5x5 substitution grid. No single-letter frequency analysis works — you need the key square to decrypt.",
  },
  {
    id: "c22",
    title: "Hash Heist",
    category: "Hash",
    difficulty: 2,
    description:
      "A password hash was stolen from a vulnerable web app. Crack it to recover the original password — which is also the flag.",
    ciphertext: "5f4dcc3b5aa765d61d8327deb882cf99",
    flag: "flag{password}",
    hints: [
      "This is an MD5 hash (32 hex chars).",
      "The password is one of the most common passwords ever.",
      "The word is literally 'password'.",
    ],
    tool: "hashcracker",
    explanation:
      "MD5('password') = 5f4dcc3b5aa765d61d8327deb882cf99. MD5 is cryptographically broken — rainbow tables crack it in milliseconds. Never use MD5 for passwords; use bcrypt, Argon2, or scrypt.",
  },
  {
    id: "c23",
    title: "Wordlist Warrior",
    category: "Classical",
    difficulty: 3,
    description:
      "Vigenere ciphertext intercepted. No key known — but intelligence says the key is a common English word between 4-8 letters.",
    ciphertext: "Ektcc strcit xh pbpdhph. Fapr{aogswmsi_pexarz}",
    flag: "flag{wordlist_attack}",
    hints: [
      "The key is a common English word. The tool will try many candidates automatically.",
      "The key is: apple",
    ],
    tool: "wordlistvig",
    explanation:
      "Vigenere with key 'apple' (5 letters). The wordlist attack tries each candidate key and scores the result by English letter frequency. When IC reaches ~0.065, the key is correct.",
  },
  {
    id: "c24",
    title: "Wiener Winner",
    category: "Crypto Math",
    difficulty: 3,
    description:
      "RSA encryption with a dangerously small private key. Use Wiener's attack to recover d. The flag is the value of d.",
    ciphertext: "n = 9449868410449, e = 17993",
    flag: "flag{wiener_wins}",
    hints: [
      "Enter n and e from the ciphertext above.",
      "Wiener's attack uses continued fractions of e/n to find d when d < n^(1/4)/3.",
    ],
    tool: "rsa",
    explanation:
      "Wiener's attack finds d via continued fraction expansion of e/n. This is why RSA standards require d to be at least n^0.5 in size. Small d is catastrophically insecure.",
  },
  {
    id: "c25",
    title: "Triple Trouble",
    category: "Encoding",
    difficulty: 2,
    description:
      "This string has been encoded multiple times. Peel back each layer to find the flag. Start from the outside and work inward.",
    ciphertext: "V20xNGFGb3pkSGRoV0VKc1lrZHNkVnBXT1hSWldFNHdXbGhLWm1SSGFIbGFWMVk1",
    flag: "flag{pipeline_master_three}",
    hints: [
      "The first step is always Base64 decode.",
      "After first decode you get another Base64 string. Decode again.",
      "Three Base64 layers total.",
    ],
    tool: "pipeline",
    explanation:
      "Triple Base64 encoding. The Pipeline tool lets you chain Base64 decode steps. Each decode peels one layer until the flag is revealed.",
  },
  {
    id: "c26",
    title: "File Magic",
    category: "Forensics",
    difficulty: 1,
    description:
      "A suspicious file was captured with a .txt extension. The first bytes reveal the true file type. Identify it from the magic bytes.",
    ciphertext: "First 16 bytes (hex): 89 50 4E 47 0D 0A 1A 0A 00 00 00 0D 49 48 44 52",
    flag: "flag{its_a_png}",
    hints: [
      "File magic bytes identify the true type of a file regardless of extension.",
      "89 50 4E 47 is the PNG magic number. Use Base Converter on bytes 2-4.",
      "50='P', 4E='N', 47='G'.",
    ],
    tool: "converter",
    explanation:
      "The magic bytes 89 50 4E 47 0D 0A 1A 0A are the PNG file signature. Every PNG file starts with these 8 bytes. The 'file' command on Linux uses magic bytes to identify true file types.",
  },
  {
    id: "c27",
    title: "AES Pattern Leak",
    category: "Modern Crypto",
    difficulty: 3,
    description:
      "A developer chose AES-ECB to encrypt structured data. The same block appears twice in the output — a catastrophic information leak. Identify the vulnerability.",
    ciphertext: "Block 1: d8578edf8458ce06fbc5bb76a58c5ca4\nBlock 2: d8578edf8458ce06fbc5bb76a58c5ca4\nBlock 3: a87ff679a2f3e71d9181a67b7542122c\n\nQuestion: What does having identical blocks 1 and 2 prove?",
    flag: "flag{ecb_blocks_repeat}",
    hints: [
      "AES-ECB encrypts identical 16-byte blocks to identical ciphertext — always.",
      "Identical ciphertext blocks reveal identical plaintext blocks.",
    ],
    tool: "aesblock",
    explanation:
      "AES-ECB produces the same ciphertext for equal plaintext blocks. Two identical output blocks reveal two identical input blocks — leaking plaintext structure. CBC mode uses an IV to prevent this.",
  },
  {
    id: "c28",
    title: "Entropy Hunt",
    category: "Analysis",
    difficulty: 2,
    description:
      "Three data blobs. One is plaintext, one is base64, one is AES-encrypted. The flag is hidden in the hex-encoded plaintext blob. Find it.",
    ciphertext: "Blob A (hex): 54686520666c61677b656e74726f70795f74656c6c737d20697320706c61696e74657874\nBlob B (hex): 8e3f2a1b9c4d7e6f0a1b2c3d4e5f60718e3f2a1b9c4d7e6f\nBlob C: VGhlIGZsYWd7ZW50cm9weV90ZWxsc30gaXMgcGxhaW50ZXh0",
    flag: "flag{entropy_tells}",
    hints: [
      "Use the Entropy Visualizer to analyze each blob — lower entropy = more structured.",
      "Blob A's hex decodes directly to ASCII using the Base Converter.",
      "The flag is in Blob A once converted from hex to text.",
    ],
    tool: "converter",
    explanation:
      "Blob A decodes to 'The flag{entropy_tells} is plaintext'. Blob B is high-entropy encrypted data. Blob C is Base64 of the same text. Entropy analysis classifies data without knowing the algorithm.",
  },
  {
    id: "c29",
    title: "CRT Challenge",
    category: "Crypto Math",
    difficulty: 3,
    description:
      "Use Chinese Remainder Theorem to recover a secret number x given three residues. The flag encodes x.",
    ciphertext: "x ≡ 2 (mod 3)\nx ≡ 3 (mod 5)\nx ≡ 2 (mod 7)\n\nFind the unique x in [0, 105).",
    flag: "flag{crt_value_23}",
    hints: [
      "Use Number Theory → CRT tab. Enter the three congruences.",
      "CRT gives a unique solution mod (3*5*7) = 105.",
      "The answer is x = 23. The flag is flag{crt_value_23}.",
    ],
    tool: "numtheory",
    explanation:
      "CRT: x = 2+3*5*(mod_inv(5,3)*2 mod 3) + ... By Gauss's formula, x = 23 mod 105. CRT is the basis of Hastad's broadcast attack in RSA and is used in optimized RSA implementations.",
  },
  {
    id: "c30",
    title: "Hex Dump Investigation",
    category: "Forensics",
    difficulty: 1,
    description:
      "A hex dump from a network capture contains an ASCII string that looks like a flag. Convert the hex and read it.",
    ciphertext: "47 72 65 61 74 20 6a 6f 62 21 20 46 6c 61 67 3a 20 66 6c 61 67 7b 68 65 78 5f 64 75 6d 70 5f 66 6f 72 65 6e 73 69 63 73 7d",
    flag: "flag{hex_dump_forensics}",
    hints: [
      "Paste the hex bytes (spaces are fine).",
      "Each hex pair is one ASCII character. Convert to see the text.",
      "47='G', 72='r', 65='e'... keep going.",
    ],
    tool: "converter",
    explanation:
      "Direct hex-to-ASCII conversion reveals the flag. Hex dumps from network captures, memory forensics, and file analysis are a fundamental CTF skill. The Base Converter handles space-separated hex automatically.",
  },
];

export const CATEGORIES = [...new Set(CHALLENGES.map(c => c.category))];
export const MAX_SCORE = CHALLENGES.reduce((s, c) => s + c.difficulty * 100, 0);
