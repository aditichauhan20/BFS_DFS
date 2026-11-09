// ==========================================
// PATHPILOT - MAIN JAVASCRIPT
// ==========================================

const $ = (id) => document.getElementById(id);


// DEFAULT GRAPH

const DEFAULT_NODES = [
    { id: 0, name: "Home" },
    { id: 1, name: "Market" },
    { id: 2, name: "Park" },
    { id: 3, name: "Station" },
    { id: 4, name: "Office" },
    { id: 5, name: "Hospital" }
];

const DEFAULT_EDGES = [
    { from: 0, to: 1, blocked: false },
    { from: 0, to: 2, blocked: false },
    { from: 1, to: 3, blocked: false },
    { from: 2, to: 3, blocked: false },
    { from: 2, to: 4, blocked: false },
    { from: 3, to: 5, blocked: false },
    { from: 4, to: 5, blocked: false }
];


// APPLICATION STATE

let nodes = structuredClone(DEFAULT_NODES);
let edges = structuredClone(DEFAULT_EDGES);

let selectedAlgorithm = "BFS";

let lastTraversal = [];
let lastPath = [];

let animationTimer = null;
let animationIndex = 0;

let history = [];


// HTML SAFETY

function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

}


// GRAPH HELPERS

function activeEdges() {

    return edges.filter(edge => !edge.blocked);

}


function setStatus(message, type = "") {

    const element = $("resultStatus");

    element.textContent = message;

    element.className =
        "result-status" + (type ? ` ${type}` : "");

}


function updateStats() {

    $("locationCount").textContent = nodes.length;

    $("connectionCount").textContent =
        activeEdges().length;

}


function updateSelectors() {

    const selectorIds = [
        "startNode",
        "endNode",
        "edgeFrom",
        "edgeTo",
        "blockFrom",
        "blockTo"
    ];

    selectorIds.forEach(id => {

        const select = $(id);

        const previous = select.value;

        select.innerHTML = "";

        nodes.forEach(node => {

            const option = document.createElement("option");

            option.value = node.id;
            option.textContent = node.name;

            select.appendChild(option);

        });

        if (nodes.some(node => String(node.id) === previous)) {
            select.value = previous;
        }

    });

    if (
        nodes.length > 1 &&
        $("endNode").value === $("startNode").value
    ) {
        $("endNode").value = String(nodes[1].id);
    }

    if (
        nodes.length > 1 &&
        $("edgeTo").value === $("edgeFrom").value
    ) {
        $("edgeTo").value = String(nodes[1].id);
    }

    if (
        nodes.length > 1 &&
        $("blockTo").value === $("blockFrom").value
    ) {
        $("blockTo").value = String(nodes[1].id);
    }

}


// GRAPH DISPLAY

function nodePosition(index, total) {

    const cx = 380;
    const cy = 215;

    const rx = total <= 2 ? 230 : 285;
    const ry = total <= 2 ? 0 : 155;

    const angle =
        -Math.PI / 2 +
        (2 * Math.PI * index / Math.max(total, 1));

    return {
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle)
    };

}


