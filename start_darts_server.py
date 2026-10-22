import http.server
import socketserver
import os
import socket

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # CORS & No-Cache für reibungslose OBS & Handy Echtzeit-Übertragung
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    local_ip = get_ip()
    print("=" * 60)
    print("❖ THE GENTLEMEN DARTS - LOKALER WEBSERVER ❖")
    print("=" * 60)
    print(f"\nDein PC laeuft unter der IP: {local_ip}")
    print(f"\n1. HANDY-CONTROLLER LINK:")
    print(f"   http://{local_ip}:{PORT}/darts_controller.html")
    print(f"\n2. OBS OVERLAY LINK:")
    print(f"   http://localhost:{PORT}/darts_overlay.html")
    print(f"\n3. QR-CODE & SETUP SEITE:")
    print(f"   http://{local_ip}:{PORT}/connect_phone.html")
    print("\n" + "=" * 60)
    print("Server laeuft... Fenster geoeffnet lassen waehrend des Darts-Spiels.")
    print("=" * 60 + "\n")

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer beendet.")
