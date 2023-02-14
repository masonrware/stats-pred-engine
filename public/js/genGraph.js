/**
 * The script used to generate a graph using the VIS.js library on a
 * specific item (group, subgroup, project). The script keeps two primary
 * data structures: DATA_NODES and DATA_EDGES which represent all the
 * contents of the generated graph.
 *
 * Due to performance issues with Vis.JS, generating a graph for all repositories
 * in the company is extremely inefficient and slow. Therefore, to combat this,
 * the implementation of graphing is on a per-group/subgroup/project basis. It
 * is up to the user to select which item/hierarchy of items they want to see
 * visualized.
 *
 * The script is functional: it is run on page load as the graph is given
 * its own document and tab in the browser.
 *
 * [NOTE!] Ivan had a framework in place to build out flows on the visualization
 * component. This change was shelved in the process of adapting the script.
 * The code for this functionality should still work (have not tested this)
 * with slight modification; it is left commented out in certain places.
 *
 * genGraph.js
 * Version 2.0.0
 * 17-8-2022
 *
 * @author Ivan Kougaenko & Mason R. Ware
 */

// create vis data sets
var nodes = new vis.DataSet();
var edges = new vis.DataSet();

// create a vis network
const container = document.getElementById('graph');
const details = document.getElementById('details');

/**
 * Function to get all the data pertinent to this graph generation.
 * Creates the aforementioned central data structures.
 * @author    Mason R. Ware
 */
function getData() {
  // get the pertinent subject of graphing from the document
  let params = new URLSearchParams(document.location.search);
  let name = params.get('name');
  // make a call to the tree endpoint of the API to get back
  // graph-able contents
  fetch(`/tree/${name}`)
    .then(async (res) => {
      const data = await res.json();
      DATA_NODES = data[0];
      DATA_EDGES = data[1];
      constructGraph();
    })
    .catch((err) => {
      console.log(err);
    });
}

// Populate data structures
getData();

/**
 * Create a graph in Vis using the pre-populated data structures above
 * @author    Mason R. Ware
 */
