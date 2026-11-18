// RÝNI — password generation for admin-managed local users.
//
// Alphabet is deliberately unambiguous: no 0/O, 1/l/I, so a generated
// password survives copy-paste and handwriting without confusion.

const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export { ALPHABET };

// Largest multiple of ALPHABET.length below 2^32. Values at or above this
// are rejected so that `% ALPHABET.length` is unbiased (2^32 is not divisible
// by 57; plain modulo would make the first 41 indices slightly more likely).
const LIMIT = 0x100000000 - (0x100000000 % ALPHABET.length);

function randomAlphabetIndex(): number {
  while (true) {
    const v = crypto.getRandomValues(new Uint32Array(1))[0];
    if (v < LIMIT) return v % ALPHABET.length;
  }
}

export function generatePassword(length = 16): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomAlphabetIndex()];
  }
  return out;
}
