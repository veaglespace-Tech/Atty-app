const formatIssuePath = (path = []) => (path.length ? path.join(".") : "body")

const toErrorPayload = (issues = []) =>
  issues.map((issue) => ({
    path: formatIssuePath(issue.path),
    message: issue.message,
  }))

const validateBody = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body || {})

  if (!parsed.success) {
    const errors = toErrorPayload(parsed.error.issues)
    return res.status(400).json({
      message: errors.map((issue) => `${issue.path}: ${issue.message}`).join(" "),
      errors,
    })
  }

  req.validatedBody = parsed.data
  return next()
}

module.exports = {
  validateBody,
}
