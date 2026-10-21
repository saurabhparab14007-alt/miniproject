import subprocess
import re
import qrcode
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TUNNEL_FILE = os.path.join(BASE_DIR, "tunnel_url.txt")
QR_PATH = os.path.join(BASE_DIR, "frontend", "icons", "cloud_qr.png")
CLOUDFLARED_EXE = os.path.join(BASE_DIR, "cloudflared.exe")

print("=" * 70)
print("  SANJEEVANI HEALTHCARE - CLOUDFLARE PUBLIC HTTPS TUNNEL")
print("=" * 70)

cmd = [CLOUDFLARED_EXE, "tunnel", "--url", "http://127.0.0.1:8000"]
proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)

url_found = False
for line in proc.stdout:
    sys.stdout.write(line)
    sys.stdout.flush()
    if not url_found:
        match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
        if match:
            url = match.group(0)
            url_found = True
            with open(TUNNEL_FILE, "w", encoding="utf-8") as f:
                f.write(url)
            
            # Generate QR code
            try:
                qr = qrcode.QRCode(version=1, box_size=8, border=2)
                qr.add_data(url)
                qr.make(fit=True)
                img = qr.make_image(fill_color="black", back_color="white")
                img.save(QR_PATH)
                print("\n" + "=" * 70)
                print(f"  [OK] LIVE CLOUD TUNNEL URL READY FOR PHONES:")
                print(f"  >>> {url} <<<")
                print("  [OK] Updated QR code at frontend/icons/cloud_qr.png")
                print("=" * 70 + "\n")
            except Exception as e:
                print(f"QR generation notice: {e}")

proc.wait()
