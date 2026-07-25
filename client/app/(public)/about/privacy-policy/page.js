import KnowledgePageShell from "@/components/knowledge/KnowledgePageShell";

export default function PrivacyPolicyPage() {
  return (
    <KnowledgePageShell
      eyebrow="Legal & Privacy"
      title="Privacy Policy"
      description="Last Updated: 22 July 2026. This Privacy Policy explains what information we collect, how we use it, how we protect it, and your rights regarding your information."
      ctaLabel="Contact Support"
    >
      <div className="prose prose-slate prose-blue mx-auto mt-12 max-w-4xl rounded-[2.25rem] border border-slate-100 bg-white/85 p-8 shadow-[0_30px_84px_rgba(59,130,246,0.12),0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/78 dark:prose-invert sm:p-12">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-0 mb-6">1. Introduction</h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Veagle Space Technology Pvt. Ltd. ("we", "us", or "our") operates the Veagle Attendee mobile application ("App").
        </p>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
          This Privacy Policy explains what information we collect, how we use it, how we protect it, and your rights regarding your information.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">2. Information We Collect</h2>
        
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-2">Personal Information</h3>
        <p className="text-slate-600 dark:text-slate-300 mb-2">We may collect:</p>
        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-1 mb-6">
          <li>Name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>User ID or account ID</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-2">Location Information</h3>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
          When you use location-based attendance features, we may collect precise location information from your device.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-2">Attendance and Work Information</h3>
        <p className="text-slate-600 dark:text-slate-300 mb-2">We may collect:</p>
        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-1 mb-6">
          <li>Check-in and check-out records</li>
          <li>Attendance dates and times</li>
          <li>Work duration</li>
          <li>Shift information</li>
          <li>Team and workspace information</li>
          <li>Attendance requests and related information</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-2">Other Information</h3>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
          We may collect other information that you submit through the App as necessary to provide its features.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">3. How We Use Information</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-2">We use collected information to:</p>
        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-1 mb-8">
          <li>Create and manage user accounts</li>
          <li>Authenticate users</li>
          <li>Manage attendance</li>
          <li>Enable location-based check-in and check-out</li>
          <li>Verify attendance locations</li>
          <li>Manage teams, users, and workspaces</li>
          <li>Process attendance-related requests</li>
          <li>Provide notifications and app functionality</li>
          <li>Generate attendance and workplace reports</li>
          <li>Maintain and improve the App</li>
          <li>Protect the security of the App</li>
        </ul>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">4. Location Information</h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          Veagle Attendee may request access to your precise location when you use location-based attendance features.
        </p>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          Location information is used to support attendance check-in and check-out and verify the location associated with attendance activities.
        </p>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
          You can control location permissions through your device settings. Disabling location access may prevent certain location-based features from working.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">5. How We Share Information</h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          We do not sell personal information.
        </p>
        <p className="text-slate-600 dark:text-slate-300 mb-2">
          We may share information with service providers that help us operate the App, such as:
        </p>
        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-1 mb-4">
          <li>Hosting and server providers</li>
          <li>Database and infrastructure providers</li>
          <li>Notification providers</li>
          <li>Security and technical service providers</li>
        </ul>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
          We may also disclose information when required by law or when necessary to protect our users, services, or legal rights.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">6. Data Storage and Security</h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          Your information may be transmitted to and stored on servers used to operate the App.
        </p>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          We use reasonable technical and organizational measures to protect information against unauthorized access, alteration, disclosure, or destruction.
        </p>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
          However, no electronic transmission or storage system can be guaranteed to be completely secure.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">7. Data Retention</h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
          We retain information for as long as necessary to provide our services, maintain business records, comply with legal obligations, resolve disputes, and enforce our agreements.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">8. Your Rights</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-2">Depending on applicable law, you may request:</p>
        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-1 mb-4">
          <li>Access to your personal information</li>
          <li>Correction of inaccurate information</li>
          <li>Deletion of your information</li>
          <li>Information about how your data is used</li>
        </ul>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
          For privacy-related requests, contact us using the details below.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">9. Children's Privacy</h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
          Veagle Attendee is intended for organizations and their authorized users. We do not knowingly collect personal information from children in violation of applicable laws.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">10. Changes to This Privacy Policy</h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
          We may update this Privacy Policy from time to time. We will update the Last Updated date when changes are made.
        </p>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4">11. Contact Us</h2>
        <div className="rounded-2xl bg-slate-50 p-6 dark:bg-slate-900">
          <p className="font-semibold text-slate-900 dark:text-white mb-4">Veagle Space Technology Pvt. Ltd.</p>
          <p className="text-slate-600 dark:text-slate-300 mb-2">For privacy-related questions or requests:</p>
          <p className="text-slate-600 dark:text-slate-300 mb-2"><strong>Email:</strong> support@veaglespace.com</p>
          <p className="text-slate-600 dark:text-slate-300"><strong>Website:</strong> <a href="https://atty.veaglespace.com" className="text-blue-600 hover:underline dark:text-blue-400">https://atty.veaglespace.com</a></p>
        </div>
      </div>
    </KnowledgePageShell>
  );
}
