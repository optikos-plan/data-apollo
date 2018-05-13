const express = require('express')
const bodyParser = require('body-parser')
const cors = require('express-cors')
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express')
const schema = require('./schema')

const PORT = process.env.PORT || 3999
const DATASTORE = process.env.DATASTORE || 'http://localhost'

// Initialize the app
const app = express()

app.use(
  cors({
    allowedOrigins: ['localhost:*']
  })
)

// The GraphQL endpoint
app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }))

// GraphiQL, a visual editor for queries
app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }))

// Start the server
app.listen(PORT, () => {
  console.log(`Go to ${DATASTORE}:${PORT}/graphiql to run queries!`)
})
