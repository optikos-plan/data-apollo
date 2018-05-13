const User = require('./user')

const Task = `
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

`

module.exports = [Task, User]
