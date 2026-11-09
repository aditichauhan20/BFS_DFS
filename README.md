# PathPilot

PathPilot is a local graph explorer for BFS, DFS, and shortest-path searches.

## Run on Windows

1. Install Python 3 and a C++ compiler that provides `g++`.
2. Double-click `run.bat`.
3. Use the local URL printed in the terminal. Keep the terminal open while using PathPilot.

The server compiles `main.cpp` automatically when the executable is missing or out of date. If the default port is busy, the server selects the next available port and opens that URL. Keep the terminal open while using the server.

To start from a terminal instead, run `python server.py` from the project folder.

Route finding, comparison, and traversal animation also have a browser-side fallback. They continue to work if the server is stopped or the page is opened directly, though the C++ backend is used whenever it is available.
