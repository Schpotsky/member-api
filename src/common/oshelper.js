/**
 * This file defines helper methods for dealing with Opensearch
 */
const _ = require('lodash')
const config = require('config')
const { BOOLEAN_OPERATOR } = require('../../app-constants')

/**
 * Fetch members profile from OS
 * @param {Object} query the HTTP request query
 * @returns {Object} members and total
 */
async function getMembers (query, osClient, currentUser) {
  const handles = _.isArray(query.handles) ? query.handles : []
  const handlesLower = _.isArray(query.handlesLower) ? query.handlesLower : []
  var userIds = _.isArray(query.userIds) ? query.userIds : []
  // construct OS query for members profile
  let osQueryMembers = {
    index: config.get('OS.MEMBER_PROFILE_OS_INDEX'),
    type: config.get('OS.MEMBER_PROFILE_OS_TYPE'),
    size: query.perPage,
    from: (query.page - 1) * query.perPage,
    body: {
      sort: [{ handle: { order: query.sort } }]
    }
  }
  const boolQueryMembers = []
  if (query.userId) {
    boolQueryMembers.push({ match_phrase: { userId: query.userId } })
  }
  if (query.handleLower) {
    boolQueryMembers.push({ match_phrase: { handleLower: query.handleLower } })
  }
  if (query.handle) {
    boolQueryMembers.push({ match_phrase: { handle: query.handle } })
  }
  if (query.email) {
    boolQueryMembers.push({ match_phrase: { email: query.email } })
  }
  if (userIds.length > 0) {
    boolQueryMembers.push({ query: { terms: { userId: userIds } } })
  }
  if (handlesLower.length > 0) {
    boolQueryMembers.push({ query: { terms: { handleLower: handlesLower } } })
  }
  if (handles.length > 0) {
    boolQueryMembers.push({ query: { terms: { handle: handles } } })
  }
  boolQueryMembers.push({ match_phrase: { status: 'ACTIVE' } })
  if (boolQueryMembers.length > 0) {
    osQueryMembers.body.query = {
      bool: {
        filter: boolQueryMembers
      }
    }
  }
  // search with constructed query
  const docsMembers = await osClient.search(osQueryMembers).body
  return docsMembers
}

/**
 * Search members by skills
 * @param {Object} query the HTTP request query
 * @returns {Object} members skills
 */
async function searchBySkills (query, osClient) {
  // construct OS query for skills
  const osQuerySkills = {
    index: config.get('OS.MEMBER_SKILLS_)S_INDEX'),
    body: {
      sort: [{ userHandle: { order: query.sort } }]
    }
  }
  const boolQuerySkills = []

  if (query.handlesLower) {
    boolQuerySkills.push({ query: { terms: { handleLower: query.handlesLower } } })
  }
  osQuerySkills.body.query = {
    bool: {
      filter: boolQuerySkills
    }
  }
  // search with constructed query
  const docsSkills = await osClient.search(osQuerySkills).body
  return docsSkills
}

/**
 * Fetch members skills from OS
 * @param {Object} query the HTTP request query
 * @returns {Object} members skills
 */
async function getMembersSkills (query, osClient) {
  // construct OS query for skills
  const osQuerySkills = {
    index: config.get('OS.MEMBER_SKILLS_OS_INDEX'),
    body: {
      sort: [{ userHandle: { order: query.sort } }]
    }
  }
  const boolQuerySkills = []

  if (query.handlesLower) {
    boolQuerySkills.push({ query: { terms: { handleLower: query.handlesLower } } })
  }
  osQuerySkills.body.query = {
    bool: {
      filter: boolQuerySkills
    }
  }
  // search with constructed query
  const docsSkills = await osClient.search(osQuerySkills).body;
  return docsSkills
}

/**
 * Fetch members stats from OS
 * @param {Object} query the HTTP request query
 * @returns {Object} members stats
 */
async function getMembersStats (query, osClient) {
  const searchResults = {hits:{hits:[]}}
  const responseQueue = []

  // construct OS query for stats
  const osQueryStats = {
    index: config.get('OS.MEMBER_STATS_OS_INDEX'),
    size: 10000,
    scroll: '90s',
    body: {
      sort: [{ handleLower: { order: query.sort } }]
    }
  }
  const boolQueryStats = []
  if (query.handlesLower) {
    boolQueryStats.push({ query: { terms: { handleLower: query.handlesLower } } })
    boolQueryStats.push({ match_phrase: { groupId: 10 } })
  }
  osQueryStats.body.query = {
    bool: {
      filter: boolQueryStats
    }
  }


  // search with constructed query
  const response = await osClient.search(osQueryStats).body;

  responseQueue.push(response)
  while (responseQueue.length) {
    const body = responseQueue.shift()
    // collect the titles from this response
    body.hits.hits.forEach(function (hit) {
      searchResults.hits.hits.push(hit)
      //searchResults.push(hit._source.quote)
    })

    // check to see if we have collected all of the quotes
    if (body.hits.total === searchResults.hits.hits.length) {
      searchResults.hits.total=body.hits.total
      break
    }

    // get the next response if there are more quotes to fetch
    responseQueue.push(
      await osClient.scroll({
        scroll_id: body._scroll_id,
        scroll: '90s'
      })
    )
  }
  return searchResults
}

/**
 * Fetch members traits from OS, for multiple members
 * Used by the talent-search app
 * @param {Object} query the HTTP request query
 * @returns {Object} members traits
 */
