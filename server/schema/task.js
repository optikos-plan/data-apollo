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
    children: [Task]
  }

  type Query {
    tasks: [Task]
    task(id: ID!): Task
  }


  type Mutation {
    updateTask (
      id: ID!,
      title: String,
      parents: [ID!],
      children: [ID!]
    ): Task
  }
`

// const legacyBaseUrl = 'http://localhost:3000'

const resolvers = {
  Query: {
    tasks: () => axios.get(`${legacyBaseUrl}/tasks`).then(res => res.data),
    task: (obj, { id }) => loaders.task.load(id).then(res => res.data)
  },

  Task: {
    id: ({ id }) => id,
    children: ({ id, children }) => {
      console.log(`[${id}] GET for Children: `, children)
      return loaders.task.loadMany(children)
    },
    parents: ({ parents }) => loaders.task.loadMany(parents)
  },

  Mutation: {
    updateTask: (_, data) => {
      const { id } = data
      return axios.put(`${legacyBaseUrl}/tasks/${id}`, data)
    }
  }
}

module.exports = { typeDefs, resolvers }
