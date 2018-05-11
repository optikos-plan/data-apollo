const { makeExecutableSchema } = require('graphql-tools')
const { typeDefs, resolvers } = require('./task')

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers
})
