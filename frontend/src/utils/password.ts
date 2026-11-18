// RÝNI — password generation for admin-managed local users.
//
// Alphabet is deliberately unambiguous: no 0/O, 1/l/I, so a generated
// password survives copy-paste and handwriting without confusion.

const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generatePassword(length = 16): string {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
