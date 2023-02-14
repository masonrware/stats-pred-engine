/**
 * Script to generate the contents of the list structure of the site.
 * Similarly to genGraph, it is responsible for generating stitched
 * together chunks of html to render to the page.
 *
 * genList.js
 * Version 1.0.0
 * 17-8-2022
 *
 * @author Mason R. Ware
 */

/**
 * Get the pertinent data to the selected item (group, subgroup, project).
 * It populates the persistent data structures.
 * @author    Mason R. Ware
 * @param     {String} param        The endpoint of the api call to make 
 *                                  to get data
 */
function getData(param) {
  fetch(`/${param}`)
    .then(async (res) => {
      const data = await res.json();
      DATA_NODES = data[0];
      DATA_EDGES = data[1];

      const repoList = document.getElementById('repoList');
      let html = constructList(DATA_NODES, DATA_EDGES);
      html.forEach((ele) => {
        repoList.innerHTML += ele;
      });
    })
    .catch((err) => {
      console.log(err);
    });
}

// get all data to generate full list
// this script can now be extended to search for other scopes
// of content to generate smaller lists
getData('all');

/**
 * Function to generate the list page by stitching together html elements
 * @author    Mason R. Ware
 * @param     {Array} DATA_NODES      persistent data of all nodes
 * @param     {Array} DATA_EDGES      persistent data of all edges
 */
const constructList = (DATA_NODES, DATA_EDGES) => {
  // construct three mother data sets
  let groups = {};
  let subgroups = {};
  let projects = {};

  // sort all nodes into above data sets
  DATA_NODES.forEach((node) => {
    if (node._data.type == 'group') groups[node.id] = node;
    else if (node._data.type == 'subgroup') subgroups[node.id] = node;
    else if (node._data.type == 'code') projects[node.id] = node;
  });

  // map object for a section of the list tab (each grey drop down on a
  // per-group basis)
  // mapping of group obj to list of descendant objects
  let groupChain = new Map();
  Object.keys(groups).forEach((key) => {
    let group = groups[key];
    groupChain.set(group, []);
    // find all the objects that immediately point to this group
    let descendants = DATA_EDGES.filter(
      (edge) => edge.to == group.id.toString()
    );
    descendants.forEach((desc) => {
      // if the descendant is a subgroup
      if (Object.keys(subgroups).includes(desc.id.toString())) {
        let subgroup = subgroups[desc.id.toString()];
        // find all of its descendants recursively
        let sg = findDescendants(DATA_EDGES, subgroups, projects, subgroup);
        groupChain.get(group).push(sg);
      // the descendant is a project
      } else if (Object.keys(projects).includes(desc.id.toString())) {
        let project = projects[desc.id.toString()];
        groupChain.get(group).push(project);
      }
    });
  });
  // cheap hack to write all the top level projects
  DATA_EDGES.forEach((edge) => {
    // if it is ownedby and it is a project, it is top level
    if (
      edge.label == 'ownedby' &&
      Object.keys(projects).includes(edge.id.toString())
    ) {
      // edge.id is the id of the from node
      groupChain.set(projects[edge.id.toString()], []);
    }
  });
  let finalCards = [];
  // map.foreach reverses key and value for some reason?
  groupChain.forEach((descendants, group) => {
    // create a collapsible using the group and its list of descendants
    finalCards.push(new CollapsibleCard(group, descendants).getCard());
  });
  return finalCards;
};

/**
 * Recursive function to search a subgroup for all of its descendants
 * 
 * Will filter out any unnecessary edges from DATA_EDGES (not in place)
 * and check the ids against the created data sets.
 * 
 * @author    Mason R. Ware
 * @param     {Array} DATA_EDGES      persistent data of all edges
 * @param     {Array} subgroups       data set of subgroups
 * @param     {Array} projects        data set of projects
 * @param     {Object} node           the target item (group, subgroup) to start with
 * @return    {Object} topSg          a Subgroup item that contains all of its descendants in attributes
 */
