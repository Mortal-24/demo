import math


# =======================
# Caesar Cipher
# =======================
class CaesarCipher:
    def encrypt(self, plaintext: str, shift: int) -> str:
        shift %= 26
        result = []

        for char in plaintext:
            if char.isupper():
                result.append(chr((ord(char) - 65 + shift) % 26 + 65))
            elif char.islower():
                result.append(chr((ord(char) - 97 + shift) % 26 + 97))
            else:
                result.append(char)

        return ''.join(result)

    def decrypt(self, ciphertext: str, shift: int) -> str:
        return self.encrypt(ciphertext, -shift)


# =======================
# Affine Cipher
# =======================
class AffineCipher:
    def mod_inverse(self, a: int, m: int = 26) -> int:
        for i in range(m):
            if (a * i) % m == 1:
                return i
        raise ValueError("Invalid 'a': No modular inverse exists")

    def encrypt(self, plaintext: str, a: int, b: int) -> str:
        if math.gcd(a, 26) != 1:
            raise ValueError("'a' must be coprime with 26")

        result = []
        for char in plaintext:
            if char.isalpha():
                base = 65 if char.isupper() else 97
                x = ord(char) - base
                enc = (a * x + b) % 26
                result.append(chr(enc + base))
            else:
                result.append(char)

        return ''.join(result)

    def decrypt(self, ciphertext: str, a: int, b: int) -> str:
        a_inv = self.mod_inverse(a)
        result = []

        for char in ciphertext:
            if char.isalpha():
                base = 65 if char.isupper() else 97
                y = ord(char) - base
                dec = (a_inv * (y - b)) % 26
                result.append(chr(dec + base))
            else:
                result.append(char)

        return ''.join(result)


# =======================
# Vigenere Cipher
# =======================
class VigenereCipher:
    def generate_key(self, text: str, key: str) -> str:
        key = key.lower()
        result_key = []
        j = 0

        for char in text:
            if char.isalpha():
                result_key.append(key[j % len(key)])
                j += 1
            else:
                result_key.append(char)

        return ''.join(result_key)

    def encrypt(self, plaintext: str, key: str) -> str:
        key = self.generate_key(plaintext, key)
        result = []

        for p, k in zip(plaintext, key):
            if p.isalpha():
                base = 65 if p.isupper() else 97
                x = (ord(p.lower()) - 97 + ord(k.lower()) - 97) % 26
                result.append(chr(x + base))
            else:
                result.append(p)

        return ''.join(result)

    def decrypt(self, ciphertext: str, key: str) -> str:
        key = self.generate_key(ciphertext, key)
        result = []

        for c, k in zip(ciphertext, key):
            if c.isalpha():
                base = 65 if c.isupper() else 97
                x = (ord(c.lower()) - 97 - (ord(k.lower()) - 97)) % 26
                result.append(chr(x + base))
            else:
                result.append(c)

        return ''.join(result)


# =======================
# Playfair Cipher
# =======================
class PlayFair:
    def __init__(self, key: str):
        self.key = key
        self.matrix = self.generate_matrix()

    def generate_matrix(self):
        key = self.key.upper().replace("J", "I")
        seen = set()
        matrix = []

        for ch in key:
            if ch.isalpha() and ch not in seen:
                seen.add(ch)
                matrix.append(ch)

        for ch in "ABCDEFGHIKLMNOPQRSTUVWXYZ":
            if ch not in seen:
                matrix.append(ch)

        return [matrix[i:i+5] for i in range(0, 25, 5)]

    def find_position(self, ch):
        for r in range(5):
            for c in range(5):
                if self.matrix[r][c] == ch:
                    return r, c
        raise ValueError("Character not found")

    def prepare_text(self, text):
        text = text.upper().replace("J", "I")
        pairs = []
        i = 0

        while i < len(text):
            if not text[i].isalpha():
                i += 1
                continue

            a = text[i]
            if i + 1 < len(text) and text[i + 1].isalpha():
                b = text[i + 1]
                if a == b:
                    b = "X"
                    i += 1
                else:
                    i += 2
            else:
                b = "X"
                i += 1

            pairs.append(a + b)

        return pairs

    def encrypt(self, plaintext):
        pairs = self.prepare_text(plaintext)
        cipher = ""

        for a, b in pairs:
            r1, c1 = self.find_position(a)
            r2, c2 = self.find_position(b)

            if r1 == r2:
                cipher += self.matrix[r1][(c1 + 1) % 5]
                cipher += self.matrix[r2][(c2 + 1) % 5]
            elif c1 == c2:
                cipher += self.matrix[(r1 + 1) % 5][c1]
                cipher += self.matrix[(r2 + 1) % 5][c2]
            else:
                cipher += self.matrix[r1][c2]
                cipher += self.matrix[r2][c1]

        return cipher

    def decrypt(self, ciphertext):
        plain = ""

        for i in range(0, len(ciphertext), 2):
            a, b = ciphertext[i], ciphertext[i + 1]
            r1, c1 = self.find_position(a)
            r2, c2 = self.find_position(b)

            if r1 == r2:
                plain += self.matrix[r1][(c1 - 1) % 5]
                plain += self.matrix[r2][(c2 - 1) % 5]
            elif c1 == c2:
                plain += self.matrix[(r1 - 1) % 5][c1]
                plain += self.matrix[(r2 - 1) % 5][c2]
            else:
                plain += self.matrix[r1][c2]
                plain += self.matrix[r2][c1]

        return plain


# =======================
# Rail Fence Cipher
# =======================
class RailFence:
    def encrypt(self, plaintext, key):
        plaintext = plaintext.replace(" ", "")  # remove spaces

        rail = [['\n'] * len(plaintext) for _ in range(key)]
        row, col = 0, 0
        dir_down = False

        for char in plaintext:
            if row == 0 or row == key - 1:
                dir_down = not dir_down

            rail[row][col] = char
            col += 1
            row += 1 if dir_down else -1

        result = []
        for r in rail:
            for c in r:
                if c != '\n':
                    result.append(c)

        return ''.join(result)

    def decrypt(self, ciphertext, key):
        rail = [['\n'] * len(ciphertext) for _ in range(key)]
        row, col = 0, 0
        dir_down = False

        for _ in range(len(ciphertext)):
            if row == 0 or row == key - 1:
                dir_down = not dir_down
            rail[row][col] = '*'
            col += 1
            row += 1 if dir_down else -1

        index = 0
        for i in range(key):
            for j in range(len(ciphertext)):
                if rail[i][j] == '*' and index < len(ciphertext):
                    rail[i][j] = ciphertext[index]
                    index += 1

        result = []
        row, col = 0, 0
        dir_down = False

        for _ in range(len(ciphertext)):
            if row == 0 or row == key - 1:
                dir_down = not dir_down
            result.append(rail[row][col])
            col += 1
            row += 1 if dir_down else -1

        return ''.join(result)