function renderGraph() {

    const svg = $("graphSvg");

    const positions = new Map(
        nodes.map((node, index) => [
            node.id,
            nodePosition(index, nodes.length)
        ])
    );

    const start = Number($("startNode").value || 0);
    const destination = Number($("endNode").value || 0);


    // DRAW CONNECTIONS

    const edgeMarkup = edges.map(edge => {

        const a = positions.get(edge.from);
        const b = positions.get(edge.to);

        if (!a || !b) return "";

        const onRoute =
            !edge.blocked &&
            lastPath.some((id, index) =>
                index < lastPath.length - 1 &&
                (
                    (
                        lastPath[index] === edge.from &&
                        lastPath[index + 1] === edge.to
                    )
                    ||
                    (
                        lastPath[index] === edge.to &&
                        lastPath[index + 1] === edge.from
                    )
                )
            );

        const classes = [
            "graph-edge",
            edge.blocked ? "blocked-edge" : "",
            onRoute ? "route-edge" : ""
        ].filter(Boolean).join(" ");

        return `
            <line
                class="${classes}"
                x1="${a.x}"
                y1="${a.y}"
                x2="${b.x}"
                y2="${b.y}">
            </line>
        `;

    }).join("");


    // DRAW LOCATIONS

    const nodeMarkup = nodes.map(node => {

        const p = positions.get(node.id);

        const classes = [
            "graph-node",
            lastTraversal.includes(node.id) ? "visited-node" : "",
            node.id === start ? "start-node" : "",
            node.id === destination ? "destination-node" : ""
        ].filter(Boolean).join(" ");

        const shortName =
            node.name.length > 13
                ? node.name.slice(0, 12) + "…"
                : node.name;

        return `
            <g class="${classes}" data-node-id="${node.id}">

                <circle
                    cx="${p.x}"
                    cy="${p.y}"
                    r="24">
                </circle>

                <text
                    x="${p.x}"
                    y="${p.y + 39}">
                    ${escapeHTML(shortName)}
                </text>

                <text
                    x="${p.x}"
                    y="${p.y}"
                    class="node-id">
                    ${node.id}
                </text>

            </g>
        `;

    }).join("");

    svg.innerHTML = edgeMarkup + nodeMarkup;

    $("graphMessage").hidden = nodes.length > 0;

    updateStats();

}


// CLEAR OLD RESULTS

function clearResults(
    message = "Graph updated. Run an algorithm to calculate a fresh route.",
    type = ""
) {

    stopAnimation();

    lastTraversal = [];
    lastPath = [];

    $("visitedCount").textContent = "0";
    $("algorithmName").textContent = "—";

    $("traversalResult").textContent =
        "Run BFS or DFS to see the traversal.";

    $("traversalResult").classList.add("muted");

    $("pathResult").textContent =
        "Your route will appear here.";

    $("pathResult").classList.add("muted");

    $("nodesResult").textContent = "—";
    $("timeResult").textContent = "—";

    $("bfsComparison").textContent =
        "Run comparison to view BFS results.";

    $("dfsComparison").textContent =
        "Run comparison to view DFS results.";

    setStatus(message, type);

    renderGraph();

}


// CREATE INPUT FOR C++ PROGRAM

function buildInput(algorithm) {

    const usable = activeEdges();

    const lines = [
        `${nodes.length} ${usable.length}`
    ];

    usable.forEach(edge => {
        lines.push(`${edge.from} ${edge.to}`);
    });

    lines.push(
        `${Number($("startNode").value)} ${Number($("endNode").value)} ${algorithm}`
    );

    return lines.join("\n");

}


function calculateLocally(algorithm, start, destination) {

    const started = performance.now();

    const graph = Array.from(
        { length: nodes.length },
        () => []
    );

    activeEdges().forEach(edge => {
        graph[edge.from].push(edge.to);
        graph[edge.to].push(edge.from);
    });

    graph.forEach(neighbours => neighbours.sort((a, b) => a - b));

    const traversal = [];
    const visited = new Set();

    if (algorithm === "BFS") {

        const queue = [start];
        let queueIndex = 0;
        visited.add(start);

        while (queueIndex < queue.length) {

            const current = queue[queueIndex++];
            traversal.push(current);

            graph[current].forEach(neighbour => {
                if (!visited.has(neighbour)) {
                    visited.add(neighbour);
                    queue.push(neighbour);
                }
            });

        }

    } else {

        const stack = [start];

        while (stack.length) {

            const current = stack.pop();

            if (visited.has(current)) continue;

            visited.add(current);
            traversal.push(current);

            [...graph[current]].reverse().forEach(neighbour => {
                if (!visited.has(neighbour)) {
                    stack.push(neighbour);
                }
            });

        }

    }

    const parent = new Map([[start, -1]]);
    const queue = [start];
    let queueIndex = 0;

    while (
        queueIndex < queue.length &&
        !parent.has(destination)
    ) {

        const current = queue[queueIndex++];

        graph[current].forEach(neighbour => {
            if (!parent.has(neighbour)) {
                parent.set(neighbour, current);
                queue.push(neighbour);
            }
        });

    }

    const path = [];

    if (parent.has(destination)) {
        for (
            let current = destination;
            current !== -1;
            current = parent.get(current)
        ) {
            path.push(current);
        }

        path.reverse();
    }

    return {
        traversal,
        path,
        pathFound: path.length > 0,
        time: `${(performance.now() - started).toFixed(3)} ms`
    };

}


