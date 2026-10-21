import subprocess
import re
import qrcode
import os
import sys
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TUNNEL_FILE = os.path.join(BASE_DIR, "tunnel_url.txt")
QR_PATH = os.path.join(BASE_DIR, "frontend", "icons", "cloud_qr.png")

print("=" * 70)
print("  SANJEEVANI HEALTHCARE - GLOBAL PUBLIC HTTPS AUTO-RECONNECT TUNNEL")
print("  Provides worldwide access from any phone/laptop (Indian ISPs supported)")
print("=" * 70)

cmd = [
    "ssh",
    "-o", "StrictHostKeyChecking=no",
    "-o", "ConnectTimeout=10",
    "-o", "ServerAliveInterval=15",
    "-o", "ServerAliveCountMax=3",
    "-R", "80:127.0.0.1:8000",
    "nokey@localhost.run"
]

while True:
    print(f"[{time.strftime('%X')}] Connecting to tunnel server...")
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
        url_found = False
        for line in proc.stdout:
            sys.stdout.write(line)
            sys.stdout.flush()
            if not url_found:
                match = re.search(r"https://[a-zA-Z0-9-]+\.lhr\.life", line)
                if match:
                    url = match.group(0)
                    url_found = True
                    with open(TUNNEL_FILE, "w", encoding="utf-8") as f:
                        f.write(url)
                    
                    try:
                        qr = qrcode.QRCode(version=1, box_size=8, border=2)
                        qr.add_data(url)
                        qr.make(fit=True)
                        img = qr.make_image(fill_color="black", back_color="white")
                        img.save(QR_PATH)
                        print("\n" + "=" * 70)
                        print(f"  [OK] LIVE DEMONSTRATION LINK READY:")
                        print(f"  >>> {url} <<<")
                        print(f"  [OK] Updated QR code at: frontend/icons/cloud_qr.png")
                        print("=" * 70 + "\n")
                    except Exception as e:
                        print(f"QR code generation notice: {e}")
        proc.wait()
    except Exception as err:
        print(f"Tunnel process exception: {err}")
    
    print(f"[{time.strftime('%X')}] Tunnel disconnected. Auto-reconnecting in 3 seconds...")
    time.sleep(3)
