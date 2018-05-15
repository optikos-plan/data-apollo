const User = `
  type User {
    id: ID!


    """
    Name of a user
    """
    name: String!


    """
    Email of a user
    """
    email: String!
  }
`

module.exports = User
