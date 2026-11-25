import { auth } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export function GET(...args) {
  return auth().handler().GET(...args);
}

export function POST(...args) {
  return auth().handler().POST(...args);
}
