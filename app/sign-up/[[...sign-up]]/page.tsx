import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-bg-circles">
          <div className="auth-bg-circle" style={{ width: 400, height: 400, background: "var(--color-blue)", top: -100, left: -100 }} />
          <div className="auth-bg-circle" style={{ width: 300, height: 300, background: "var(--color-amber)", bottom: 50, right: -80 }} />
        </div>
        <div>
          <div className="auth-logo">
            <div className="auth-logo-mark">✦</div>
            <span className="auth-logo-text">Clarity</span>
          </div>
          <div className="auth-tagline">
            Research smarter.<br />
            Design with <em>confidence.</em>
          </div>
          <p className="auth-subtitle">
            Join designers and PMs who use Clarity to query documents, uncover gaps and present findings with confidence.
          </p>
        </div>
        <div className="auth-testimonial">
          <p>&ldquo;Clarity found a contradiction between our PRD and research notes that we&rsquo;d missed for three sprints. It saved our launch.&rdquo;</p>
          <div className="auth-testimonial-author">
            <div className="auth-testimonial-avatar">SR</div>
            <div>
              <div className="auth-testimonial-name">Sneha Rao</div>
              <div className="auth-testimonial-role">Senior Product Designer, Razorpay</div>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-right">
        <SignUp
          routing="path"
          path="/sign-up"
          fallbackRedirectUrl="/chat"
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
