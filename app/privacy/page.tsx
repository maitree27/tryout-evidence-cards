import { AuthShell } from "@/components/aura/auth-shell";
import { NOTICE_VERSION } from "@/lib/consent";

export const metadata = { title: "Privacy notice · Willow" };

// Plain-English draft. Have a lawyer check it for your country before real students use the app.
export default function PrivacyPage() {
  return (
    <AuthShell title="Privacy notice" subtitle={`Version ${NOTICE_VERSION}`} wide>
      <div className="space-y-6">

      <section className="space-y-2">
        <h2>What Willow is</h2>
        <p className="text-sm">Willow helps cricket coaches and players look at batting technique. A coach or player uploads a short video, and the app measures body positions and gives scores and written feedback.</p>
      </section>

      <section className="space-y-2">
        <h2>What we keep</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>The player's name, batting hand, and whether they are under 18.</li>
          <li>The videos that are uploaded, and the body-position points measured from them.</li>
          <li>Scores, written feedback, and notes the coach writes.</li>
          <li>Login details (email) for coaches and for players who are invited.</li>
          <li>Who gave consent for a player, in what role, and when.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>Who can see it</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Videos are private. There are no public links. They can only be opened by the player, their coach, and the technology providers that store and process them (below).</li>
          <li>A coach sees only their own students. A player sees only their own videos and results.</li>
          <li>Coach notes are private unless the coach chooses to share a note with the player.</li>
          <li>We do not sell data, show ads, or use videos to train AI models.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>Services that handle the data</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li><strong>Supabase</strong> stores accounts, videos and results.</li>
          <li><strong>An AI service</strong> (Google Gemini or OpenAI, depending on how Willow is set up) receives only finished scores and measurements, never the video or the player's name, so it can write the feedback sentences.</li>
          <li><strong>Vercel</strong> runs the website.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>Children</h2>
        <p className="text-sm">Players under 18 can only use Willow through a coach, and only after a parent or guardian accepts this notice for them. Players under 18 cannot create an account on their own. A parent or guardian can ask the coach at any time to see or delete the player's data.</p>
      </section>

      <section className="space-y-2">
        <h2>Accounts without a coach</h2>
        <p className="text-sm">People aged 18 or over can create their own account for personal use. Only that person can see their videos and scores. We limit new clips to 5 per day on these accounts.</p>
      </section>

      <section className="space-y-2">
        <h2>Deleting data</h2>
        <p className="text-sm">A coach can permanently delete a student. That removes the student&apos;s record, videos and video files, scores, notes and consent record. To ask for deletion, contact your coach. If you signed up on your own, you can delete all your data yourself from your home page, using &ldquo;Delete my data&rdquo;.</p>
      </section>

      <section className="space-y-2">
        <h2>Limits you should know about</h2>
        <p className="text-sm">Scores are automatic estimates from video. They are not a coach&apos;s judgement and can be wrong. Willow is a prototype and should not be the only basis for training or selection decisions.</p>
      </section>
      </div>
    </AuthShell>
  );
}
