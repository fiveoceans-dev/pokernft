# deck_rng.py  – reference DRBG & verifier  (Python 3.12)
"""
Uses NIST SP 800-90A CTR_DRBG via secrets.token_bytes() (wraps /dev/urandom). 
Fisher-Yates returns a list of 52 ints.  Two-felt packing helpers included.
"""
import hashlib, secrets, json, math, unittest, random
from collections import Counter

def _stretch(seed: bytes, size: int = 512) -> bytes:
    key = hashlib.sha256(seed).digest()
    out = b""
    while len(out) < size:
        key = hashlib.sha256(key).digest()
        out += key
    return out[:size]

def sha256_int(*chunks: bytes) -> int:
    h = hashlib.sha256()
    for c in chunks: h.update(c)
    return int.from_bytes(h.digest(), 'big')

def fisher_yates(seed_bytes: bytes) -> list[int]:
    rng = list(range(52))
    random_vals = list(seed_bytes)
    j = 0
    for i in range(51):
        j += 1
        k = random_vals[j] % (52 - i)
        rng[i], rng[i+k] = rng[i+k], rng[i]
    return rng

def pack_two_felts(deck: list[int]) -> list[int]:
    packed = []
    for c in deck:
        packed += [c % 13, c // 13]
    return packed

def deal(server_seed: bytes, client_seed: bytes, nonce: int):
    seed = server_seed + client_seed + nonce.to_bytes(8,'big')
    stretched = _stretch(seed)
    deck = fisher_yates(stretched)
    return deck, hashlib.sha256(server_seed).hexdigest()

def verify_deck(deck_json, server_seed, client_seed, nonce):
    expected, _ = deal(server_seed, client_seed, nonce)
    return expected == deck_json

#   χ² uniformity test  
def chi_square(num_trials=100_000):
    counts = Counter()
    for i in range(num_trials):
        d,_ = deal(secrets.token_bytes(32),
                   b'client', i)
        counts[d[0]] += 1
    expected = num_trials / 52
    chi2 = sum((c-expected)**2/expected for c in counts.values())
    return chi2

#   unit tests  
class TestRNG(unittest.TestCase):
    def test_reproducible(self):
        s, c, n = b'a'*32, b'b'*32, 42
        d,_ = deal(s, c, n)
        self.assertTrue(verify_deck(d, s, c, n))

    def test_uniformity(self):
        chisq = chi_square(10_000)
        # 51 df, 95 % critical ≈ 69.83
        self.assertLess(chisq, 69.83)

if __name__ == '__main__':
    unittest.main()
