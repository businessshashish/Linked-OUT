import Link from "next/link";

import {
  logoutAction
} from "@/app/actions";
import { getCurrentUser } from "@/lib/session";

export default async function Nav() {
  const user = await getCurrentUser();

  return (
    <header className="nav">
      <div className="navInner">
        <Link href="/" className="brand" aria-label="LinkedOut home">
          <img src="/logo.png" className="brandLogo" alt="LinkedOut" />
          <span>LinkedOut</span>
        </Link>

        <form className="navSearch" action="/">
          <input name="q" placeholder="Search companies" aria-label="Search companies" />
          <button type="submit" className="navSearchButton" aria-label="Search" title="Search">Go</button>
        </form>

        <nav className="navLinks">
          <Link href="/explore">
            <span className="navIcon uiIcon uiIcon-explore" aria-hidden="true" />
            <span>Explore</span>
          </Link>
          <Link href="/submit">
            <span className="navIcon uiIcon uiIcon-share" aria-hidden="true" />
            <span>Share</span>
          </Link>

          {user ? (
            <>
              <Link href="/account" className="profileNav">
                {user.avatarUrl ? (
                  <img className="profileAvatar profileAvatarImage" src={user.avatarUrl} alt="" />
                ) : (
                  <span className="profileAvatar">{user.publicIdentity?.alias[0] || "A"}</span>
                )}
                <span>Me</span>
              </Link>

              <Link href="/employer">For companies</Link>

              {user.role === "ADMIN" && <Link href="/admin">Admin</Link>}

              <form action={logoutAction}>
                <button className="linkButton">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>

              <Link href="/signup" className="navCta">Join</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
