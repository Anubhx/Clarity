import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-bg-circles">
          <div className="auth-bg-circle" style={{ width: 500, height: 500, background: "var(--color-coral)", bottom: -200, left: -150 }} />
          <div className="auth-bg-circle" style={{ width: 250, height: 250, background: "var(--color-blue)", top: -60, right: -40 }} />
        </div>
        <div>
          <div className="auth-logo">
            <div className="auth-logo-mark">✦</div>
            <span className="auth-logo-text">Clarity</span>
          </div>
          <div className="auth-tagline">
            Welcome back.<br />
            Your research <em>awaits.</em>
          </div>
        </div>
        <div className="auth-testimonial">
          <p>&ldquo;I used Clarity before every design review. Being able to say &lsquo;this is backed by the research doc, section 3&rsquo; is a career-level skill.&rdquo;</p>
          <div className="auth-testimonial-author">
            <div className="auth-testimonial-avatar" style={{ background: "var(--color-amber)", color: "var(--color-amber-dark)" }}>PM</div>
            <div>
              <div className="auth-testimonial-name">Priya Menon</div>
              <div className="auth-testimonial-role">Product Designer, Swiggy</div>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-right">
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full max-w-[380px]",
              card: "shadow-none border-none bg-transparent p-0",
              headerTitle: "text-heading-xl text-[var(--color-ink)]",
              headerSubtitle: "text-body-md text-[var(--color-ink-secondary)]",
              formButtonPrimary:
                "bg-[var(--color-blue)] hover:bg-[var(--color-blue-dark)] text-white rounded-[var(--r-md)] h-10 text-sm font-medium",
              formFieldInput:
                "border-[var(--color-border)] rounded-[var(--r-md)] h-10 text-sm focus:border-[var(--color-blue)]",
              socialButtonsBlockButton:
                "border-[var(--color-border)] rounded-[var(--r-md)] h-10 text-sm hover:bg-[var(--color-surface)]",
              footerActionLink: "text-[var(--color-blue)] font-medium",
            },
          }}
        />
      </div>
    </div>
  );
}
