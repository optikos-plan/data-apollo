const axios = require('axios')
const DataLoader = require('dataloader')
const legacyBaseUrl = 'http://localhost:3000'

const apiError = status => ({
  error: `The command could not be completed. Status: ${status}`
})

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
    End date
    """
    endDate: String

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

    """
    Update task title
    """
    updateTaskTitle(
      id: ID!
      newTitle: String!
    ): Task


    """
    Update task date
    """
    updateTaskEndDate(
      id: ID!
      date: String!
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
    // TODO: use a scalar to represent DATE type to avoid serialization errors
    //
    endDate: ({ endDate }) => new Date(endDate.split('-').map(c => +c)),
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
      return 200 === status ? loaders.task.load(id) : apiError(status)
    },

    addDependencyToTask: async (_, { childId, parentId }) => {
      const child = await loaders.task.load(childId)
      const parent = await loaders.task.load(parentId)

      if ('errors' in child || 'errors' in parent) return {}

      let { status, data } = await axios.patch(
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
        status = response.status
      }

      return 200 === status ? loaders.task.load(childId) : apiError(status)
    },

    updateTaskTitle: async (_, args) => {
      const { id, newTitle: title } = args
      const { status } = await axios.patch(`${legacyBaseUrl}/tasks/${id}`, {
        title
      })
      return 200 === status ? loaders.task.load(id) : apiError(status)
    },

    updateTaskEndDate: async (_, args) => {
      const { id, date: endDate } = args
      const { status } = await axios.patch(`${legacyBaseUrl}/tasks/${id}`, {
        endDate
      })
      return 200 === status ? loaders.task.load(id) : apiError(status)
    }
  }
}

module.exports = { typeDefs, resolvers }
