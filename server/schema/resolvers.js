const axios = require('axios')
const DataLoader = require('dataloader')

const legacyBaseUrl = 'http://localhost:3000'
const makeDetailsUrl = resource => id => `${legacyBaseUrl}/${resource}/${id}`

const taskDetails = makeDetailsUrl('tasks')
const userDetails = makeDetailsUrl('users')

const apiError = status => ({
  error: `The command could not be completed. Status: ${status}`
})

const logMe = (label, message) => {
  console.group(label)
  console.info(message + '\n')
  console.groupEnd()
}

const getTaskById = id => {
  logMe('GET', `Task(${id})`)
  return axios.get(taskDetails(id)).then(res => res.data)
}

const getUserById = id => {
  logMe('GET', `User(${id})`)
  return axios.get(userDetails(id)).then(res => res.data)
}

const loaders = {
  task: new DataLoader(keys => Promise.all(keys.map(getTaskById))),
  user: new DataLoader(keys => Promise.all(keys.map(getUserById)))
}

const resolvers = {
  RootQuery: {
    tasks: () => axios.get(`${legacyBaseUrl}/tasks`).then(res => res.data),
    task: (obj, { id }) => loaders.task.load(id),

    users: () => axios.get(`${legacyBaseUrl}/users`).then(res => res.data),
    user: (obj, { id }) => loaders.user.load(id)
  },

  Task: {
    // TODO: use a scalar to represent DATE type to avoid serialization errors
    // Right now the UI depends on the date to be a string: YYYY-MM-DD. This is
    // not optimal.
    //
    user: ({ userId }) => loaders.user.load(userId),
    children: ({ children }) => loaders.task.loadMany(children),
    parents: ({ parents }) => loaders.task.loadMany(parents)
  },

  RootMutation: {
    updateTask: async (_, args) => {
      const { id } = args
      const { status } = await axios.patch(taskDetails(id), args)
      return 200 === status ? loaders.task.load(id) : apiError(status)
    },

    addDependencyToTask: async (_, { childId, parentId }) => {
      const child = await loaders.task.load(childId)
      const parent = await loaders.task.load(parentId)

      /* TODO: Discuss with group how to handle this case.
       * This code hides an exception, perhaps it is better
       * to throw...
       */
      if ('errors' in child || 'errors' in parent) return {}

      let { status } = await axios.patch(taskDetails(childId), {
        parents: [...child.parents, +parentId]
      })

      if (200 === status) {
        const response = await axios.patch(taskDetails(parentId), {
          children: [...parent.children, +childId]
        })
        status = response.status
      }

      return 200 === status ? loaders.task.load(childId) : apiError(status)
    },

    updateTaskTitle: async (_, args) => {
      const { id, newTitle: title } = args
      const { status } = await axios.patch(taskDetails(id), {
        title
      })

      return 200 === status ? loaders.task.load(id) : apiError(status)
    },

    updateTaskEndDate: async (_, args) => {
      const { id, date: endDate } = args
      const { status } = await axios.patch(taskDetails(id), {
        endDate
      })
      return 200 === status ? loaders.task.load(id) : apiError(status)
    },

    updateTaskOwner: async (_, args) => {
      const { id, user } = args
      const { status } = await axios.patch(taskDetails(id), {
        userId: user
      })
      logMe('UpdateTaskOwner', `id: ${id}\tuser: ${user}\tStatus: ${status}`)
      return 200 === status ? loaders.task.load(id) : apiError(status)
    }
  }
}

module.exports = resolvers
