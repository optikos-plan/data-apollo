const axios = require('axios')
const DataLoader = require('dataloader')
const legacyBaseUrl = 'http://localhost:3000'

const getTaskById = id => {
  console.log('Get TASK: ', id)
  return axios.get(`${legacyBaseUrl}/tasks/${id}`).then(res => res.data)
}

const getUserById = id => {
  console.log('Get USER: ', id)
  return axios.get(`${legacyBaseUrl}/users/${id}`).then(res => res.data)
}

const loaders = {
  task: new DataLoader(keys => Promise.all(keys.map(getTaskById))),
  user: new DataLoader(keys => Promise.all(keys.map(getUserById)))
}

const typeDefs = `
  type User {
    id: ID!
    name: String!
    email: String!
  }

  type Task {
    id: ID!

    """
    Task owner
    """
    owner: User
    title: String!

    """
    Details about the task
    """
    description: String!

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
    """
    Retrieve all tasks
    """
    tasks: [Task]

    """
    Retrieve a specific task @id
    """
    task(id: ID!): Task
    """

    Retrieve all users
    """
    users: [User]

    """
    Retrieve a specific user @id
    """
    user(id: ID!): User
  }


  type Mutation {
    updateTask (
      id: ID!,
      title: String,
      parents: [ID],
      children: [ID]
    ): Task

    """
    make the relationship child <----> parent
    """
    addDependencyToTask(
      childId: ID!,
      parentId: ID!
    ): Task
  }
`

const resolvers = {
  Query: {
    tasks: () => axios.get(`${legacyBaseUrl}/tasks`).then(res => res.data),
    task: (obj, { id }) => loaders.task.load(id),

    users: () => axios.get(`${legacyBaseUrl}/users`).then(res => res.data),
    user: (obj, { id }) => loaders.user.load(id)
  },

  Task: {
    // id: ({ id }) => id,
    owner: ({ userId }) => loaders.user.load(userId),
    children: ({ children }) => loaders.task.loadMany(children),
    parents: ({ parents }) => loaders.task.loadMany(parents)
  },

  Mutation: {
    updateTask: async (_, args) => {
      const { id } = args
      const { status, data } = await axios.patch(
        `${legacyBaseUrl}/tasks/${id}`,
        args
      )

      // our json-server datastore returns 200 if patch successful.
      if (200 === status) {
        return loaders.task.load(id)
      }

      return {}
    },

    addDependencyToTask: async (_, { childId, parentId }) => {
      const child = await loaders.task.load(childId)
      const parent = await loaders.task.load(parentId)

      if ('errors' in child || 'errors' in parent) return {}

      const { status, data } = await axios.patch(
        `${legacyBaseUrl}/tasks/${childId}`,
        {
          parents: [...child.parents, +parentId]
        }
      )

      // our json-server datastore returns 200 if patch successful.
      if (200 === status) {
        // update parent
        const response = await axios.patch(
          `${legacyBaseUrl}/tasks/${parentId}`,
          {
            children: [...parent.children, +childId]
          }
        )

        if (response.status === 200) return loaders.task.load(childId)
      }

      return {}
    }
  }
}

module.exports = { typeDefs, resolvers }
