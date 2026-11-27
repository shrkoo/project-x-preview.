export type AuthErrorCode =
  | "INVALID_EMAIL"
  | "WRONG_CREDENTIALS"
  | "INVALID_CREDENTIALS"
  | "EMAIL_EXISTS"
  | "ACCOUNT_EXISTS"
  | "NEEDS_RESET"
  | "UNVERIFIED"
  | "EMAIL_NOT_VERIFIED"
  | "RATE_LIMITED"
  | "TURNSTILE_FAILED"
  | "EMAIL_SEND_FAILED"
  | "NETWORK"
  | "SERVER"
  | "INTERNAL_ERROR"
  | "FORBIDDEN";

export function authErrorKey(code: string | undefined, status = 0): string {
  switch (code as AuthErrorCode | undefined) {
    case "INVALID_EMAIL": return "emailInvalid";
    case "WRONG_CREDENTIALS":
    case "INVALID_CREDENTIALS": return "loginInvalidCredentials";
    case "EMAIL_EXISTS":
    case "ACCOUNT_EXISTS": return "accountExists";
    case "NEEDS_RESET": return "authNeedsReset";
    case "UNVERIFIED":
    case "EMAIL_NOT_VERIFIED": return "loginEmailUnverified";
    case "RATE_LIMITED": return "loginTooManyAttempts";
    case "TURNSTILE_FAILED":
    case "FORBIDDEN": return "captchaAgain";
    case "EMAIL_SEND_FAILED": return "forgotEmailUnavailable";
    case "NETWORK": return "loginOffline";
    case "SERVER":
    case "INTERNAL_ERROR": return "loginServerProblem";
    default:
      if (status === 429) return "loginTooManyAttempts";
      if (status === 401) return "loginInvalidCredentials";
      if (status === 403) return "loginEmailUnverified";
      if (status >= 500) return "loginServerProblem";
      return "loginServerProblem";
  }
}
