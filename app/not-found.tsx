import Link from "next/link";

export default function NotFound() {
  return (
    <div className="authCard">
      <h1>Company not found.</h1>

      <p>
        That workplace is not currently in the
        LinkedOut database.
      </p>

      <Link href="/">Return home</Link>
    </div>
  );
}
