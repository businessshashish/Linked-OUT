import Link from "next/link";

type FeedLeftRailProps = {
  user: {
    avatarUrl: string | null;
    publicIdentity: { alias: string } | null;
  } | null;
  publishedStories: number;
  pendingStories: number;
};

const quickLinks = [
  { label: "Saved items", href: "/account", icon: "saved" },
  { label: "Explore companies", href: "/explore", icon: "companies" },
  { label: "Workplace reports", href: "/explore", icon: "newsletter" },
  { label: "Events", href: "/explore", icon: "events" }
];

export default function FeedLeftRail({ user, publishedStories, pendingStories }: FeedLeftRailProps) {
  if (!user) {
    return (
      <aside className="feedLeftRail" aria-label="Member options">
        <section className="feedRailCard joinRailCard">
          <span className="uiIcon uiIcon-profile" aria-hidden="true" />
          <h3>Join the workplace conversation</h3>
          <p>See honest stories and add your experience when you are ready.</p>
          <Link href="/signup" className="railJoinButton">Join LinkedOut</Link>
        </section>
      </aside>
    );
  }

  const alias = user.publicIdentity?.alias || "Anonymous member";

  return (
    <aside className="feedLeftRail" aria-label="Your LinkedOut profile and shortcuts">
      <section className="feedRailCard profileRailCard">
        <div className="profileRailCover"><span className="uiIcon uiIcon-profile" aria-hidden="true" /></div>
        <div className="profileRailAvatar">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : alias.slice(0, 1)}
        </div>
        <div className="profileRailBody">
          <strong>{alias}</strong>
          <span>LinkedOut member</span>
          <p>Share what work was really like—on your terms.</p>
          <Link href="/account" className="railProfileLink">View profile <span>→</span></Link>
        </div>
      </section>

      <section className="feedRailCard railAnalytics">
        <Link href="/account"><span>Stories published</span><strong>{publishedStories}</strong></Link>
        <Link href="/account"><span>Awaiting review</span><strong>{pendingStories}</strong></Link>
      </section>

      <section className="feedRailCard railIdentityCard">
        <div className="railIdentityTop"><img src="/logo.png" alt="" /><span><strong>LinkedOut</strong><small>Your workplace record</small></span></div>
        <div className="railActions">
          <Link href="/submit"><span className="uiIcon uiIcon-share" aria-hidden="true" />Share an experience</Link>
          <Link href="/explore"><span className="uiIcon uiIcon-analytics" aria-hidden="true" />Explore insights</Link>
        </div>
      </section>

      <nav className="feedRailCard railQuickLinks" aria-label="LinkedOut shortcuts">
        {quickLinks.map((link) => (
          <Link href={link.href} key={link.label}>
            <span className={`uiIcon uiIcon-${link.icon}`} aria-hidden="true" />
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
