const axios = require('axios')

const typeDefs = `
{
  type Task {
    id: ID!
    title: String!

    """
    The list of tasks this task depends on. Its dependencies
    """
    parents: [Task]!

    """
    The list of tasks that depends on this task
    """
    children: [Task]!
  }

  type Query {
    tasks: [Task]
    task(id: ID!): Task
  }


  type Mutation {
    updateTask (
      id: ID!,
      title: String,
      parents: [ID],
      children: [ID]
    ): Task
  }
}
`

const legacyBaseUrl = 'http://localhost:3000'

const resolvers = {
  Query: {
    tasks: () => axios.get(`${legacyBaseUrl}/tasks`),
    task: (_, { id }) => axios.get(`${legacyBaseUrl}/tasks/${id}`)
  },

  Mutation: {
    updateTask: (_, data) => {
      const { id } = data
      return axios.put(`${legacyBaseUrl}/tasks/${id}`, data)
    }
  }
}

module.exports = { typeDefs, resolvers }
