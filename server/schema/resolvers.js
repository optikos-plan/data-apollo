const axios = require('axios')
const DataLoader = require('dataloader')

const DATASTORE = process.env.DATASTORE || 'http://localhost:3000'

const legacyBaseUrl = `${DATASTORE}`
const makeDetailsUrl = resource => id => `${legacyBaseUrl}/${resource}/${id}`

const taskDetails = makeDetailsUrl('tasks')
const userDetails = makeDetailsUrl('users')
const projectDetails = makeDetailsUrl('projects')

// if a res is deleted, remove all references of res' foreign key
// if delete user: remove ref to userId from project, and task entities
// if delete task: remove ref from project and task entities [children and parents]
// if delte project: CASCADE delte all references in tasks, and all tasks' refs to projectId
//

const deleteUser = uid => {
  // remove user with DELETE
  // constraint: If a user is associated with a project (ie owner) then cannot
  // be deleted.  THIS WILL BE VALIDATED ON THE CLIENT SIDE THE DATABASE WILL
  // ASSUME VALID OPERATIONS ARE PRESENTED
  //
  // get all tasks filtered by uid: update each task to remove uid reference
}

const deleteTask = tid => {
  // remove task with DELETE
  // get all tasks filtered by child conntains tid: update child to remove tid
  // get all tasks filtered by parent conntains tid: update child to remove tid
}

/* const deleteProject = async pid => {
 *   // remove project with delete
 *   // get all tasks filtered by pid : call delete and delete them
 *   // get user associated with this pid and remove project ** this may not exist.
 *   //
 *   const projecturl = projectDetails(pid)
 *   await axios.delete(projecturl)
 *
 *   const { data: tasks } = await axios.get(`${legacyBaseUrl}/tasks`)
 *
 *   const mytasks = tasks.filter(task => task.projectid === pid)
 *   mytasks.foreach(task => console.log('delete task', task.id))
 *
 *   await Promise.all(mytasks.map(task => axios.delete(taskDetails(task.id))))
 * } */

const apiError = status => ({
  error: `The command could not be completed. Status: ${status}`
})

const logMe = (label, message) => {
  console.group(label)
  console.info(message, '\n')
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

const getProjectById = id => {
  logMe('GET', `Project(${id})`)
  return axios.get(projectDetails(id)).then(res => res.data)
}

const loaders = {
  task: new DataLoader(keys => Promise.all(keys.map(getTaskById))),
  user: new DataLoader(keys => Promise.all(keys.map(getUserById))),
  project: new DataLoader(keys => Promise.all(keys.map(getProjectById)))
}

const resolvers = {
  RootQuery: {
    tasks: () => axios.get(`${legacyBaseUrl}/tasks`).then(res => res.data),
    task: (obj, { id }) => loaders.task.load(id),

    users: () => axios.get(`${legacyBaseUrl}/users`).then(res => res.data),
    user: (obj, { id }) => loaders.user.load(id),

    projects: () =>
      axios.get(`${legacyBaseUrl}/projects`).then(res => res.data),
    project: (obj, { id }) => loaders.project.load(id)
  },

  Project: {
    owner: ({ owner }) => loaders.user.load(owner),
    tasks: ({ tasks }) => loaders.task.loadMany(tasks)
  },

  Task: {
    // TODO: use a scalar to represent DATE type to avoid serialization errors
    // Right now the UI depends on the date to be a string: YYYY-MM-DD. This is
    // not optimal.
    //
    user: ({ userId }) => loaders.user.load(userId),
    project: ({ projectId }) => loaders.project.load(projectId),
    children: ({ children }) => loaders.task.loadMany(children),
    parents: ({ parents }) => loaders.task.loadMany(parents)
  },

  RootMutation: {
    createProject: async (_, args) => {
      logMe('CreateProject', args)
      const { status, data } = await axios.post(
        `${legacyBaseUrl}/projects`,
        args
      )
      return 201 === status ? loaders.project.load(data.id) : apiError(status)
    },

    deleteProject: async (_, { id }) => {
      logMe('DeleteProject', id)
      // remove project with delete
      // get all tasks filtered by pid : call delete and delete them
      // get user associated with this pid and remove project ** this may not exist.
      //
      try {
        const projectUrl = projectDetails(id)
        logMe('project url: ', projectUrl)
        const { data } = await axios.delete(projectUrl)

        const { data: tasks } = await axios.get(`${legacyBaseUrl}/tasks`)

        const mytasks = tasks.filter(task => task.projectId === id)
        mytasks.foreach(task => logMe('delete task', task.id))

        await Promise.all(
          mytasks.map(task => axios.delete(taskDetails(task.id)))
        )
        return { id }
      } catch (error) {
        return apiError(error)
      }

      return { id }
    },

    createTask: async (_, args) => {
      logMe('CreateTask', args)
      const { status, data } = await axios.post(`${legacyBaseUrl}/tasks/`, args)
      return 201 === status ? loaders.task.load(data.id) : apiError(status)
    },

    deleteTask: async (_, args) => {
      logMe('DeleteTask', args)
      const { id } = args
      const { status } = await axios.delete(`${legacyBaseUrl}/tasks/${id}`)
      //to prevent error, need to return non-null value
      return { id }
    },

    updateTask: async (_, args) => {
      logMe('UpdateTask', args)
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
      logMe('UpdateTitle', title)
      const { status } = await axios.patch(taskDetails(id), {
        title
      })

      return 200 === status ? loaders.task.load(id) : apiError(status)
    },

    updateTaskEndDate: async (_, args) => {
      const { id, date: endDate } = args
      logMe('UpdateEndDate', endDate)
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
