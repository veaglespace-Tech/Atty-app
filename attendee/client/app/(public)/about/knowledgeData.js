export const knowledgeCards = [
  {
    slug: "user-guide",
    title: "User Guide",
    desc: "Complete guidance for workspace setup, onboarding, attendance operations, and reporting.",
    eyebrow: "Setup & Operations",
    accent: "blue",
  },
  {
    slug: "policy-templates",
    title: "Policy Templates",
    desc: "Ready-to-adapt templates for attendance rules, shift policy, and compliance communication.",
    eyebrow: "HR & Compliance",
    accent: "indigo",
  },
  {
    slug: "faqs",
    title: "FAQs",
    desc: "Answers to common questions about roles, attendance flow, subscription, and support.",
    eyebrow: "Support Answers",
    accent: "amber",
  },
];

export const userGuideSections = [
  {
    title: "Organization Launch Checklist",
    audience: "For Organization Admin",
    summary:
      "Set up your workspace before inviting the team so reporting, permissions, and attendance tracking start clean.",
    steps: [
      "Verify your organization profile and confirm your workspace details are correct before onboarding begins.",
      "Set up your team structure - create teams, assign Team Leaders, and define role visibility across Admins, Team Leaders, and Members.",
      "Add your users via Excel bulk import or individual invite, and confirm each person is assigned the correct role.",
      "Test the full flow with one Admin account and one Member account - confirm punch-in, attendance records, and dashboard access before rolling out to the team.",
    ],
  },
  {
    title: "User Approval and Access Flow",
    audience: "For Admin & Sub Admin",
    summary:
      "Keep onboarding fast while controlling who enters the workspace and what each role can manage.",
    steps: [
      "Ask new users to register using the correct organization code so they are linked to the right workspace from the start.",
      "Add users to the platform individually or in bulk using the Excel import feature available in the Users section.",
      "Assign the right role to each user based on their responsibility - Member, Team Leader, Sub Admin, or Org Admin - so they see only what they need.",
      "Confirm the user can sign in and land on the correct dashboard before considering their onboarding complete.",
    ],
  },
  {
    title: "Daily Attendance Workflow",
    audience: "For Team Leaders & Members",
    summary:
      "Use a consistent daily routine so attendance logs stay accurate and managers can spot missing punches early.",
    steps: [
      "Members punch in from within the approved geo-fence location at the start of their shift using their current GPS position.",
      "Team Leaders monitor present, absent, and late statuses from the Attendance section in their dashboard throughout the day.",
      "Members complete punch out at shift close and Team Leaders review any missing or incomplete records before the day ends.",
      "Admins export weekly or monthly attendance summaries from the Reports section for compliance and management review.",
    ],
  },
  {
    title: "Reports and Audit Rhythm",
    audience: "For Admin Leadership",
    summary:
      "Build a repeatable review cycle to turn attendance data into operational decisions.",
    steps: [
      "Review daily attendance records to check for absent members and incomplete punch-outs across your teams.",
      "Run weekly reports to identify patterns, spot staffing gaps, and flag members with consistently irregular attendance.",
      "Export monthly summaries from the Reports section for leadership review and record-keeping - Excel and PDF formats are available for all report ranges.",
      "Raise a support query through Atty if recurring attendance exceptions suggest a platform or access issue that needs investigation.",
    ],
  },
];

export const policyTemplates = [
  {
    title: "Attendance Policy Template",
    focus: "Office, field, and hybrid teams",
    summary:
      "Use this as the base document for defining check-in windows, grace period, missed punch handling, and supervisor approvals.",
    sections: [
      "Working hours, shift window, and weekly off definition",
      "Geo-fence, device use, and location validation requirements",
      "Missed punch correction request and approval path",
      "Escalation matrix for repeated attendance violations",
    ],
  },
  {
    title: "Leave And Late Mark Template",
    focus: "Managers and HR teams",
    summary:
      "Adapt this template when you need a clear structure for leave notice, half-day rules, and repeated late arrival handling.",
    sections: [
      "Leave application timeline and contact rules",
      "Half-day, late mark, and short leave treatment",
      "Manager approval workflow and documentation proof",
      "Monthly review rules for recurring late attendance",
    ],
  },
  {
    title: "Remote And Field Work Compliance Template",
    focus: "Distributed workforces",
    summary:
      "Best for organizations where staff punch from client sites, remote branches, or approved offsite locations.",
    sections: [
      "Approved work locations and role-based exceptions",
      "Location proof, supervisor confirmation, and mobile usage",
      "Connectivity failure fallback process",
      "Security and data handling expectations outside office premises",
    ],
  },
];

export const faqGroups = [
  {
    title: "Getting Started",
    items: [
      {
        question: "How does a user join the correct organization workspace?",
        answer:
          "The user registers or logs in with the organization code assigned to that workspace. After approval, the system routes the user to the dashboard that matches the assigned role.",
      },
      {
        question: "Who can approve new members?",
        answer:
          "Organization admins and authorized sub admins can review pending requests and approve or reject access based on company policy.",
      },
      {
        question: "Can one organization have multiple team leaders?",
        answer:
          "Yes. Team leaders can be assigned to different teams, and their access remains limited to the modules and teams allowed by role permissions.",
      },
    ],
  },
  {
    title: "Attendance Operations",
    items: [
      {
        question: "What happens if a member forgets to punch out?",
        answer:
          "The attendance record remains pending until an admin or team leader reviews it. Teams should define a correction workflow in the attendance policy template for these cases.",
      },
      {
        question: "Can attendance be tracked outside the office?",
        answer:
          "Yes, if the organization allows field or remote attendance. Geo-fence rules, allowed locations, and approval logic should be configured before enabling that workflow.",
      },
      {
        question: "How often should reports be reviewed?",
        answer:
          "A practical rhythm is daily for exceptions, weekly for team trends, and monthly for payroll or compliance exports.",
      },
    ],
  },
  {
    title: "Plans And Support",
    items: [
      {
        question: "Can the organization upgrade plans later?",
        answer:
          "Yes. Plans can be reviewed from the pricing and subscription areas, and larger organizations can request a custom enterprise setup through the support team.",
      },
      {
        question: "Where should policy templates be finalized?",
        answer:
          "The templates on this page are operational starting points. Final legal or HR language should be reviewed internally before publishing to employees.",
      },
      {
        question: "How do we get help during rollout?",
        answer:
          "Use the contact page to reach support for workspace setup, role configuration, or any rollout blocker that needs direct assistance.",
      },
    ],
  },
];
