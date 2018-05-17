const User = require('./user')
const CompletionStatus = require('./completionStatus')
const Project = require('./project.js')

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
    This project this task belongs to
    """
    project: Project!


    """
    The status of the project
    """
    status: String!

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

module.exports = [Task, User, CompletionStatus, Project]
