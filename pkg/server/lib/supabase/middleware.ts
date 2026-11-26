import {
  accessTokenCookie,
  isProduction,
  ssoServerUrl,
} from "@/utils/environment";
import type { Request, Response, NextFunction } from "@/lib/http";

interface SsoUser {
  id: string;
  email: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}

interface UserInfoPayload {
  sub?: string;
  email?: string;
  name?: string | null;
  picture?: string | null;
}

interface OAuthErrorPayload {
  error?: string;
  error_description?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: SsoUser | null;
    }
  }
}

async function readOAuthError(response: globalThis.Response) {
  try {
    return (await response.json()) as OAuthErrorPayload;
  } catch {
    return null;
  }
}

function getAccessToken(request: Request) {
  const authorization = request.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return request.cookies?.[accessTokenCookie] ?? "";
}

export async function supabaseSessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const accessToken = getAccessToken(req);
  req.user = null;

  if (!accessToken) return next();

  const baseUrl =
    ssoServerUrl ??
    (!isProduction ? "http://localhost:8080" : undefined);

  if (!baseUrl) {
    console.error("[auth] SSO URL is not configured", {
      endpoint: "/auth/oauth2/userinfo",
    });
    return next();
  }

  try {
    const endpoint = new URL("/auth/oauth2/userinfo", baseUrl);
    const verifyResponse = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!verifyResponse.ok) {
      const detail = await readOAuthError(verifyResponse);
      console.warn("[auth] SSO userinfo rejected access token", {
        endpoint: endpoint.pathname,
        status: verifyResponse.status,
        error: detail?.error,
        description: detail?.error_description,
      });
      return next();
    }

    const payload = (await verifyResponse.json()) as UserInfoPayload;

    if (payload.sub && payload.email) {
      req.user = {
        id: payload.sub,
        email: payload.email,
        app_metadata: {},
        user_metadata: {
          name: payload.name ?? payload.email,
          avatar_url: payload.picture ?? null,
        },
      };
    }

    return next();
  } catch (error) {
    console.error("[auth] SSO userinfo request failed", {
      endpoint: "/auth/oauth2/userinfo",
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return next();
  }
}

/**
 * Express middleware to require authentication
 * Use this on protected routes
 *
 * Usage:
 * import { requireAuth } from '@/lib/supabase/middleware'
 * router.get('/protected', requireAuth, (req, res) => { ... })
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  next();
}

/**
 * Express middleware to optionally check authentication
 * Similar to Next.js middleware but for specific routes
 *
 * Usage:
 * import { optionalAuth } from '@/lib/supabase/middleware'
 * router.get('/data', optionalAuth, (req, res) => {
 *   const user = req.user // may be null
 * })
 */
export function optionalAuth(
  _req: Request,
  _res: Response,
  next: NextFunction,
) {
  // Just continue - user will be attached if available
  next();
}

/**
 * Express middleware to redirect if not authenticated
 * Similar to Next.js middleware redirect behavior
 *
 * Usage:
 * import { redirectIfNotAuth } from '@/lib/supabase/middleware'
 * router.get('/dashboard', redirectIfNotAuth('/login'), (req, res) => { ... })
 */
export function redirectIfNotAuth(redirectTo: string = "/sign-in") {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.redirect(redirectTo);
    }

    next();
  };
}

/**
 * Express middleware to check user role
 *
 * Usage:
 * import { requireRole } from '@/lib/supabase/middleware'
 * router.post('/admin/action', requireRole(['admin']), (req, res) => { ... })
 */
export function requireRole(allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    // Get user role from metadata or database
    const userRole = user.app_metadata?.role || user.user_metadata?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Insufficient permissions",
      });
    }

    next();
  };
}
