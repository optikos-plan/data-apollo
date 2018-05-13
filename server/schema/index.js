const { makeExecutableSchema } = require('graphql-tools')
const { typeDefs, resolvers } = require('./root')

const schema = makeExecutableSchema({
  typeDefs,
  resolvers
})

module.exports = schema
