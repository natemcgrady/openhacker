import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { SignOutButton } from "../../components/sign-out-button";
import { auth } from "../../lib/auth";

type TeamPageProps = {
  params: Promise<{
    team: string;
  }>;
};

export default async function TeamPage({ params }: TeamPageProps) {
  const { team } = await params;
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    redirect(`/sign-in?next=/${team}`);
  }

  const organization = await auth.api.getFullOrganization({
    headers: requestHeaders,
    query: {
      organizationSlug: team,
      membersLimit: 100,
    },
  });

  if (!organization) {
    notFound();
  }

  const membership = organization.members.find(
    (member) => member.userId === session.user.id,
  );

  if (!membership) {
    notFound();
  }

  return (
    <main className="page team-page">
      <header className="team-header">
        <Link className="brand" href="/">
          openhacker
        </Link>
        <div className="team-actions">
          <Link className="button" href="/new-team">
            New team
          </Link>
          <SignOutButton />
        </div>
      </header>
      <section className="panel team-hero">
        <p className="eyebrow">Team workspace</p>
        <h1>{organization.name}</h1>
      </section>
      <section className="team-grid">
        <article className="panel">
          <h2>Members</h2>
          <div className="member-list">
            {organization.members.map((member) => (
              <div className="member-row" key={member.id}>
                <div>
                  <strong>{member.user.name}</strong>
                  <span>{member.user.email}</span>
                </div>
                <span className="role-pill">{member.role}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <h2>Next up</h2>
          <p className="muted">
            This workspace is ready for the next product step: connecting a
            deployed OpenHacker agent instance to the team.
          </p>
        </article>
      </section>
    </main>
  );
}
