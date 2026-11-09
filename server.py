from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import errno
import json
import subprocess
import os
import webbrowser

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
SOURCE = ROOT / "main.cpp"

PROGRAM = ROOT / (
    "pathpilot.exe" if os.name == "nt" else "pathpilot"
)

HOST = "127.0.0.1"
PORT = int(os.environ.get("PATHPILOT_PORT", "8000"))


def compile_program(force=False):

    needs_compile = (
        force
        or not PROGRAM.exists()
        or PROGRAM.stat().st_mtime < SOURCE.stat().st_mtime
    )

    if not needs_compile:
        return

    command = [
        "g++",
        "-std=c++17",
        "-O2",
        str(SOURCE),
        "-o",
        str(PROGRAM)
    ]

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=30
        )

    except FileNotFoundError:
        raise RuntimeError(
            "g++ was not found. Check your compiler installation."
        )

    except subprocess.TimeoutExpired:
        raise RuntimeError("C++ compilation timed out.")

    if result.returncode != 0:
        raise RuntimeError(
            result.stderr.strip() or "Compilation failed."
        )


def run_program(input_text):

    compile_program()

    command = [str(PROGRAM)]
    options = {
        "input": input_text,
        "capture_output": True,
        "text": True,
        "timeout": 10,
        "cwd": str(ROOT)
    }

    try:
        return subprocess.run(command, **options)

    except FileNotFoundError:
        compile_program(force=True)

        try:
            return subprocess.run(command, **options)

        except FileNotFoundError as error:
            raise RuntimeError(
                f"Compiled program could not be found at {PROGRAM}."
            ) from error


class PathPilotHandler(SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(
            *args,
            directory=str(PUBLIC),
            **kwargs
        )

    def send_json(self, status, payload):

        body = json.dumps(payload).encode("utf-8")

        self.send_response(status)

        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )

        self.send_header(
            "Content-Length",
            str(len(body))
        )

        self.send_header("Cache-Control", "no-store")

        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):

        if self.path != "/api/run":

            self.send_json(404, {
                "success": False,
                "error": "API endpoint not found."
            })

            return

        try:

            length = int(
                self.headers.get("Content-Length", "0")
            )

            if length <= 0 or length > 1000000:

                self.send_json(400, {
                    "success": False,
                    "error": "Invalid request size."
                })

                return

            payload = json.loads(
                self.rfile.read(length).decode("utf-8")
            )

            input_text = payload.get("input", "")

            if not isinstance(input_text, str) or not input_text.strip():

                self.send_json(400, {
                    "success": False,
                    "error": "No graph data received."
                })

                return

            result = run_program(input_text)

            if result.returncode != 0:

                self.send_json(500, {
                    "success": False,
                    "error": result.stderr.strip()
                    or "C++ execution failed."
                })

                return

            output = result.stdout.strip()

            if output.startswith("ERROR:"):

                self.send_json(400, {
                    "success": False,
                    "error": output.replace(
                        "ERROR:", "", 1
                    ).strip()
                })

                return

            data = {}

            for line in output.splitlines():

                if ":" not in line:
                    continue

                key, value = line.split(":", 1)

                data[key.strip()] = value.strip()

            traversal_text = data.get(
                "BFS Traversal",
                data.get("DFS Traversal", "")
            )

            traversal = (
                []
                if traversal_text in ("", "None")
                else [
                    int(x.strip())
                    for x in traversal_text.split("->")
                ]
            )

            path_text = data.get("Route", data.get("Shortest Path", ""))

            path = (
                []
                if path_text in ("", "None")
                else [
                    int(x.strip())
                    for x in path_text.split("->")
                ]
            )

            self.send_json(200, {
                "success": True,
                "traversal": traversal,
                "path": path,
                "pathFound": data.get("Path Found") == "Yes",
                "time": data.get("Execution Time", "0 ms"),
                "raw": output
            })

        except json.JSONDecodeError:

            self.send_json(400, {
                "success": False,
                "error": "Invalid JSON request."
            })

        except subprocess.TimeoutExpired:

            self.send_json(500, {
                "success": False,
                "error": "Route calculation timed out."
            })

        except RuntimeError as error:

            self.send_json(500, {
                "success": False,
                "error": str(error)
            })

        except Exception as error:

            self.send_json(500, {
                "success": False,
                "error": f"Server error: {error}"
            })

    def log_message(self, format, *args):
        print("[PathPilot] " + (format % args))


class PathPilotHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = False


if __name__ == "__main__":

    if not PUBLIC.exists():
        raise SystemExit("The public folder is missing.")

    try:
        compile_program()

    except RuntimeError as error:
        print(f"[PathPilot] {error}")
        raise SystemExit(1)

    server = None

    for port in range(PORT, min(PORT + 11, 65536)):
        try:
            server = PathPilotHTTPServer(
                (HOST, port),
                PathPilotHandler
            )
            break
        except OSError as error:
            if error.errno != errno.EADDRINUSE:
                raise

    if server is None:
        raise SystemExit(
            f"No available port found between {PORT} and "
            f"{min(PORT + 10, 65535)}."
        )

    url = f"http://{HOST}:{server.server_address[1]}"

    print(f"PathPilot is running at {url}")

    if os.environ.get("PATHPILOT_OPEN_BROWSER") == "1":
        webbrowser.open(url)

    print("Keep this terminal open while using the website.")
    print("Press Ctrl+C to stop.")

    try:
        server.serve_forever()

    except KeyboardInterrupt:
        print("\nPathPilot server stopped.")

    finally:
        server.server_close()