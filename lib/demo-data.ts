import { cookies } from "next/headers";

export const DEMO_DATA_COOKIE = "linkedout_demo_data";

export async function isDemoDataEnabled() {
  const value = (await cookies()).get(DEMO_DATA_COOKIE)?.value;
  return value !== "off";
}
