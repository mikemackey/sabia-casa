#!/usr/bin/env python3
"""Generate the door-sign QR code.

Usage:
    pip install "qrcode[pil]"
    python make_qr.py https://sabia.casa

Outputs qr.png (print-ready, ~1000px = 3.3in at 300dpi) and qr.svg
next to this script. Error correction is set to H (30%) so the code
keeps scanning even when Arizona sun fades the print (brief §12 calls
for scannable from 2-3 ft, UV/weather-proof).
"""
import sys
from pathlib import Path

try:
    import qrcode
    import qrcode.image.svg
except ImportError:
    sys.exit('Missing dependency. Run:  pip install "qrcode[pil]"')

if len(sys.argv) != 2 or not sys.argv[1].startswith("http"):
    sys.exit("Usage: python make_qr.py https://sabia.casa")

url = sys.argv[1]
here = Path(__file__).resolve().parent

qr = qrcode.QRCode(
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=24,   # ≈1000px total → 3.3in at 300dpi
    border=4,      # quiet zone (spec minimum)
)
qr.add_data(url)
qr.make(fit=True)

qr.make_image(fill_color="black", back_color="white").save(here / "qr.png")

svg = qrcode.make(url, error_correction=qrcode.constants.ERROR_CORRECT_H,
                  image_factory=qrcode.image.svg.SvgPathImage)
svg.save(here / "qr.svg")

print(f"Wrote {here/'qr.png'} and {here/'qr.svg'} for:\n  {url}")
print("Print test: scan the printed sign from 3 ft in direct sunlight before mounting.")
