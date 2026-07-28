const UPDATED = 'July 28, 2026';
const CONTACT = 'vitorpietrobom@gmail.com';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 18, marginBottom: 10 }}>{title}</h2>
      <div style={{ color: 'var(--text-2)', fontSize: 14.5, lineHeight: 1.65 }}>{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', color: 'var(--text)', overflowY: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(28px, 6vw, 64px) clamp(20px, 5vw, 40px) 80px' }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Project Arise</div>
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: 'var(--text-faint)', fontSize: 13, marginBottom: 36 }}>Last updated: {UPDATED}</p>

        <Section title="Overview">
          Project Arise ("the app") is a personal wellness and self-improvement tracker. This policy
          explains what data the app collects, how it is used, and the choices you have. The app is
          operated by an individual and is intended for personal use.
        </Section>

        <Section title="Information We Collect">
          <ul style={{ paddingLeft: 20, display: 'grid', gap: 8 }}>
            <li><strong>Account information.</strong> When you sign in, we store the email address and
              account identifier provided by our authentication provider (Neon Auth).</li>
            <li><strong>Data you enter.</strong> Content you create in the app — quests, tasks, skills,
              weight and body measurements, gym sessions, food and recipe entries, journal notes, and
              similar records.</li>
            <li><strong>WHOOP data (only if you connect WHOOP).</strong> If you choose to link your WHOOP
              account, we access, through WHOOP's official API and with your consent, your recovery,
              sleep, cycle/strain, workout, and basic profile data to display it inside the app.</li>
          </ul>
        </Section>

        <Section title="How We Use Your Information">
          Your information is used solely to operate the app for you — to display your progress,
          statistics, and connected fitness data, and to provide the app's features. We do not use your
          data for advertising, and we do not sell or rent your personal information to anyone.
        </Section>

        <Section title="How Your Data Is Stored">
          Data is stored in a hosted PostgreSQL database (Neon) and the application is hosted on Vercel.
          Access tokens for connected services such as WHOOP are stored to keep your connection active and
          are used only to fetch your data from that service on your behalf.
        </Section>

        <Section title="Third-Party Services">
          The app relies on the following third parties, each governed by its own privacy policy:
          <ul style={{ paddingLeft: 20, display: 'grid', gap: 6, marginTop: 8 }}>
            <li><strong>Neon</strong> — database hosting and authentication.</li>
            <li><strong>Vercel</strong> — application hosting.</li>
            <li><strong>WHOOP</strong> — fitness data, accessed only if you connect your WHOOP account.</li>
          </ul>
        </Section>

        <Section title="Disconnecting WHOOP">
          You can disconnect WHOOP at any time from the Body tab. Disconnecting removes the stored WHOOP
          access tokens and the cached WHOOP snapshot from the app. You may also revoke the app's access
          from within your WHOOP account settings.
        </Section>

        <Section title="Data Retention and Deletion">
          Your data is retained while your account is active. You may request deletion of your account and
          all associated data — including any connected WHOOP data — by contacting us at the address below.
        </Section>

        <Section title="Security">
          We take reasonable measures to protect your information, including encrypted connections (HTTPS)
          and scoped, per-user access controls. No method of transmission or storage is completely secure,
          and we cannot guarantee absolute security.
        </Section>

        <Section title="Children's Privacy">
          The app is not directed to children under 13, and we do not knowingly collect data from them.
        </Section>

        <Section title="Changes to This Policy">
          We may update this policy from time to time. Material changes will be reflected by updating the
          "Last updated" date above.
        </Section>

        <Section title="Contact">
          Questions about this policy or requests regarding your data can be sent to{' '}
          <a href={`mailto:${CONTACT}`} style={{ color: 'var(--accent)' }}>{CONTACT}</a>.
        </Section>

        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--line-soft)' }}>
          <a href="/" style={{ color: 'var(--text-3)', fontSize: 13 }}>← Back to Project Arise</a>
        </div>
      </div>
    </div>
  );
}
