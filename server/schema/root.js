const Task = require('./task')
const resolvers = require('./resolvers')

const RootQuery = `
  type RootQuery {
    """
    Retrieve all Tasks
    """
    tasks: [Task]


    """
    Retrieve a specific Task @id
    """
    task(id: ID!): Task
    """


    Retrieve all Users
    """
    users: [User]


    """
    Retrieve a specific User @id
    """
    user(id: ID!): User


    """
    Retrieve all Projects
    """
    projects: [Project]


    """
    Retrieve a specific Project @id
    """
    project(id: ID!): Project

  }
`

const RootMutation = `
  type RootMutation {
    updateTask (
      id: ID!,
      title: String,
      parents: [ID],
      status: CompletionStatus,
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
    Update Task title
    """
    updateTaskTitle(
      id: ID!
      newTitle: String!
    ): Task


    """
    Update Task date
    """
    updateTaskEndDate(
      id: ID!
      date: String!
    ): Task


    """
    Update Task user
    """
    updateTaskOwner(
      id: ID!
      user: ID!
    ): Task


    """
    Create Project
    """
    createProject (
      owner: ID!
      title: String!
      status: CompletionStatus = ASSIGNED
      tasks: [ID]
    ): Project

    """
    Create Task
    """
    createTask (
      projectId: ID!
      userId: ID!
      title: String!
      status: CompletionStatus = ASSIGNED
      children: [ID] = []
      endDate: String = "" 
      parents: [ID] = []
    ): Task

    deleteTask (
      id: ID!
    ): Task
  }
`

const SchemaDefinition = `
  schema {
    query: RootQuery
    mutation: RootMutation
  }
`

module.exports = {
  typeDefs: [SchemaDefinition, RootQuery, RootMutation, ...Task],
  resolvers
}
