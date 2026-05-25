import { randomUUID } from 'crypto'
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  UserNotFoundError,
} from 'server/domain/error'
import {
  API_ERROR_CODES,
  ApiErrorCode,
  ApiErrorResponse,
  createApiErrorBody,
} from 'server/http/error-response'

export { API_ERROR_CODES }
export type { ApiErrorCode, ApiErrorResponse }

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export type NormalizedApiError = {
  status: number
  code: ApiErrorCode
  message: string
  details?: unknown
  cause?: unknown
}

type ApiErrorArgs = {
  status: number
  code: ApiErrorCode
  message: string
  details?: unknown
  cause?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly details?: unknown
  readonly cause?: unknown

  constructor({ status, code, message, details, cause }: ApiErrorArgs) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.cause = cause
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export type ApiErrorMapper = (err: unknown) => NormalizedApiError | null | undefined

type SendApiErrorOptions = {
  logPrefix?: string
  mapError?: ApiErrorMapper
}

type WithV2ApiHandlerOptions = SendApiErrorOptions & {
  methods?: ApiMethod[]
  handler: NextApiHandler
}

export function withV2ApiHandler({
  methods,
  handler,
  logPrefix,
  mapError,
}: WithV2ApiHandlerOptions): NextApiHandler {
  return async (req, res) => {
    try {
      if (methods && !methods.includes(req.method as ApiMethod)) {
        res.setHeader('Allow', methods)
        throw new ApiError({
          status: 405,
          code: API_ERROR_CODES.METHOD_NOT_ALLOWED,
          message: 'method not allowed',
        })
      }

      await handler(req, res)
    } catch (err) {
      return sendApiError(req, res, err, { logPrefix, mapError })
    }
  }
}

export function toApiError({
  status,
  code,
  message,
  details,
  cause,
}: ApiErrorArgs): NormalizedApiError {
  return {
    status,
    code,
    message,
    details,
    cause,
  }
}

export function sendApiError(
  req: NextApiRequest,
  res: NextApiResponse,
  err: unknown,
  options: SendApiErrorOptions = {},
) {
  if (res.headersSent) {
    console.error(`${options.logPrefix ?? 'api'} error after headers sent: `, err)
    return
  }

  const normalized = options.mapError?.(err) ?? normalizeApiError(err)
  const requestId = requestIdFrom(req)

  if (normalized.status >= 500) {
    console.error(`${options.logPrefix ?? 'api'} error [${requestId}]: `, normalized.cause ?? err)
  }

  return res.status(normalized.status).json(
    createApiErrorBody({
      code: normalized.code,
      message: normalized.message,
      details: normalized.details,
      requestId,
    }),
  )
}

export function normalizeApiError(err: unknown): NormalizedApiError {
  if (err instanceof ApiError) {
    return toApiError({
      status: err.status,
      code: err.code,
      message: err.message,
      details: err.details,
      cause: err.cause ?? err,
    })
  }

  if (err instanceof z.ZodError) {
    return toApiError({
      status: 400,
      code: API_ERROR_CODES.VALIDATION_ERROR,
      message: '요청 값이 올바르지 않습니다.',
      details: err.errors,
      cause: err,
    })
  }

  if (err instanceof UnauthorizedError) {
    return toApiError({
      status: 401,
      code: API_ERROR_CODES.UNAUTHORIZED,
      message: err.message || 'unauthorized',
      cause: err,
    })
  }

  if (err instanceof ForbiddenError) {
    return toApiError({
      status: 403,
      code: forbiddenCodeFromMessage(err.message),
      message: err.message || 'forbidden',
      cause: err,
    })
  }

  if (err instanceof UserNotFoundError) {
    return toApiError({
      status: 404,
      code: API_ERROR_CODES.USER_NOT_FOUND,
      message: err.message || 'user not found',
      cause: err,
    })
  }

  if (err instanceof NotFoundError) {
    return toApiError({
      status: 404,
      code: notFoundCodeFromMessage(err.message),
      message: err.message || 'not found',
      cause: err,
    })
  }

  if (err instanceof BadRequestError) {
    return toApiError({
      status: 400,
      code: badRequestCodeFromMessage(err.message),
      message: err.message || 'bad request',
      cause: err,
    })
  }

  if (err instanceof ConflictError) {
    return toApiError({
      status: 409,
      code: conflictCodeFromMessage(err.message),
      message: err.message || 'conflict',
      cause: err,
    })
  }

  return toApiError({
    status: 500,
    code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: 'Internal Server Error',
    cause: err,
  })
}

function requestIdFrom(req: NextApiRequest): string {
  const header = req.headers['x-request-id']
  if (typeof header === 'string' && header.length > 0) {
    return header
  }
  if (Array.isArray(header) && header[0]) {
    return header[0]
  }
  return randomUUID()
}

function badRequestCodeFromMessage(message: string): ApiErrorCode {
  switch (message) {
    case 'guest id is required':
      return API_ERROR_CODES.GUEST_ID_REQUIRED
    case 'invalid guest id':
      return API_ERROR_CODES.INVALID_GUEST_ID
    case 'invalid term uuids':
      return API_ERROR_CODES.INVALID_TERM_UUIDS
    case 'invalid announcement uuids':
      return API_ERROR_CODES.INVALID_ANNOUNCEMENT_UUIDS
    default:
      return API_ERROR_CODES.BAD_REQUEST
  }
}

function forbiddenCodeFromMessage(message: string): ApiErrorCode {
  if (message === 'admin role required') {
    return API_ERROR_CODES.ADMIN_ROLE_REQUIRED
  }
  return API_ERROR_CODES.FORBIDDEN
}

function notFoundCodeFromMessage(message: string): ApiErrorCode {
  switch (message) {
    case 'club not found':
      return API_ERROR_CODES.CLUB_NOT_FOUND
    case 'recruitment not found':
      return API_ERROR_CODES.RECRUITMENT_NOT_FOUND
    case 'manager request not found':
      return API_ERROR_CODES.MANAGER_REQUEST_NOT_FOUND
    case 'verification request not found':
      return API_ERROR_CODES.VERIFICATION_REQUEST_NOT_FOUND
    default:
      return API_ERROR_CODES.NOT_FOUND
  }
}

function conflictCodeFromMessage(message: string): ApiErrorCode {
  switch (message) {
    case 'club already has a manager':
      return API_ERROR_CODES.CLUB_ALREADY_HAS_MANAGER
    case 'pending manager request already exists':
      return API_ERROR_CODES.PENDING_MANAGER_REQUEST_EXISTS
    case 'recruitment already exists for this month':
      return API_ERROR_CODES.RECRUITMENT_ALREADY_EXISTS_FOR_MONTH
    case 'manager request already processed':
      return API_ERROR_CODES.MANAGER_REQUEST_ALREADY_PROCESSED
    case 'verification request already processed':
      return API_ERROR_CODES.VERIFICATION_REQUEST_ALREADY_PROCESSED
    case 'club is already officially verified':
      return API_ERROR_CODES.CLUB_ALREADY_VERIFIED
    case 'pending verification request already exists':
      return API_ERROR_CODES.PENDING_VERIFICATION_REQUEST_EXISTS
    default:
      return API_ERROR_CODES.CONFLICT
  }
}