async function getMemberTraits (query, osClient) {
  const searchResults = {hits:{hits:[]}}
  const responseQueue = []

  // construct OS query for traits
  const osQueryTraits = {
    index: config.get('OS.MEMBER_TRAIT_OS_INDEX'),
    type: config.get('OS.MEMBER_TRAIT_OS_TYPE'),
    size: 10000,
    scroll: '90s',
    body: {
      sort: [{ handleLower: { order: query.sort } }]
    }
  }
  const boolQueryTraits = []
  if (query.memberIds) {
    boolQueryTraits.push({ query: { terms: { userId: query.memberIds } } })
  }
  osQueryTraits.body.query = {
    bool: {
      filter: boolQueryTraits
    }
  }

  // search with constructed query
  const response = await osClient.search(esQueryTraits).body;

  responseQueue.push(response)
  while (responseQueue.length) {
    const body = responseQueue.shift()
    // collect the titles from this response
    body.hits.hits.forEach(function (hit) {
      searchResults.hits.hits.push(hit)
      //searchResults.push(hit._source.quote)
    })

    // check to see if we have collected all of the traits
    if (body.hits.total === searchResults.hits.hits.length) {
      searchResults.hits.total=body.hits.total
      break
    }

    // get the next response if there are more traits to fetch
    responseQueue.push(
      await osClient.scroll({
        scroll_id: body._scroll_id,
        scroll: '90s'
      })
    )
  }
  return searchResults
}

/**
 * Fetch member profile suggestion from OS
 * @param {Object} query the HTTP request query
 * @returns {Object} suggestion
 */
async function getSuggestion (query, osClient, currentUser) {
  // construct OS query for members profile suggestion
  let osSuggestionMembers = {
    index: config.get('OS.MEMBER_PROFILE_OS_INDEX'),
    size: query.perPage,
    from: (query.page - 1) * query.perPage,
    body: {}
  }
  if (query.term) {
    osSuggestionMembers.body.suggest = {
      'handle-suggestion': {
        text: query.term,
        completion: {
          size: 10000,
          field: 'handleSuggest'
        }
      }
    }
  }
  // search with constructed query
  docsSuggestionMembers = await osClient.search(osSuggestionMembers).body;

  return docsSuggestionMembers
}

/**
 * Gets the members skills documents matching the provided criteria from Opensearch
 * @param skillIds
 * @param skillsBooleanOperator
 * @param page
 * @param perPage
 * @param osClient
 * @returns {Promise<*>}
 */
async function searchMembersSkills (skillIds, skillsBooleanOperator, page, perPage, osClient) {
  const searchResults = {hits:{hits:[]}}
  const responseQueue = []

  // construct OS query for members skills
  const osQuerySkills = {
    index: config.get('OS.MEMBER_PROFILE_OS_INDEX'),
    size: 10000,
    scroll: '90s',
    _source:[  
      'userId',
      'description',
      'skills.id',
      'skills.levels',
      'skills.name',
      'handle',
      'handleLower',
      'photoURL',
      'firstName',
      'lastName',
      'homeCountryCode',
      'addresses',
      'lastLoginDate',
      'skillScoreDeduction',
      'namesAndHandleAppearance',
      'availableForGigs'
    ],
    body: {
      query: {
        bool: {
          filter: { bool: {} },
        }
      }
    }
  }

  const mustMatchQuery = [] // will contain the filters with AND operator
  const mustNotMatchQuery = [] // used to filter out availableForGigs=false
  const shouldFilter = [] // will contain the filters with OR operator

  //NOTE - we will need to update this once we refactor the skills associated with members to remove the `emsi` wording
  if (skillsBooleanOperator === BOOLEAN_OPERATOR.AND) {
    for (const skillId of skillIds) {
      const matchPhrase = {}
      matchPhrase[`skills.id`] = `${skillId}`
      mustMatchQuery.push({
        match_phrase: matchPhrase
      })
    }
  } else {
    for (const skillId of skillIds) {
      const matchPhrase = {}
      matchPhrase[`skills.id`] = `${skillId}`
      shouldFilter.push({
        match_phrase: matchPhrase // eslint-disable-line
      })
    }
  }
  const match = {}
  match[`availableForGigs`] = false
  // Only limit to members with 'availableForGigs==true'
  mustNotMatchQuery.push({
    match: match
  })

  if (mustMatchQuery.length > 0) {
    osQuerySkills.body.query.bool.filter.bool.must = mustMatchQuery
  }

  if (shouldFilter.length > 0) {
    osQuerySkills.body.query.bool.filter.bool.should = shouldFilter
  }
  osQuerySkills.body.query.bool.filter.bool.must_not = mustNotMatchQuery
  
  // search with constructed query
  const response = await osClient.search(esQuerySkills).body
  responseQueue.push(response)
  
  while (responseQueue.length) {
    const body = responseQueue.shift()
    // collect the titles from this response
    body.hits.hits.forEach(function (hit) {
      searchResults.hits.hits.push(hit)
    })

    // check to see if we have collected all of the quotes
    if (body.hits.total === searchResults.hits.hits.length) {
      searchResults.hits.total=body.hits.total
      break
    }

    // get the next response if there are more quotes to fetch
    responseQueue.push(
      await osClient.scroll({
        scroll_id: body._scroll_id,
        scroll: '90s'
      })
    )
  }
  return searchResults
}

/**
 * Get total items
 * @param {Object} docs the HTTP request query
 * @returns {Object} total
 */
function getTotal (docs) {
  let total = docs.hits.total
  if (_.isObject(total)) {
    total = total.value || 0
  }
  return total
}

module.exports = {
  getMembers,
  getMembersSkills,
  getMembersStats,
  getMemberTraits,
  getSuggestion,
  getTotal,
  searchMembersSkills
}
