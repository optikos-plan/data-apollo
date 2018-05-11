const { makeExecutableSchema } = require('graphql-tools')
const { typeDefs, resolvers } = require('./task')
// const { typeDefs, resolvers } = require('./author')

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers
})
