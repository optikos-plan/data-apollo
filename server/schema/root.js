const Task = require('./task')
const resolvers = require('./resolvers')

const RootQuery = `
  type RootQuery {
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
`

const RootMutation = `
  type RootMutation {
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
