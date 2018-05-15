const Project = `
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
    status: CompletionStatus


    """
    Project Description
    """
    description: String


    """
    Tasks related to a project
    """
    tasks: [Task]
  }
`

module.exports = Project
