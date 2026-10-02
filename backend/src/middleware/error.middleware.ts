import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

function formatZodIssue(issue: any): string {
  const field = Array.isArray(issue.path) ? issue.path.join('.') : ''
  const fieldName =
    field === 'password'
      ? 'Password'
      : field === 'email'
      ? 'Email'
      : field === 'name'
      ? 'Nama'
      : field

  if (issue.code === 'too_small') {
    if (field === 'password') {
      return `Password minimal ${issue.minimum} karakter.`
    }
    return `${fieldName || 'Input'} minimal ${issue.minimum} karakter.`
  }

  if (issue.code === 'too_big') {
    return `${fieldName || 'Input'} maksimal ${issue.maximum} karakter.`
  }

  if (issue.code === 'invalid_string' && issue.validation === 'email') {
    return 'Format email tidak valid.'
  }

  if (issue.code === 'invalid_type') {
    return `${fieldName || 'Input'} wajib diisi.`
  }

  return field ? `${fieldName}: ${issue.message}` : issue.message
}

export function errorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    const message = error.issues.map(formatZodIssue).join(' ')
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: message || 'Data yang dimasukkan tidak valid.',
      issues: error.issues,
    })
  }

  const message = error instanceof Error ? error.message : 'Internal server error'
  return res.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message })
}
