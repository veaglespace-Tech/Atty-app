const fs = require('fs');
let content = fs.readFileSync('/home/akshay/Desktop/attendee/mobile-app/src/app/org/attendance.jsx', 'utf8');

// 1. Add DropdownFilter and ExportDropdown components before OrgAttendancePage
const dropdownComponents = `
const DropdownFilter = ({ label, value, options, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || label;
  
  return (
    <View className="flex-1 min-w-[140px]">
      <Pressable onPress={() => setOpen(true)} className="flex-row items-center justify-between px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl active:bg-slate-100 dark:active:bg-slate-800/80">
        <Text className="text-[13px] font-bold text-slate-700 dark:text-slate-300 mr-2" numberOfLines={1}>{selectedLabel}</Text>
        <ChevronDown size={14} className="text-slate-400" />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent={true} onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40 dark:bg-black/60" onPress={() => setOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-950 rounded-t-[32px] pt-4 pb-8 max-h-[80%] border-t border-slate-200 dark:border-slate-800 shadow-2xl">
            <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6" />
            <Text className="text-xl font-black text-slate-900 dark:text-white px-6 mb-4">{label}</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {options.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => { onSelect(opt.value); setOpen(false); }}
                  className={\`px-5 py-4 mb-2 rounded-2xl flex-row items-center justify-between \${value === opt.value ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30' : 'bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 active:bg-slate-100 dark:active:bg-slate-800'}\`}
                >
                  <Text className={\`text-[15px] font-bold \${value === opt.value ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}\`}>{opt.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const ExportDropdown = ({ onPdf, onExcel, loadingPdf, loadingExcel }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} className="flex-row items-center gap-2 bg-blue-500 dark:bg-blue-600 px-5 py-2.5 rounded-full shadow-sm shadow-blue-500/20 active:opacity-80">
        <Download size={16} color="#fff" />
        <Text className="text-white text-sm font-bold">Export</Text>
        <ChevronDown size={14} color="#fff" />
      </Pressable>
      <Modal visible={open} animationType="slide" transparent={true} onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40 dark:bg-black/60" onPress={() => setOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-950 rounded-t-[32px] pt-4 pb-8 max-h-[80%] border-t border-slate-200 dark:border-slate-800 shadow-2xl">
            <View className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6" />
            <Text className="text-xl font-black text-slate-900 dark:text-white px-6 mb-4">Export Options</Text>
            <View className="px-4 gap-3">
              <Pressable onPress={() => { setOpen(false); onPdf(); }} disabled={loadingPdf} className="flex-row items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                {loadingPdf ? <ActivityIndicator size="small" /> : <FileBox size={18} className="text-slate-600 dark:text-slate-400" />}
                <Text className="text-[15px] font-bold text-slate-700 dark:text-slate-300">Export as PDF</Text>
              </Pressable>
              <Pressable onPress={() => { setOpen(false); onExcel(); }} disabled={loadingExcel} className="flex-row items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                {loadingExcel ? <ActivityIndicator size="small" /> : <FileText size={18} className="text-slate-600 dark:text-slate-400" />}
                <Text className="text-[15px] font-bold text-slate-700 dark:text-slate-300">Export as Excel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};
`;
content = content.replace('export default function OrgAttendancePage() {', dropdownComponents + '\nexport default function OrgAttendancePage() {');

// 2. Replace the Header section (lines ~141 to 193)
const headerRegex = /<View className="flex-1 bg-slate-50 dark:bg-slate-950">[\s\S]*?(?=<ScrollView)/;

const newHeader = `<View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-5 pt-6 pb-6 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Organization Attendance</Text>
        </View>
        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">
          Configure organization geofence and monitor team attendance logs.
        </Text>
        
        <View className="flex-row gap-2 flex-wrap">
          <ExportDropdown 
            loadingPdf={downloadingPdf} 
            loadingExcel={downloadingExcel}
            onPdf={async () => {
              try {
                const blob = await downloadOrgAttendancePdf(\`period=\${period}\`).unwrap();
                if (Platform.OS === 'web') {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = \`attendance-report-\${period}.pdf\`;
                  document.body.appendChild(a); a.click(); a.remove();
                } else {
                  ToastAndroid.show("PDF download simulated", ToastAndroid.SHORT);
                }
              } catch (e) { Alert.alert("Error", "Failed to download PDF"); }
            }}
            onExcel={async () => {
              try {
                const blob = await downloadOrgAttendanceExcel(\`period=\${period}\`).unwrap();
                if (Platform.OS === 'web') {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = \`attendance-report-\${period}.xlsx\`;
                  document.body.appendChild(a); a.click(); a.remove();
                } else {
                  ToastAndroid.show("Excel download simulated", ToastAndroid.SHORT);
                }
              } catch (e) { Alert.alert("Error", "Failed to download Excel"); }
            }}
          />
          <Pressable 
            onPress={handleRefresh}
            className="flex-row items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-full active:opacity-80"
          >
            <RefreshControl refreshing={isFetching || loadingSettings} style={{display: 'none'}} />
            <Text className="text-slate-700 dark:text-slate-300 text-sm font-bold">Refresh</Text>
          </Pressable>
        </View>
      </View>

      `;
