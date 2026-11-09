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
    int start
) {
    vector<int> order;
    vector<bool> visited(graph.size(), false);
    queue<int> q;

    visited[start] = true;
    q.push(start);

    while (!q.empty()) {
        int u = q.front();
        q.pop();

        order.push_back(u);

        for (int v : graph[u]) {
            if (!visited[v]) {
                visited[v] = true;
                q.push(v);
            }
        }
    }

    return order;
}

vector<int> dfsTraversal(
    const vector<vector<int>>& graph,
    int start
) {
    vector<int> order;
    vector<bool> visited(graph.size(), false);
    stack<int> st;

    st.push(start);

    while (!st.empty()) {
        int u = st.top();
        st.pop();

        if (visited[u]) continue;

        visited[u] = true;
        order.push_back(u);

        for (auto it = graph[u].rbegin();
             it != graph[u].rend(); ++it) {

            if (!visited[*it]) {
                st.push(*it);
            }
        }
    }

    return order;
}

vector<int> shortestPath(
    const vector<vector<int>>& graph,
    int start,
    int destination
) {
    vector<int> parent(graph.size(), -1);
    vector<bool> visited(graph.size(), false);
    queue<int> q;

    visited[start] = true;
    q.push(start);

    while (!q.empty()) {
        int u = q.front();
        q.pop();

        if (u == destination) break;

        for (int v : graph[u]) {
            if (!visited[v]) {
                visited[v] = true;
                parent[v] = u;
                q.push(v);
            }
        }
    }

    if (!visited[destination]) {
        return {};
    }

    vector<int> path;

    for (int at = destination; at != -1; at = parent[at]) {
        path.push_back(at);
    }

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

    vector<int> traversal;

    if (choice == "BFS") {
        traversal = bfsTraversal(graph, start);
    } else {
        traversal = dfsTraversal(graph, start);
    }

    vector<int> path = shortestPath(
        graph,
        start,
        destination
    );

    auto finish = chrono::high_resolution_clock::now();

    double elapsed =
        chrono::duration<double, milli>(finish - begin).count();

    printList(choice + " Traversal: ", traversal);
    printList("Shortest Path: ", path);

    cout << "Path Found: "
         << (path.empty() ? "No" : "Yes") << '\n';

    cout << "Execution Time: " << elapsed << " ms\n";

    return 0;
}