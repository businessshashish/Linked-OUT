import Link from "next/link";

import { signupAction } from "@/app/actions";

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  const query = await searchParams;

  return (
    <div className="authCard">
      <div className="eyebrow">
        CREATE ACCOUNT
      </div>

      <h1>Speak through experience.</h1>

      <p className="muted">
        Your account identity is never shown on
        employee stories.
      </p>

      {query.error && (
        <div className="errorBanner">
          {query.error}
        </div>
      )}

      <form
        action={signupAction}
        className="formStack"
      >
        <label>
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            minLength={10}
            required
            autoComplete="new-password"
          />
        </label>

        <button className="primaryButton">
          Create account
        </button>
      </form>

      <p>
        Already joined?{" "}
        <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
