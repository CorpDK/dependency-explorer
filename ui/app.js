class DependencyGraph {
  constructor() {
    this.data = null;
    this.simulation = null;
    this.svg = null;
    this.container = null;
    this.nodes = [];
    this.links = [];
  }

  async init() {
    try {
      await this.loadData();
      this.hideLoading();
      this.setupUI();
      this.render();
      this.updateStats();
    } catch (error) {
      this.showError(error);
    }
  }

  async loadData() {
    try {
      const response = await fetch("graph.json");
      if (!response.ok) {
        throw new Error(`Failed to load graph.json: ${response.statusText}`);
      }
      const rawData = await response.json();
      this.data = this.transformData(rawData);
    } catch (error) {
      throw new Error(`Error loading dependency data: ${error.message}`);
    }
  }

  transformData(rawData) {
    const nodes = [];
    const links = [];
    const nodeMap = new Map();

    if (!rawData.nodes || typeof rawData.nodes !== "object") {
      throw new Error("Invalid graph.json format: missing nodes object");
    }

    Object.entries(rawData.nodes).forEach(([name, info], index) => {
      const node = {
        id: name,
        explicit: info.explicit || false,
        depends_on: info.depends_on || [],
        required_by: info.required_by || [],
      };
      nodes.push(node);
      nodeMap.set(name, index);
    });

    nodes.forEach((node) => {
      node.depends_on.forEach((dep) => {
        if (nodeMap.has(dep)) {
          links.push({
            source: node.id,
            target: dep,
          });
        }
      });
    });

    this.nodes = nodes;
    this.links = links;

    return { nodes, links };
  }

  setupUI() {
    const svg = d3.select("#graph");
    const container = svg.append("g");

    this.svg = svg;
    this.container = container;

    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    document.getElementById("close-sidebar").addEventListener("click", () => {
      this.closeSidebar();
    });
  }

  render() {
    const width = document.getElementById("graph-container").clientWidth;
    const height = document.getElementById("graph-container").clientHeight;

    const link = this.container
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(this.links)
      .join("line")
      .attr("class", "link");

    const node = this.container
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(this.nodes)
      .join("circle")
      .attr("class", (d) => (d.explicit ? "node explicit" : "node dependency"))
      .attr("r", 6)
      .on("click", (event, d) => {
        event.stopPropagation();
        this.showPackageDetails(d);
      })
      .call(this.drag());

    node.append("title").text((d) => d.id);

    const simulation = d3
      .forceSimulation(this.nodes)
      .force(
        "link",
        d3
          .forceLink(this.links)
          .id((d) => d.id)
          .distance(50)
      )
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(15));

    if (this.nodes.length > 500) {
      simulation.alphaDecay(0.05);
    }

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    });

    this.simulation = simulation;

    window.addEventListener("resize", () => {
      const newWidth = document.getElementById("graph-container").clientWidth;
      const newHeight = document.getElementById("graph-container").clientHeight;
      simulation.force("center", d3.forceCenter(newWidth / 2, newHeight / 2));
      simulation.alpha(0.3).restart();
    });
  }

  drag() {
    function dragstarted(event) {
      if (!event.active) this.simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) this.simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3
      .drag()
      .on("start", dragstarted.bind(this))
      .on("drag", dragged.bind(this))
      .on("end", dragended.bind(this));
  }

  showPackageDetails(node) {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.remove("hidden");

    const details = document.getElementById("package-details");

    const depsList =
      node.depends_on.length > 0
        ? node.depends_on
            .map((dep) => `<li>${this.escapeHtml(dep)}</li>`)
            .join("")
        : '<div class="empty-list">No dependencies</div>';

    const reqsList =
      node.required_by.length > 0
        ? node.required_by
            .map((req) => `<li>${this.escapeHtml(req)}</li>`)
            .join("")
        : '<div class="empty-list">Not required by any package</div>';

    details.innerHTML = `
            <h2>${this.escapeHtml(node.id)}</h2>
            <div class="detail-section">
                <strong>Package Type</strong>
                <span class="badge ${
                  node.explicit ? "explicit" : "dependency"
                }">
                    ${node.explicit ? "Explicitly Installed" : "Dependency"}
                </span>
            </div>
            <div class="detail-section">
                <strong>Dependencies (${node.depends_on.length})</strong>
                ${
                  node.depends_on.length > 0
                    ? "<ul>" + depsList + "</ul>"
                    : depsList
                }
            </div>
            <div class="detail-section">
                <strong>Required By (${node.required_by.length})</strong>
                ${
                  node.required_by.length > 0
                    ? "<ul>" + reqsList + "</ul>"
                    : reqsList
                }
            </div>
        `;
  }

  closeSidebar() {
    document.getElementById("sidebar").classList.add("hidden");
  }

  updateStats() {
    const total = this.nodes.length;
    const explicit = this.nodes.filter((n) => n.explicit).length;
    const dependencies = total - explicit;

    document.getElementById(
      "package-count"
    ).textContent = `${total} packages (${explicit} explicit, ${dependencies} dependencies)`;
  }

  hideLoading() {
    const loading = document.getElementById("loading");
    if (loading) {
      loading.style.display = "none";
    }
  }

  showError(error) {
    console.error(error);
    const loading = document.getElementById("loading");
    loading.innerHTML = `
            <div class="error">
                <strong>Error loading graph</strong><br>
                ${this.escapeHtml(error.message)}<br><br>
                <small>Make sure graph.json exists and is valid JSON.</small>
            </div>
        `;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const graph = new DependencyGraph();
  await graph.init();
});