// RUN BFS OR DFS

async function runAlgorithm(
    algorithm = selectedAlgorithm,
    options = {}
) {

    stopAnimation();

    if (nodes.length < 1) {

        setStatus(
            "Add at least one location before running an algorithm.",
            "error"
        );

        return null;
    }

    const start = Number($("startNode").value);
    const destination = Number($("endNode").value);

    if (
        !Number.isInteger(start) ||
        !Number.isInteger(destination)
    ) {

        setStatus(
            "Choose a starting location and destination.",
            "error"
        );

        return null;
    }

    setStatus(`Running ${algorithm}...`);

    $("findRoute").disabled = true;
    $("compareButton").disabled = true;

    let data;
    let calculatedLocally = false;

    try {

        if (location.protocol === "file:") {

            data = calculateLocally(
                algorithm,
                start,
                destination
            );

            calculatedLocally = true;

        } else {

            try {

                const response = await fetch("/api/run", {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        input: buildInput(algorithm)
                    })

                });

                data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(
                        data.error || "The route could not be calculated."
                    );
                }

            } catch (error) {

                data = calculateLocally(
                    algorithm,
                    start,
                    destination
                );

                calculatedLocally = true;

            }

        }

        lastTraversal = data.traversal || [];
        lastPath = data.path || [];


        // UPDATE RESULT CARDS

        $("visitedCount").textContent =
            lastTraversal.length;

        $("algorithmName").textContent = algorithm;

        $("traversalResult").textContent =
            lastTraversal.length
                ? lastTraversal
                    .map(id => nodes[id]?.name ?? `Node ${id}`)
                    .join(" → ")
                : "No locations visited.";

        $("pathResult").textContent =
            data.pathFound && lastPath.length
                ? lastPath
                    .map(id => nodes[id]?.name ?? `Node ${id}`)
                    .join(" → ")
                : "No route is available between these locations.";

        $("traversalResult").classList.remove("muted");

        $("pathResult").classList.toggle(
            "muted",
            !data.pathFound
        );

        $("nodesResult").textContent =
            lastTraversal.length;

        $("timeResult").textContent =
            data.time || "—";

        renderGraph();

        if (data.pathFound) {

            setStatus(
                calculatedLocally
                    ? `${algorithm} completed in browser mode. A route was found.`
                    : `${algorithm} completed. A route was found.`,
                "success"
            );

        } else {

            setStatus(
                calculatedLocally
                    ? `${algorithm} completed in browser mode, but no route connects these locations.`
                    : `${algorithm} completed, but no route connects these locations.`,
                "error"
            );

        }

        if (!options.silent) {

            addHistory(
                algorithm,
                start,
                destination,
                data.pathFound
            );

        }

        return data;

    } catch (error) {

        setStatus(
            error.message ||
            "Could not connect to the PathPilot server.",
            "error"
        );

        return null;

    } finally {

        $("findRoute").disabled = false;
        $("compareButton").disabled = false;

    }

}


// ROUTE HISTORY

function addHistory(algorithm, start, destination, found) {

    const from =
        nodes.find(node => node.id === start)?.name
        ?? `Node ${start}`;

    const to =
        nodes.find(node => node.id === destination)?.name
        ?? `Node ${destination}`;

    history.unshift({

        algorithm,
        from,
        to,
        found,

        time: new Date().toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        )

    });

    history = history.slice(0, 8);

    renderHistory();

}


function renderHistory() {

    const container = $("historyList");

    if (!history.length) {

        container.innerHTML =
            '<p class="muted">Your recent route searches will appear here.</p>';

        return;
    }

    container.innerHTML = history.map(item => `

        <div class="history-item">

            <div>

                <strong>
                    ${escapeHTML(item.from)} → ${escapeHTML(item.to)}
                </strong>

                <small>
                    ${escapeHTML(item.algorithm)}
                    ·
                    ${item.found ? "Route found" : "No route found"}
                </small>

            </div>

            <time>${escapeHTML(item.time)}</time>

        </div>

    `).join("");

}


