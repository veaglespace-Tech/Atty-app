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
      "Set up the workspace foundation before inviting the team so reporting, permissions, and attendance rules start clean.",
    steps: [
      "Verify organization profile, branding, and workspace code before user onboarding begins.",
      "Configure team structure, reporting owners, and role visibility for admins, team leaders, and members.",
      "Review attendance settings such as allowed radius, working hours, and exception handling.",
      "Test the login flow with one admin and one member account before full rollout.",
    ],
  },
  {
    title: "User Approval And Access Flow",
    audience: "For Admin & Sub Admin",
    summary:
      "Keep onboarding fast while controlling who enters the workspace and what each role can manage.",
    steps: [
      "Ask new users to register with the correct organization code and approved email or mobile details.",
      "Review pending requests in the organization dashboard and approve only verified members.",
      "Assign the right role based on responsibility, team ownership, and reporting access.",
      "Confirm active status after approval so the user can sign in and reach the correct dashboard.",
    ],
  },
  {
    title: "Daily Attendance Workflow",
    audience: "For Team Leaders & Members",
    summary:
      "Use a consistent daily routine so attendance logs stay accurate and managers can spot missing punches early.",
    steps: [
      "Members punch in from the approved location or geo-fence at the start of the shift.",
      "Team leaders monitor present, absent, and pending punch-out cases from the attendance dashboard.",
      "Members complete punch out at shift close and leaders review exceptions before the day ends.",
      "Admins export weekly or monthly summaries for payroll, compliance, and management review.",
    ],
  },
  {
    title: "Reports And Audit Rhythm",
    audience: "For Admin Leadership",
    summary:
      "Build a repeatable review cycle to turn attendance data into operational decisions and policy updates.",
    steps: [
      "Check late arrivals, missing punches, and inactive users at least once per day.",
      "Review team-level reports weekly to identify trends, staffing gaps, and policy misuse.",
      "Export monthly reports for payroll coordination, leadership review, and archive storage.",
      "Update attendance policy when recurring exceptions show a process problem instead of individual error.",
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
