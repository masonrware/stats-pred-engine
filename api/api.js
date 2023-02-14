/**
 * A RESTful API for providing project data extracted from the cache
 *
 * The API provides functionality to get data on any level: group, subgroup, project
 * It can also provide the tree structure of any of the above listed items' descendants,
 * a service that is utilized in the graphing mechanic of GitRat, present in
 * public/js/genGraph.js
 *
 *
 * api.js
 * Version 1.0.0
 * 17-8-2022
 *
 * @author Mason R. Ware
 */

const { Cache, autoUpdate } = require('../cache');

// call cache autoupdate
autoUpdate();

module.exports = function (router) {
  /**
   * An endpoint to get a catalog of all items
   * @author    Mason R. Ware
   * @param     {String} selector     Name of a type of category to
   *                                  get a catalog of (group, subgroup, project or none)
   * @return    {String} catalogData  A response body of JSON data
   */
  router.get('/catalog/:selector?/', async function (req, res) {
    let data = await Cache.check('gitrat');
    let DATA_NODES = data.Body.nodes;

    let catalogData = { id: ['name', 'type'] };
    // return all items
    if (!req.params.selector) {
      DATA_NODES.forEach((node) => {
        let type;
        if (node._data.type == 'code') type = 'project';
        else type = node._data.type;
        catalogData[node.id] = [node.name, type];
      });
      res.send(catalogData);
      // return all groups
    } else if (req.params.selector == 'groups') {
      DATA_NODES.forEach((node) => {
        if (node._data.type == 'group')
          catalogData[node.id] = [node.name, 'group'];
      });
      res.send(catalogData);
      // return all subgroups
    } else if (req.params.selector == 'subgroups') {
      DATA_NODES.forEach((node) => {
        if (node._data.type == 'subgroup')
          catalogData[node.id] = [node.name, 'subgroup'];
      });
      res.send(catalogData);
      // return all projects
    } else if (req.params.selector == 'projects') {
      DATA_NODES.forEach((node) => {
        if (node._data.type == 'code')
          catalogData[node.id] = [node.name, 'project'];
      });
      res.send(catalogData);
    } else {
      res.send({
        timestamp: new Date().toISOString(),
        status: 404,
        error: 'Not Found',
        message:
          'Your request to the catalog endpoint includes invalid paramters',
        path: req.originalUrl
      });
    }
  });

  /**
   * An endpoint to get all data
   * Used in populating the list tab
   * @author    Mason R. Ware
   * @return    {Array} [DATA_NODES, DATA_EDGES]  A tuple of all nodes and
   *                                              connections between nodes
   */
  router.get('/all/', async function (req, res) {
    let data = await Cache.check('gitrat');
    let DATA_NODES = data.Body.nodes;
    let DATA_EDGES = data.Body.edges;
    res.send([DATA_NODES, DATA_EDGES]);
  });

  /**
   * GROUPS
   */

  /**
   * An endpoint to get aal groups
   * @author    Mason R. Ware
   * @return    {String} catalogData  A response body of JSON data
   */
  router.get('/groups/all/', async function (req, res) {
    let data = await Cache.check('gitrat');
    let DATA_NODES = data.Body.nodes;

    let groups = { GROUP_NODES: [] };
    DATA_NODES.forEach((node) => {
      if (node._data.type == 'group') groups.GROUP_NODES.push(node._data);
    });
    res.send(groups);
  });

  /**
   * An endpoint to get a gitlab group by name
   * @author    Mason R. Ware
   * @param     {String} name         Name of the desired group
   * @return    {String} result       A response body of JSON data
   */
  router.get('/groups/name/:name?', async function (req, res) {
    if (req.params.name) {
      let result = await Cache.nameSearch('gitrat', req.params.name);
      if (Object.keys(result).length > 0) res.send(result);
      else
        res.send({
          timestamp: new Date().toISOString(),
          status: 404,
          error: 'Not Found',
          message:
            'Your request to the groups endpoint contains a group name that does not exist',
          path: req.originalUrl
        });
    } else {
      res.send({
        timestamp: new Date().toISOString(),
        status: 422,
        error: 'Unprocessable Entity',
        message:
          'Your request to the groups name endpoint is missing optional parameters',
        path: req.originalUrl
      });
    }
  });

  /**
   * An endpoint to get a gitlab group by id
   * @author    Mason R. Ware
   * @param     {String} id           Gitlab id of the desired group
   * @return    {String} result       A response body of JSON data
   */
  router.get('/groups/id/:id?', async function (req, res) {
    if (req.params.id) {
      let result = await Cache.idSearch('gitrat', req.params.id);
      if (Object.keys(result).length > 0) res.send(result);
      else
        res.send({
          timestamp: new Date().toISOString(),
          status: 404,
          error: 'Not Found',
          message:
            'Your request to the groups endpoint contains a group id that does not exist',
          path: req.originalUrl
        });
    } else {
      res.send({
        timestamp: new Date().toISOString(),
        status: 422,
        error: 'Unprocessable Entity',
        message:
          'Your request to the groups id endpoint is missing optional parameters',
        path: req.originalUrl
      });
    }
  });

  /**
   * SUBGROUPS
   */

  /**
   * An endpoint to get all subgroups
   * @author    Mason R. Ware
   * @return    {String} groups     A response body of JSON data
   */
  router.get('/subgroups/all/', async function (req, res) {
    let data = await Cache.check('gitrat');
    let DATA_NODES = data.Body.nodes;

    let groups = { SUBGROUP_NODES: [] };
    DATA_NODES.forEach((node) => {
      if (node._data.type == 'subgroup') groups.SUBGROUP_NODES.push(node);
    });
    res.send(groups);
  });

  /**
   * An endpoint to get a gitlab subgroup by name
   * @author    Mason R. Ware
   * @param     {String} name         Name of the desired subgroup
   * @return    {String} result       A response body of JSON data
   */
  router.get('/subgroups/name/:name?', async function (req, res) {
    if (req.params.name) {
      let result = await Cache.nameSearch('gitrat', req.params.name);
      if (Object.keys(result).length > 0) res.send(result);
      else
        res.send({
          timestamp: new Date().toISOString(),
          status: 404,
          error: 'Not Found',
          message:
            'Your request to the subgroups endpoint contains a group name that does not exist',
          path: req.originalUrl
        });
    } else {
      res.send({
        timestamp: new Date().toISOString(),
        status: 422,
        error: 'Unprocessable Entity',
        message:
          'Your request to the subgroups name endpoint is missing optional parameters',
        path: req.originalUrl
      });
    }
  });

  /**
   * An endpoint to get a gitlab subgroup by id
   * @author    Mason R. Ware
   * @param     {String} id           Gitlab id of the desired subgroup
   * @return    {String} result       A response body of JSON data
   */
  router.get('/subgroups/id/:id?', async function (req, res) {
    if (req.params.id) {
      let result = await Cache.idSearch('gitrat', req.params.id);
      if (Object.keys(result).length > 0) res.send(result);
      else
        res.send({
          timestamp: new Date().toISOString(),
          status: 404,
          error: 'Not Found',
          message:
            'Your request to the subgroups endpoint contains a group id that does not exist',
          path: req.originalUrl
        });
    } else {
      res.send({
        timestamp: new Date().toISOString(),
        status: 422,
        error: 'Unprocessable Entity',
        message:
          'Your request to the subgroups id endpoint is missing optional parameters',
        path: req.originalUrl
      });
    }
  });

  /**
   * PROJECTS
   */

  /**
   * An endpoint to get all projects
   * @author    Mason R. Ware
   * @return    {String} groups     A response body of JSON data
   */
  router.get('/projects/all/', async function (req, res) {
    let data = await Cache.check('gitrat');
    let DATA_NODES = data.Body.nodes;

    let projects = { PROJECT_NODES: [] };
    DATA_NODES.forEach((node) => {
      if (node._data.type == 'code') projects.PROJECT_NODES.push(node);
    });
    res.send(projects);
  });

  /**
   * An endpoint to get a gitlab project by name
   * @author    Mason R. Ware
   * @param     {String} name         Name of the desired project
   * @return    {String} result       A response body of JSON data
   */
  router.get('/projects/name/:name?', async function (req, res) {
    if (req.params.name) {
      let result = await Cache.nameSearch('gitrat', req.params.name);
      if (Object.keys(result).length > 0) res.send(result);
      else
        res.send({
          timestamp: new Date().toISOString(),
          status: 404,
          error: 'Not Found',
          message:
            'Your request to the projects endpoint contains a project name that does not exist',
          path: req.originalUrl
        });
    } else {
      res.send({
        timestamp: new Date().toISOString(),
        status: 422,
        error: 'Unprocessable Entity',
        message:
          'Your request to the projects name endpoint is missing optional parameters',
        path: req.originalUrl
      });
    }
  });

  /**
   * An endpoint to get a gitlab project by id
   * @author    Mason R. Ware
   * @param     {String} id           Gitlab id of the desired project
   * @return    {String} result       A response body of JSON data
   */
  router.get('/projects/id/:id?', async function (req, res) {
    if (req.params.id) {
      let result = await Cache.idSearch('gitrat', req.params.id);
      if (Object.keys(result).length > 0) res.send(result);
      else
        res.send({
          timestamp: new Date().toISOString(),
          status: 404,
          error: 'Not Found',
          message:
            'Your request to the projects endpoint contains a group id that does not exist',
          path: req.originalUrl
        });
    } else {
      res.send({
        timestamp: new Date().toISOString(),
        status: 422,
        error: 'Unprocessable Entity',
        message:
          'Your request to the projects id endpoint is missing optional parameters',
        path: req.originalUrl
      });
    }
  });

  /**
   * An endpoint to get a tree of descendants given any named item
   * (group, subgroup, or project). This will return the mono line
   * from root to item, listing only the direct ancestors and then
   * listing all descendants using the Cache method, findDescendants.
   *
   * @author    Mason R. Ware
   * @param     {String} name         Name of an entity to construct tree around
   * @return    {String} result       A response body of JSON data
   */
  router.get('/tree/:name?', async function (req, res) {
    let data = await Cache.check('gitrat');
    let DATA_NODES = data.Body.nodes;
    let DATA_EDGES = data.Body.edges;

    if (req.params.name) {
      let desc = await Cache.findDescendants('gitrat', req.params.name);
      // if there is an (almost) equal number of child nodes and edges
      // (the -1 reflects the presence of the resource node)
      if (desc.nodes.length - 1 === desc.edges.length)
        res.send([desc.nodes, desc.edges]);
      else
        res.send({
          timestamp: new Date().toISOString(),
          status: 404,
          error: 'Not Found',
          message:
            'Your request to the tree endpoint contains an entity name that is a project',
          path: req.originalUrl
        });
    } else {
      // send all node and edge data
      res.send([DATA_NODES, DATA_EDGES]);
    }
  });
};