const constructGraph = () => {
  DATA_NODES.forEach((item) => {
    // construct node objects for more in depth use with visualization
    const nodeData = {
      id: item.id,
      color: item.color,
      label: `<b>${item._data.type}</b>\n${item.name}`,
      font: { align: 'left', multi: 'html' },
      shape: 'box',
      _data: item._data
    };
    // not replacing the item in DATA_NODES as it is used persistently
    // by other parts of the code
    nodes.add(nodeData);

    // FLOW CODE:
    // if (item._data.type === 'flow' && 'flow' in item._data === false) { //show flow nodes differently from others
    // 	nodeData.hidden = item.hidden;
    // 	nodeData.label = item.name;
    // }
    // if (item._data.type === 'flow' && 'flow' in item._data === true) {
    // 	nodeData.label = `<b>${item.name}</b>\nflowcharts:${DATA_EDGES.filter(edge => edge.from === item.id && edge.type === 'flowchart').length}`;
    // }
  });

  // search bar parameters
  const nodeFilterSelector = document.getElementById('nodeFilterSelect');
  const nodeFilterText = document.getElementById('txtFilter');
  const selectForm = document.querySelector('#selectForm');

  /**
   * Filter nodes data structure based off of search params above.
   * Function should return true or false based on whether the item in
   * DataView satisfies a given condition.
   * @author    Ivan Kougaenko & Mason R. Ware
   * @param     {Object} node     Vis.JS convention, this function will
   */
  const nodesFilter = (node) => {
    let select = false;
    let text = true;

    if (nodeFilterSelector.value === '') {
      select = true;
    }
    if (node._data.type == nodeFilterSelector.value) {
      select = true;
    }

    // FLOW CODE:
    // if (nodeFilterSelector.value === 'flow' && 'flow' in node._data) {
    // 	select = true;
    // }

    if (nodeFilterText.value) {
      if (
        node._data.name
          .toLowerCase()
          .includes(nodeFilterText.value.toLowerCase()) == false
      ) {
        text = false;
      } else {
        text = true;
      }
    }
    return select & text;
  };

  const nodesView = new vis.DataView(nodes, { filter: nodesFilter });
  // no need to filter edges.. keeping it for future reference commented out.
  // const edgesView = new vis.DataView(edges, { filter: edgesFilter })

  // create graph with data
  const graph = {
    nodes: nodesView,
    edges: DATA_EDGES
  };

  const options = {
    layout: {
      improvedLayout: false
    }
  };

  // unify the vis Network
  const network = new vis.Network(container, graph, options);

  /**
   * Function for rendering selected data: status report, link, etc...
   * It works to build an html response and append that to the page.
   * @author    Mason R. Ware
   * @param     {String} params       Vis-fed object of result of selecting a node
   */
  network.on('select', function (params) {
    // FLOW CODE:
    // const flowchartsToRender = [];

    html = '';

    // generate html response
    params.nodes.forEach((nodeid) => {
      const node = nodes.get(nodeid);
      html += generateHTML(node);

      // FLOW CODE:
      // // toggle flowchart(s).  flowcharts are hidden by default.
      // if ('flow' in node._data === true) {
      // 	// check for edges
      // 	flowchartsToRender.push(node.id);
      // }
    });

    // render html in side window
    details.innerHTML = html;

    // FLOW CODE:
    // //graph.nodes is DataView, it's better to work on a DataSet
    // const nodesDS = graph.nodes.getDataSet();
    // //toggle flowchart hidden state
    // flowchartsToRender.forEach(fnid => {
    // 	nodesDS.get().filter(node => node._data.pid === fnid).forEach(fnode => {
    // 		nodesDS.update({ ...fnode, hidden: !fnode.hidden });
    // 	})
    // });
  });

  /**
   * Generate the HTML response to be rendered alongside the visualization.
   * @author    Mason R. Ware
   * @param     {String} JSONobj      A JSON blob of the selected node's metadata
   * @return    {String} htmlRES      Chunks of HTML code stitched together that represent object metadata
   */
  // TODO use the unused attributes
  function generateHTML(JSONobj) {
    let {
      type,
      name,
      description,
      url,
      forks_count,
      star_count,
      created_at,
      last_activity_at,
      langs,
      add
    } = JSONobj._data;
    let htmlRES = `<h1>${name}</h1><h2>${type}</h2>
		<h5>${description}</h5><a href=${url} target="_blank">Gitlab Link</a>
		<div style="left-align:auto; border:1px solid black; overflow:hidden; background-color:#adad85"><h1>Langs</h1><table style="border: 1px dotted black">`;

    // if there are one or more languages present in the project
    if (langs.length > 0) {
      htmlRES += `<tr><th style="border:1px solid black;">Language</th><th style="border:1px solid black;">Percent</th></tr>`;
      langs.forEach((langObj) => {
        htmlRES += `<tr><td>${langObj.name}</td><td style="border: thick double black;">${langObj.percent}%</td></tr>`;
      });
    } else {
      htmlRES += `<tr><th>No Languages Found</th></tr>`;
    }
    // close above div and table
    htmlRES += `</table></div><br>`;

    // div for errors found
    htmlRES += `<div style="left-align:auto; border:1px solid black; overflow:hidden; background-color:#cc0000; overflow: scroll;"><h1>Errors</h1><ul>`;
    if (add.length > 0) {
      add.forEach((addObj) => {
        htmlRES += `<li>${addObj.file}</li><sli><strong>${addObj.message}</strong></sli>`;
      });
    } else {
      htmlRES += `</ul><h4>No Missing Files Found</h4>`;
    }
    // close errors div
    htmlRES += `</ul></div><br>`;

    return htmlRES;
  }

  //update filter list with all available types
  const node_types = [...new Set(DATA_NODES.map((n) => n._data.type))];

  node_types.forEach((t) => {
    nodeFilterSelector.add(new Option(t, t));
  });

  function updateGraph() {
    nodesView.refresh();
  }

  selectForm.addEventListener('submit', (event) => {
    event.preventDefault();
    updateGraph();
  });

  nodeFilterSelector.addEventListener('change', (event) => {
    event.preventDefault();
    updateGraph();
  });
};
