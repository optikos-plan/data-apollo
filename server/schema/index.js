const {
  makeExecutableSchema
  // addMockFunctionsToSchema
} = require('graphql-tools')

const { typeDefs, resolvers } = require('./task')

const schema = makeExecutableSchema({
  typeDefs,
  resolvers
})

// addMockFunctionsToSchema({ schema })

module.exports = schema
