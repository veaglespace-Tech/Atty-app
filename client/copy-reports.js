const fs = require('fs');
let content = fs.readFileSync('c:/Users/HP/Desktop/attendee/client/app/org/reports/page.js', 'utf8');

content = content.replace(/useGetOrgReportsQuery/g, 'useGetTeamLeaderReportsQuery');
content = content.replace(/useGetOrgAttendanceQuery/g, 'useGetTeamLeaderAttendanceQuery');
content = content.replace(/useDownloadOrgReportExcelMutation/g, 'useDownloadTeamLeaderReportsExcelMutation');
content = content.replace(/useDownloadOrgReportPdfMutation/g, 'useDownloadTeamLeaderReportsPdfMutation');
content = content.replace(/@\/services\/api\/orgApi/g, '@/services/api/teamLeaderApi');
content = content.replace(/OrgReportsPage/g, 'TeamLeaderReportsPage');
content = content.replace(/Organization Reports/g, 'Team Leader Reports');

fs.writeFileSync('c:/Users/HP/Desktop/attendee/client/app/team-leader/reports/page.js', content);
console.log('Done');
