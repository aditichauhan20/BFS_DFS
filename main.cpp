#include <iostream>
#include <vector>
#include <queue>
#include <stack>
#include <chrono>
#include <string>
#include <algorithm>

using namespace std;

vector<int> bfsTraversal(
    const vector<vector<int>>& graph,
    int start,
    vector<int>& parent
) {
    vector<int> order;
    vector<bool> visited(graph.size(), false);
    queue<int> q;

    parent.assign(graph.size(), -1);
    parent[start] = start;
    visited[start] = true;
    q.push(start);

    while (!q.empty()) {
        int u = q.front();
        q.pop();

        order.push_back(u);

        for (int v : graph[u]) {
            if (!visited[v]) {
                visited[v] = true;
                parent[v] = u;
                q.push(v);
            }
        }
    }

    return order;
}

vector<int> dfsTraversal(
    const vector<vector<int>>& graph,
    int start,
    vector<int>& parent
) {
    vector<int> order;
    vector<bool> visited(graph.size(), false);
    stack<pair<int, size_t>> st;

    parent.assign(graph.size(), -1);
    parent[start] = start;
    visited[start] = true;
    order.push_back(start);
    st.push({start, 0});

    while (!st.empty()) {
        int u = st.top().first;
        size_t& nextNeighbour = st.top().second;

        if (nextNeighbour == graph[u].size()) {
            st.pop();
            continue;
        }

        int v = graph[u][nextNeighbour++];
        if (visited[v]) continue;

        visited[v] = true;
        parent[v] = u;
        order.push_back(v);
        st.push({v, 0});
    }

    return order;
}

vector<int> buildPath(
    const vector<int>& parent,
    int start,
    int destination
) {
    if (parent[destination] == -1) return {};

    vector<int> path;

    for (int at = destination; at != start; at = parent[at]) {
        path.push_back(at);
    }

    path.push_back(start);
    reverse(path.begin(), path.end());

    return path;
}

void printList(
    const string& label,
    const vector<int>& values
) {
    cout << label;

    if (values.empty()) {
        cout << "None";
    } else {
        for (size_t i = 0; i < values.size(); i++) {
            if (i > 0) cout << " -> ";
            cout << values[i];
        }
    }

    cout << '\n';
}

int main() {

    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;

    if (!(cin >> n >> m)) {
        cout << "ERROR: Invalid input format.\n";
        return 0;
    }

    if (n < 1 || n > 500 || m < 0 || m > 10000) {
        cout << "ERROR: Invalid number of locations or connections.\n";
        return 0;
    }

    vector<vector<int>> graph(n);

    for (int i = 0; i < m; i++) {

        int u, v;

        if (!(cin >> u >> v)) {
            cout << "ERROR: Incomplete connection data.\n";
            return 0;
        }

        if (u < 0 || u >= n ||
            v < 0 || v >= n ||
            u == v) {

            cout << "ERROR: Invalid connection ID.\n";
            return 0;
        }

        graph[u].push_back(v);
        graph[v].push_back(u);
    }

    int start, destination;
    string choice;

    if (!(cin >> start >> destination >> choice)) {
        cout << "ERROR: Missing route information.\n";
        return 0;
    }

    if (start < 0 || start >= n ||
        destination < 0 || destination >= n) {

        cout << "ERROR: Start or destination ID is invalid.\n";
        return 0;
    }

    if (choice != "BFS" && choice != "DFS") {
        cout << "ERROR: Choose BFS or DFS.\n";
        return 0;
    }

    for (auto& neighbours : graph) {
        sort(neighbours.begin(), neighbours.end());
    }

    auto begin = chrono::high_resolution_clock::now();

    vector<int> parent;
    vector<int> traversal;

    if (choice == "BFS") {
        traversal = bfsTraversal(graph, start, parent);
    } else {
        traversal = dfsTraversal(graph, start, parent);
    }

    vector<int> path = buildPath(
        parent,
        start,
        destination
    );

    auto finish = chrono::high_resolution_clock::now();

    double elapsed =
        chrono::duration<double, milli>(finish - begin).count();

    printList(choice + " Traversal: ", traversal);
    printList("Route: ", path);

    cout << "Path Found: "
         << (path.empty() ? "No" : "Yes") << '\n';

    cout << "Execution Time: " << elapsed << " ms\n";

    return 0;
}