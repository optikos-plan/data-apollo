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

/* const deleteUser = uid => {
 *   // remove user with DELETE
 *   // constraint: If a user is associated with a project (ie owner) then cannot
 *   // be deleted.  THIS WILL BE VALIDATED ON THE CLIENT SIDE THE DATABASE WILL
 *   // ASSUME VALID OPERATIONS ARE PRESENTED
 *   //
 *   // get all tasks filtered by uid: update each task to remove uid reference
 *   //
 *   // NOTE: beware json-server does a cascade delete.
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

/* loaders.project.clear(id) to clear a cache
 */
const loaders = {
  task: new DataLoader(keys => Promise.all(keys.map(getTaskById)), {
    cache: false
  }),
  user: new DataLoader(keys => Promise.all(keys.map(getUserById)), {
    cache: false
  }),
  project: new DataLoader(keys => Promise.all(keys.map(getProjectById)), {
    cache: false
  })
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
        /* json server has a simple cascade-like delete
         * ie if deleting a project will delete all
         * tasks that references said project as a foreign key.
         * In our case each Task has a projectId that references a project.
         * see: https://github.com/typicode/json-server/blob/7c32f7121f10fbe675fac4be0853c4946f38709e/src/server/mixins.js#L10-L38
         */
        const projectUrl = projectDetails(id)
        logMe('project url: ', projectUrl)
        await axios.delete(projectUrl)

        return { id }
      } catch (error) {
        console.log(error)
        return apiError(error)
      }
    },

    createTask: async (_, args) => {
      logMe('CreateTask', args)
      const { projectId, userId, title, status, child, parent } = args

      const task = {
        projectId,
        userId,
        title,
        status,
        children: [],
        parents: []
      }
      try {
        if (child) task.children = [child]
        if (parent) task.parents = [parent]

        const { data } = await axios.post(`${legacyBaseUrl}/tasks/`, task)

        const project = await loaders.project.load(projectId)
        await axios.patch(projectDetails(projectId), {
          tasks: [...project.tasks, data.id]
        })

        if (child) {
          const baby = await loaders.task.load(child)
          baby.parents = [...baby.parents, data.id]
          await axios.patch(taskDetails(child), { parents: baby.parents })
        } else if (parent) {
          const folks = await loaders.task.load(parent)
          folks.children = [...folks.children, data.id]
          await axios.patch(taskDetails(parent), { children: folks.children })
        }
        return data
      } catch (error) {
        console.log(error)
        return apiError(error)
      }
    },

    updateTaskStatus: async (_, { id, status }) => {
      try {
        logMe('UpdateTaskStatus', id, status)
        const { status: respStatus } = await axios.patch(taskDetails(id), {
          status
        })
        return 200 === respStatus ? loaders.task.load(id) : apiError(respStatus)
      } catch (error) {
        console.log(error)
        return { error }
      }
    },

    createUser: async (_, args) => {
      logMe('CreateUser', args)
      const { status, data } = await axios.post(`${legacyBaseUrl}/users/`, args)
      return 201 === status ? loaders.user.load(data.id) : apiError(status)
    },

    deleteTask: async (_, args) => {
      logMe('DeleteTask', args)

      try {
        const { id } = args

        // get task
        const { data: task } = await axios.get(taskDetails(id))

        // get all other tasks in the project
        // ?_embed=tasks gets nested task result / eager-loading / join
        const { data: aProject } = await axios.get(
          projectDetails(task.projectId) + '?_embed=tasks'
        )

        const promises = []
        const updatedTasks = aProject.tasks.filter(aTask => +aTask.id !== +id)

        // Update all parent and child references
        //
        updatedTasks.forEach(aTask => {
          const children = aTask.children.filter(child => +child !== +id)
          const parents = aTask.parents.filter(parent => +parent !== +id)
          console.log(
            `PATCH ${id}:: TASK(${aTask.id}: children: ${
              aTask.children
            }, parents: ${aTask.parents})`
          )
          console.log(
            `PATCH ${id}:: TASK(${
              aTask.id
            }: children: ${children}, parents: ${parents}\n\n`
          )
          promises.push(
            axios.patch(taskDetails(aTask.id), { children, parents })
          )
        })

        // updatedTasks is a list of objects, transform tasks
        // to an array of ids.
        //
        promises.push(
          axios.patch(projectDetails(task.projectId), {
            tasks: updatedTasks.map(tobj => tobj.id)
          })
        )

        // Delete the task itself
        promises.push(axios.delete(`${legacyBaseUrl}/tasks/${id}`))

        await Promise.all(promises)

        return { id }
      } catch (error) {
        console.log(error)
        return apiError(error)
      }
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
    },

    updateUser: async (_, args) => {
      const { id, name, email } = args
      const { status } = await axios.patch(userDetails(id), {
        name,
        email
      })
      logMe('UpdateUser', `id: ${id}\tname: ${name}\temail: ${email}`)
      return 200 === status ? loaders.user.load(id) : apiError(status)
    },

    deleteUser: async (_, { id }) => {
      logMe('DeleteUsers', id)
      
      try {
        const userUrl = userDetails(id)
        logMe('user url: ', userUrl)
        await axios.delete(userUrl)

        return { id }
      } catch (error) {
        console.log(error)
        return apiError(error)
      }
    },
  }
}

module.exports = resolvers
