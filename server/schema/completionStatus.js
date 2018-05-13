const CompletionStatus = `
  enum CompletionStatus {

    """
    This task has a dependency that is not completed
    """
    BLOCKED


    """
    The Task is assigned and work has not begun
    """
    ASSIGNED


    IN_PROGRESS
    COMPLETED
  }
`

module.exports = CompletionStatus