content = content.replace(headerRegex, newHeader);

// 3. Replace the Filters section
const filterRegex = /\{\/\* FILTERS \*\/\}\s*<View className="bg-white dark:bg-slate-900 rounded-\[24px\] p-5 border border-slate-200 dark:border-slate-800 mb-6">[\s\S]*?(?=\{\/\* SUMMARY CARDS \*\/\})/;
const newFilters = `{/* FILTERS */}
        <View className="mt-6 mx-4 bg-white dark:bg-[#0f172a] rounded-[24px] border border-slate-200 dark:border-slate-800/80 overflow-hidden mb-6 p-5">
          <View className="flex-row flex-wrap gap-4">
            <View className="flex-1 min-w-[140px]">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Filter By Status</Text>
              <DropdownFilter
                label="All Statuses"
                value={statusFilter}
                onSelect={setStatusFilter}
                options={[
                  { label: "All Statuses", value: "ALL" },
                  { label: "Present", value: "PRESENT" },
                  { label: "Absent", value: "ABSENT" },
                  { label: "Half Day", value: "HALF_DAY" }
                ]}
              />
            </View>
            <View className="flex-1 min-w-[140px]">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Report Period</Text>
              <DropdownFilter
                label="Monthly"
                value={period}
                onSelect={setPeriod}
                options={[
                  { label: "Weekly", value: "weekly" },
                  { label: "Monthly", value: "monthly" }
                ]}
              />
            </View>
          </View>
          <View className="mt-4">
             <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Search Member</Text>
             <View className="flex-row items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-3">
               <Search size={16} className="text-slate-400" />
               <TextInput
                 value={search} onChangeText={setSearch} placeholder="Name or email..." placeholderTextColor="#94a3b8"
                 className="flex-1 ml-3 text-[13px] font-semibold text-slate-900 dark:text-white outline-none"
               />
             </View>
          </View>
        </View>
        `;
content = content.replace(filterRegex, newFilters);

// 4. Update the settings container background to match #0f172a
content = content.replace(/className="bg-white dark:bg-slate-900 rounded-\[24px\] p-5 border border-slate-200 dark:border-slate-800 mb-6 relative"/g, 'className="mx-4 bg-white dark:bg-[#0f172a] rounded-[24px] p-5 border border-slate-200 dark:border-slate-800/80 mb-6 relative"');
content = content.replace(/<Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-2">Attendance Settings<\/Text>/g, '<Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 ml-6 mt-2">Attendance Settings</Text>');

// 5. Wrap the Logs in a #0f172a container
const logsRegex = /\{\/\* LOGS \*\/\}\s*<Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 ml-2">Attendance Logs<\/Text>([\s\S]*?)<\/ScrollView>/;

const newLogs = `{/* LOGS */}
        <View className="mx-4 bg-white dark:bg-[#0f172a] rounded-[24px] border border-slate-200 dark:border-slate-800/80 overflow-hidden mb-8">
          <View className="px-5 pt-5 pb-3">
            <Text className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Attendance Logs</Text>
          </View>
          
          <View className="px-5 pb-4">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Showing {records.length > 0 ? \`\${startIndex}-\${endIndex} of \${records.length}\` : '0'} attendance records
            </Text>
          </View>
          
          <View className="divide-y divide-slate-100 dark:divide-slate-800/80 border-t border-slate-100 dark:border-slate-800/80 p-5">
$1
          </View>
        </View>
      </ScrollView>`;

// We have to extract $1 cleanly. Let's do it with replace
content = content.replace(logsRegex, function(match, p1) {
    return newLogs.replace('$1', p1);
});

// Update the cards layout slightly to match the 4-column flow on mobile
const cardsRegex = /\{\/\* SUMMARY CARDS \*\/\}\s*<View className="flex-row flex-wrap justify-between mb-4">[\s\S]*?<MetricCard[\s\S]*?Absent[\s\S]*?<\/View>/;
const newCards = `{/* SUMMARY CARDS */}
        <View className="mx-4 flex-row flex-wrap justify-between mb-6 gap-y-3">
          <View className="w-[48%]">
            <MetricCard label="Records" value={getSummaryValue("Total Logs")} bgClass="bg-[#0B1A3A] dark:bg-[#07122C] border-slate-800/80" textClass="text-white" />
          </View>
          <View className="w-[48%]">
            <MetricCard label="Present" value={getSummaryValue("Present")} bgClass="bg-[#0B1A3A] dark:bg-[#07122C] border-slate-800/80" textClass="text-white" />
          </View>
          <View className="w-[48%]">
            <MetricCard label="Half Day" value={getSummaryValue("Half Day") || 0} bgClass="bg-[#0B1A3A] dark:bg-[#07122C] border-slate-800/80" textClass="text-white" />
          </View>
          <View className="w-[48%]">
            <MetricCard label="Absent" value={getSummaryValue("Absent")} bgClass="bg-[#0B1A3A] dark:bg-[#07122C] border-slate-800/80" textClass="text-white" />
          </View>
        </View>`;

content = content.replace(cardsRegex, newCards);

fs.writeFileSync('/home/akshay/Desktop/attendee/mobile-app/src/app/org/attendance.jsx', content);
console.log('Successfully updated attendance.jsx!');
