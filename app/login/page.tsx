import Link from "next/link";

import { loginAction } from "@/app/actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{
    error?: string;
    returnTo?: string;
  }>;
}) {
  const query = await searchParams;

  return (
    <div className="authCard">
      <div className="eyebrow">LOG IN</div>

      <h1>Welcome back.</h1>

      {query.error && (
        <div className="errorBanner">
          {query.error}
        </div>
      )}

      <form
        action={loginAction}
        className="formStack"
      >
        <input type="hidden" name="returnTo" value={query.returnTo || ""} />
        <label>
          Email
          <input
            name="email"
            type="email"
            required
          />
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            required
          />
        </label>

        <button className="primaryButton">
          Log in
        </button>
      </form>

      <p>
        New here?{" "}
        <Link href={query.returnTo ? `/signup?returnTo=${encodeURIComponent(query.returnTo)}` : "/signup"}>
          Create an account
        </Link>
      </p>
    </div>
  );
}