function findDescendants(DATA_EDGES, subgroups, projects, node) {
  let descendants = DATA_EDGES.filter((edge) => edge.to == node.id.toString());
  // base case is once all descendants are projects
  if (
    descendants.filter((desc) => projects[desc.id.toString()]).length ==
    descendants.length
  ) {
    let sg = new SubGroup(node);
    // make descendants into project objs and add them all to sg
    descendants
      .map((desc) => projects[desc.id.toString()])
      .forEach((desc) => sg.addItem(desc));
    return sg;
  } else {
    const topSg = new SubGroup(node);
    descendants.forEach((desc) => {
      //if descendant is a subgroup
      if (Object.keys(subgroups).includes(desc.id.toString())) {
        let subgroup = subgroups[desc.id.toString()];
        // take subgroup obj and find all of its descendants recursively, add the final
        // complete subgroup to the top-level subgroup
        let complete_subgroup = findDescendants(DATA_EDGES, subgroups, projects, subgroup);
        topSg.addItem(complete_subgroup);
      // if descendant is a project
      } else if (Object.keys(projects).includes(desc.id.toString())) {
        let project = projects[desc.id.toString()];
        topSg.addItem(project);
      }
    });
    return topSg;
  }
}

/**
 * Class for a single subgroup that houses descendants and itself
 */
class SubGroup {
  constructor(subgroup) {
    (this.subgroup = subgroup), (this.descendants = []);
  }

  addItem(node) {
    this.descendants.push(node);
  }
}

/**
 * Class for a collapsible card that houses the group it represents and all of the contents/
 * descendants of that group. The primary function, getCard(), is responsible for producing
 * an html blob that gets added to the list page.
 */
class CollapsibleCard {
  constructor(group, descendants) {
    (this.group = group), (this.rest = descendants);
  }
  /**
   * Driver function, calls utility functions to build a card and returns raw html string.
   * @author    Mason R. Ware
   * @return    {String} htmlRes    An html blob representing a complete collapsible card.
   */
  getCard() {
    let htmlRes = ``;
    let { name, url, description } = this.group;

    if (!description) description = 'No Gitlab Description';
    if (!url) url = 'No Gitlab URL';

    // if this object has descendants
    if (this.rest.length > 0) {
      // buffering (I am not a front-end dev :))
      htmlRes += `<br><br>`;
      // create a collapsible for top level proj
      htmlRes += groupCollapsible(name, description, url, 'icon');

      this.rest.forEach((desc) => {
        // if it is a project
        if (desc._data) {
          let { name, url, description, langs, add } = desc._data;
          if (!description) description = 'No Gitlab Description';
          if (!url) url = 'No Gitlab URL';

          htmlRes += projectModal(name, url, description);

          // populate langs table
          htmlRes += populateLangs(langs);
          // close langs table
          htmlRes += `</table></div>`;

          // populate errors table
          htmlRes += populateErrors(add);
          // close errors div
          htmlRes += `</ul></div>`;

          // close project collapsible
          htmlRes += `</details>`;

        // it is a subgroup
        } else {
          htmlRes += printSubGroup(desc, ``);
        }
      });
      // close group collapsible
      htmlRes += `</details>`;
      return htmlRes;

      // if it doesn't have descendants
    } else {
      // just add info and close card
      let { url, description, langs, add } = this.group._data;
      if (!description) description = 'No Gitlab Description';
      if (!url) url = 'No Gitlab URL';
      htmlRes += `<br>`;
      htmlRes += projectModal(name, url, description);
      // populate langs table
      htmlRes += populateLangs(langs);
      // close langs table
      htmlRes += `</table></div>`;

      // populate errors table
      htmlRes += populateErrors(add);
      // close errors div
      htmlRes += `</ul></div>`;

      // close group collapsible
      htmlRes += `</details>`;
      return htmlRes;
    }
  }
}

///////////////////UTILITY FUNCTIONS////////////////////

/**
 * Function that prints out the html of a subgroup card. There is no difference between a subgroup card
 * and a group card as of now. This function is recursive in order to effectively print the structure
 * of the subgroups' descendants.
 * @author    Mason R. Ware
 * @param     {String} sg           subgroup object to print
 * @param     {String} html         the html string to modify in place
 * @return    {String} html         the html that was received, modified in place
 */
