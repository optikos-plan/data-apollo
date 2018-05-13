const axios = require("axios");
const DataLoader = require("dataloader");
const legacyBaseUrl = "http://localhost:3000";

const apiError = status => ({
  error: `The command could not be completed. Status: ${status}`
});

const getTaskById = id => {
  console.log("Get TASK: ", id);
  return axios.get(`${legacyBaseUrl}/tasks/${id}`).then(res => res.data);
};

const getUserById = id => {
  console.log("Get USER: ", id);
  return axios.get(`${legacyBaseUrl}/users/${id}`).then(res => res.data);
};

const getProjectById = id => {
  console.log("Get PROJECT: ", id);
  return axios.get(`${legacyBaseUrl}/projects/${id}`).then(res => res.data);
};

const loaders = {
  task: new DataLoader(keys => Promise.all(keys.map(getTaskById))),
  user: new DataLoader(keys => Promise.all(keys.map(getUserById))),
  project: new DataLoader(keys => Promise.all(keys.map(getProjectById)))
};

const typeDefs = `

  type User {
    id: ID!
    name: String!
    email: String!
  }

  type Task {
    id: ID!

    """
    Task user
    """
    user: User
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

  enum PROJECT_STATUS
  {
    notStarted
    inProgress
    completed
  }

  type Project {
    id: ID!

    """
    Project Owner
    """
    owner: User!

    """
    Project Title
    """
    title: String!

    """
    Project Status
    """
    status: PROJECT_STATUS

    """
    Tasks related to a project
    """
    tasks: [Task]
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

    """
    Retrieve all projects
    """
    projects: [Project]

    """
    Retrieve a specific project @id
    """
    project(id: ID!): Project

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


    """
    Update task user
    """
    updateTaskOwner(
      id: ID!
      user: ID!
    ): Task


    """
    Create project
    """
    createProject (
      owner: ID!
      title: String!
      status: PROJECT_STATUS = notStarted
      tasks: [ID]
    ): Project
  }



`;

const resolvers = {
  Query: {
    tasks: () => axios.get(`${legacyBaseUrl}/tasks`).then(res => res.data),
    task: (obj, { id }) => loaders.task.load(id),

    users: () => axios.get(`${legacyBaseUrl}/users`).then(res => res.data),
    user: (obj, { id }) => loaders.user.load(id),

    projects: () => axios.get(`${legacyBaseUrl}/projects`).then(res => res.data),
    project: (obj, { id }) => loaders.project.load(id)
  },

  Task: {
    // TODO: use a scalar to represent DATE type to avoid serialization errors
    //
    endDate: ({ endDate }) =>
      endDate ? new Date(endDate.split("-").map(c => +c)) : null,
    user: ({ userId }) => loaders.user.load(userId),
    children: ({ children }) => loaders.task.loadMany(children),
    parents: ({ parents }) => loaders.task.loadMany(parents)
  },

  Project: {
    owner: ({ owner }) => loaders.user.load(owner),
    tasks: ({ tasks }) => loaders.task.loadMany(tasks)
  },

  Mutation: {
    updateTask: async (_, args) => {
      const { id } = args;
      const { status, data } = await axios.patch(
        `${legacyBaseUrl}/tasks/${id}`,
        args
      );

      // our json-server datastore returns 200 if patch successful.
      return 200 === status ? loaders.task.load(id) : apiError(status);
    },

    createProject: async (_, args) => {
      const { status, data } = await axios.post(
        `${legacyBaseUrl}/projects`,
        args
      );
      // our json-server datastore returns 200 if post successful.
      return 201 === status ? loaders.project.load(data.id) : apiError(status);
    },

    addDependencyToTask: async (_, { childId, parentId }) => {
      const child = await loaders.task.load(childId);
      const parent = await loaders.task.load(parentId);

      if ("errors" in child || "errors" in parent) return {};

      let { status, data } = await axios.patch(
        `${legacyBaseUrl}/tasks/${childId}`,
        {
          parents: [...child.parents, +parentId]
        }
      );

      // our json-server datastore returns 200 if patch successful.
      if (200 === status) {
        // update parent
        const response = await axios.patch(
          `${legacyBaseUrl}/tasks/${parentId}`,
          {
            children: [...parent.children, +childId]
          }
        );
        status = response.status;
      }

      return 200 === status ? loaders.task.load(childId) : apiError(status);
    },

    updateTaskTitle: async (_, args) => {
      const { id, newTitle: title } = args;
      const { status } = await axios.patch(`${legacyBaseUrl}/tasks/${id}`, {
        title
      });
      return 200 === status ? loaders.task.load(id) : apiError(status);
    },

    updateTaskEndDate: async (_, args) => {
      const { id, date: endDate } = args;
      const { status } = await axios.patch(`${legacyBaseUrl}/tasks/${id}`, {
        endDate
      });
      return 200 === status ? loaders.task.load(id) : apiError(status);
    },

    updateTaskOwner: async (_, args) => {
      const { id, user } = args;
      const { status } = await axios.patch(`${legacyBaseUrl}/tasks/${id}`, {
        userId: user
      });
      console.log(
        `UpdateTaskOwner: id: ${id}\tuser: ${user}\tStatus: ${status}`
      );
      return 200 === status ? loaders.task.load(id) : apiError(status);
    }
  }
};

module.exports = { typeDefs, resolvers };
