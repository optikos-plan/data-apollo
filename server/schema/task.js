const axios = require('axios')
const DataLoader = require('dataloader')
const legacyBaseUrl = 'http://localhost:3000'

const getTaskById = id => {
  console.log('Get TASK: ', id)
  return axios.get(`${legacyBaseUrl}/tasks/${id}`)
}

const loaders = {
  task: new DataLoader(keys => Promise.all(keys.map(getTaskById)))
}

const typeDefs = `
  type Task {
    id: ID!
    title: String!

    """
    The list of tasks this task depends on. Its dependencies
    """
    parents: [Task]

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
`

// const legacyBaseUrl = 'http://localhost:3000'

const resolvers = {
  Query: {
    tasks: async () => {
      const { data } = await axios.get(`${legacyBaseUrl}/tasks`)
      return data
    },

    task: async (obj, { id }) => {
      const { data } = await loaders.task.load(id)
      return data
    }
  },

  Task: {
    children: async ({ children }) => await loaders.task.loadMany(children),
    parents: async ({ parents }) => await loaders.task.loadMany(parents)
  },

  Mutation: {
    updateTask: (_, data) => {
      const { id } = data
      return axios.put(`${legacyBaseUrl}/tasks/${id}`, data)
    }
  }
}

module.exports = { typeDefs, resolvers }