// ADD A LOCATION

function addNode() {

    $("nodeName").value = "";
    $("nodeNameError").hidden = true;
    $("nodeDialog").showModal();
    $("nodeName").focus();
}


function createNode(event) {

    event.preventDefault();

    const name = $("nodeName").value.trim();
    const error = $("nodeNameError");

    if (!name) {
        error.textContent = "Location name cannot be empty.";
        error.hidden = false;
        return;
    }

    if (
        nodes.some(
            node => node.name.toLowerCase() === name.toLowerCase()
        )
    ) {

        error.textContent =
            "A location with this name already exists.";
        error.hidden = false;
        return;
    }

    if (nodes.length >= 100) {

        error.textContent =
            "The demo supports up to 100 locations.";
        error.hidden = false;
        return;
    }

    nodes.push({
        id: nodes.length,
        name: name
    });

    updateSelectors();

    $("nodeDialog").close();

    clearResults(
        `"${name}" was added. Add a connection to include it in routes.`,
        "success"
    );

}


// ADD A CONNECTION

function addEdge() {

    const from = Number($("edgeFrom").value);
    const to = Number($("edgeTo").value);

    if (from === to) {

        setStatus(
            "Choose two different locations.",
            "error"
        );

        return;
    }

    const existing = edges.find(edge =>
        (edge.from === from && edge.to === to) ||
        (edge.from === to && edge.to === from)
    );

    if (existing) {

        setStatus(
            existing.blocked
                ? "This connection already exists but is blocked. Unblock it to use it."
                : "This connection already exists.",
            "error"
        );

        return;
    }

    edges.push({
        from,
        to,
        blocked: false
    });

    clearResults(
        "Connection added successfully. Run an algorithm to calculate a fresh route.",
        "success"
    );

}


// BLOCK OR UNBLOCK CONNECTION

function toggleEdge() {

    const from = Number($("blockFrom").value);
    const to = Number($("blockTo").value);

    if (from === to) {

        setStatus(
            "Choose two different locations.",
            "error"
        );

        return;
    }

    const edge = edges.find(item =>
        (item.from === from && item.to === to) ||
        (item.from === to && item.to === from)
    );

    if (!edge) {

        setStatus(
            "No connection exists between these locations.",
            "error"
        );

        return;
    }

    edge.blocked = !edge.blocked;

    clearResults(

        edge.blocked
            ? "Connection blocked. It will not be used in route calculations."
            : "Connection unblocked and available again.",

        "success"

    );

}


// STOP ANIMATION

function stopAnimation() {

    if (animationTimer) {

        clearInterval(animationTimer);

        animationTimer = null;
    }

    animationIndex = 0;

    $("animateRoute").textContent =
        "▶ Animate traversal";

}


// ANIMATE TRAVERSAL

async function animateTraversal() {

    if (animationTimer) {

        stopAnimation();

        return;
    }

    const data = await runAlgorithm(
        selectedAlgorithm,
        { silent: true }
    );

    if (!data || !data.traversal?.length) {
        return;
    }

    const sequence = data.traversal;

    lastTraversal = [];
    lastPath = [];

    animationIndex = 0;

    $("animateRoute").textContent =
        "Ⅱ Stop animation";

    renderGraph();

    animationTimer = setInterval(() => {

        if (animationIndex >= sequence.length) {

            stopAnimation();

            lastTraversal = sequence.slice();

            renderGraph();

            setStatus(
                "Traversal animation completed.",
                "success"
            );

            return;
        }

        lastTraversal.push(sequence[animationIndex]);

        animationIndex++;

        $("visitedCount").textContent =
            lastTraversal.length;

        renderGraph();

    }, 550);

}


// COMPARE BFS AND DFS

