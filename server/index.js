const express = require('express')
const bodyParser = require('body-parser')
const cors = require('express-cors')
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express')
const schema = require('./schema')

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
app.listen(3999, () => {
  console.log('Go to http://localhost:3000/graphiql to run queries!')
})
