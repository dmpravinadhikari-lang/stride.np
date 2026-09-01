import { revokeToken } from "@/lib/api/auth";
import { ok, unauthorised } from "@/lib/api/respond";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return revokeToken(request) ? ok({ revoked: true }) : unauthorised();
}