function printSubGroup(sg, html) {
  let { name, description, url } = sg.subgroup._data;
  // generate a top level group collapsible but keep it unclosed
  html += groupCollapsible(name, description, url, 'subicon');
  const isProject = (item) => {
    return item.id ? true : false;
  };
  // base case is once all descendants are projects
  if (sg.descendants.every(isProject)) {
    sg.descendants.forEach((desc) => {
      let { name, url, description, langs, add } = desc._data;
      // create a project card to add to the open-ended group collapsible
      html += projectModal(name, url, description);

      // populate langs table
      html += populateLangs(langs);
      // close langs table
      html += `</table></div>`;

      // populate errors div
      html += populateErrors(add);
      // close errors div and project modal
      html += `</ul></div></details>`;
    });

    // close overall subgroup collapsible
    html += `</details>`;
    return html;
  } else {
    sg.descendants.forEach((desc) => {
      // it is a project
      if (desc._data) {
        let { name, url, description, langs, add } = desc._data;
        html += projectModal(name, url, description);

        // populate langs table
        html += populateLangs(langs);
        // close langs table
        html += `</table></div>`;

        // populate errors div
        html += populateErrors(add);
        // close errors div and project modal
        html += `</ul></div></details>`;

        // it is a subgroup
      } else {
        html = printSubGroup(desc, html);
      }
    });
  }
  // close collapsible for any subgroup card that was added
  html += `</details>`;
  return html;
}

/**
 * Function to create a top level group collapsible
 * @author    Mason R. Ware
 * @param     {String} name           the group name
 * @param     {String} description    the groups's gitlab description
 * @param     {String} url            the groups's gitlab url
 * @param     {String} iconClass      (not currently effective) choice of emoji to display on card
 * @return    {String} html           a new, open-ended html blob that starts off a group card in the list tab
 */
function groupCollapsible(name, description, url, iconClass) {
  return `<details style="padding:10px, margin:10px">
            <summary class="collapsible">
                ${name}
                <span class=${iconClass}>🐀</span>
                ${graphButton(name)}
            </summary>
            <a src="${url}"></a>`;
}

/**
 * Function to create a top level group collapsible
 * @author    Mason R. Ware
 * @param     {String} name           the item name (group, subgroup, project)
 * @return    {String} html           an html button element for triggering the creation of a graph
 *                                    Called on a per-item (group, subgroup, project) basis
 */
function graphButton(name) {
  return `<a href="/graph?name=${name}" target="_blank"><button style="float: right;" class="button button4">${name}</button></a>`;
}

/**
 * Function to create a top level group collapsible
 * @author    Mason R. Ware
 * @param     {String} name           the project name
 * @param     {String} description    the project's gitlab description
 * @param     {String} url            the project's gitlab url
 * @return    {String} html           a new, open-ended html blob that represents a project. To be filled by 
 */
function projectModal(name, description, url) {
  return `<details style="background-color:gray">
  <summary class="subcollapsible">
      ${name}
      <span class="icon"></span>
  </summary>
  
  <p>${description}</p>

  <form target="_blank" action="${description}">
      <input type="submit" value="Go to Project" />
  </form>`;
}

/**
 * Function to create a langs table
 * @author    Mason R. Ware
 * @param     {Array} langs          array of lang, percent objects
 * @return    {String} html          an html blob of a langs table
 */
function populateLangs(langs) {
  let htmlRes = `<div style="left-align:auto; border:1px solid black; overflow:hidden; background-color:#adad85">
              <h1>Langs</h1>
              <table style="border: 1px dotted black">`;
  if (langs.length > 0) {
    htmlRes += `<tr><th style="border:1px solid black;">Language</th><th style="border:1px solid black;">Percent</th></tr>`;
    langs.forEach((langObj) => {
      htmlRes += `<tr><td>${langObj.name}</td><td style="border: thick double black;">${langObj.percent}%</td></tr>`;
    });
  } else {
    htmlRes += `<tr><th>No Languages Found</th></tr>`;
  }
  return htmlRes;
}

/**
 * Function to create a top level group collapsible
 * @author    Mason R. Ware
 * @param     {Array} add             array of errors found by scraper
 * @return    {String} html           an html blob of an errors table
 */
function populateErrors(add) {
  let htmlRes = ``;
  htmlRes += `<div style="left-align:auto; border:1px solid black; overflow:hidden; background-color:#cc0000; overflow: scroll;"><h1>Errors</h1><ul>`;
  if (add.length > 0) {
    add.forEach((addObj) => {
      htmlRes += `<li>${addObj.file}</li><sli><strong>${addObj.message}</strong></sli>`;
    });
  } else {
    htmlRes += `<h4>No Missing Files Found</h4>`;
  }
  return htmlRes;
}

module.exports = constructList;
