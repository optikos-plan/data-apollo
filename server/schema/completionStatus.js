const CompletionStatus = `
  enum CompletionStatus {

    """
    This task has a dependency that is not completed
    """
    BLOCKED


    """
    No dependency and Work has not yet begun
    """
    PENDING


    IN_PROGRESS
    COMPLETED
  }
`

module.exports = CompletionStatus