async function compareAlgorithms() {

    const bfs = await runAlgorithm(
        "BFS",
        { silent: true }
    );

    if (!bfs) return;

    const bfsText = `
Traversal: ${
        (bfs.traversal || [])
            .map(id => nodes[id]?.name ?? id)
            .join(" → ") || "None"
    }

Shortest path: ${
        (bfs.path || [])
            .map(id => nodes[id]?.name ?? id)
            .join(" → ") || "No route"
    }

Visited: ${(bfs.traversal || []).length}
Time: ${bfs.time || "—"}
`;

    $("bfsComparison").textContent = bfsText;


    const dfs = await runAlgorithm(
        "DFS",
        { silent: true }
    );

    if (!dfs) return;

    const dfsText = `
Traversal: ${
        (dfs.traversal || [])
            .map(id => nodes[id]?.name ?? id)
            .join(" → ") || "None"
    }

Shortest path: ${
        (dfs.path || [])
            .map(id => nodes[id]?.name ?? id)
            .join(" → ") || "No route"
    }

Visited: ${(dfs.traversal || []).length}
Time: ${dfs.time || "—"}
`;

    $("dfsComparison").textContent = dfsText;

    addHistory(
        "BFS + DFS comparison",
        Number($("startNode").value),
        Number($("endNode").value),
        bfs.pathFound || dfs.pathFound
    );

    setStatus(
        "BFS and DFS comparison completed.",
        "success"
    );

}


// RESET GRAPH

function resetGraph() {

    nodes = structuredClone(DEFAULT_NODES);
    edges = structuredClone(DEFAULT_EDGES);

    history = [];

    selectedAlgorithm = "BFS";

    $("bfsButton").classList.add("selected");
    $("dfsButton").classList.remove("selected");

    $("bfsButton").setAttribute("aria-pressed", "true");
    $("dfsButton").setAttribute("aria-pressed", "false");

    updateSelectors();

    $("startNode").value = "0";
    $("endNode").value = "5";

    $("edgeFrom").value = "0";
    $("edgeTo").value = "1";

    $("blockFrom").value = "0";
    $("blockTo").value = "1";

    renderHistory();

    clearResults(
        "The default PathPilot graph has been restored.",
        "success"
    );

}


// SELECT ALGORITHM

function selectAlgorithm(algorithm) {

    selectedAlgorithm = algorithm;

    const bfsSelected = algorithm === "BFS";

    $("bfsButton").classList.toggle(
        "selected",
        bfsSelected
    );

    $("dfsButton").classList.toggle(
        "selected",
        !bfsSelected
    );

    $("bfsButton").setAttribute(
        "aria-pressed",
        String(bfsSelected)
    );

    $("dfsButton").setAttribute(
        "aria-pressed",
        String(!bfsSelected)
    );

    setStatus(
        `${algorithm} selected. Choose your locations and find a route.`
    );

}


// EVENT LISTENERS

$("findRoute").addEventListener(
    "click",
    () => runAlgorithm(selectedAlgorithm)
);

$("bfsButton").addEventListener(
    "click",
    () => selectAlgorithm("BFS")
);

$("dfsButton").addEventListener(
    "click",
    () => selectAlgorithm("DFS")
);

$("animateRoute").addEventListener(
    "click",
    animateTraversal
);

$("addNodeButton").addEventListener(
    "click",
    addNode
);

$("nodeForm").addEventListener(
    "submit",
    createNode
);

$("cancelAddNode").addEventListener(
    "click",
    () => $("nodeDialog").close()
);

$("addEdgeButton").addEventListener(
    "click",
    addEdge
);

$("blockEdgeButton").addEventListener(
    "click",
    toggleEdge
);

$("compareButton").addEventListener(
    "click",
    compareAlgorithms
);

$("resetGraph").addEventListener(
    "click",
    resetGraph
);

$("clearHistory").addEventListener(
    "click",
    () => {
        history = [];
        renderHistory();
    }
);

$("startNode").addEventListener(
    "change",
    () => clearResults(
        "Start location changed. Run the algorithm again."
    )
);

$("endNode").addEventListener(
    "change",
    () => clearResults(
        "Destination changed. Run the algorithm again."
    )
);


// INITIALIZE APPLICATION

updateSelectors();

$("startNode").value = "0";
$("endNode").value = "5";

$("edgeFrom").value = "0";
$("edgeTo").value = "1";

$("blockFrom").value = "0";
$("blockTo").value = "1";

renderGraph();
renderHistory();