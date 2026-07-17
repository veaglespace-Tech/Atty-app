const fs = require('fs');
let content = fs.readFileSync('/home/akshay/Desktop/attendee/mobile-app/src/app/org/attendance.jsx', 'utf8');

// Add missing imports
if (!content.includes('import { hasPermission')) {
  // Just safety check
}

// 1. Add Place Search State and Logic
const placeSearchState = `
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [searchPlaceTimeout, setSearchPlaceTimeout] = useState(null);

  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().split('T')[0]);

  const handlePlaceSearch = (text) => {
    setSearchPlace(text);
    if (searchPlaceTimeout) clearTimeout(searchPlaceTimeout);
    
    if (text.length >= 3) {
      setSearchingPlace(true);
      const timeout = setTimeout(async () => {
        try {
          const res = await fetch(\`https://nominatim.openstreetmap.org/search?format=json&q=\${encodeURIComponent(text)}&limit=5\`);
          const data = await res.json();
          setPlaceSuggestions(data);
        } catch (e) {
          console.error("Place search error", e);
        } finally {
          setSearchingPlace(false);
        }
      }, 500);
      setSearchPlaceTimeout(timeout);
    } else {
      setPlaceSuggestions([]);
    }
  };

  const handleSelectPlace = (loc) => {
    setSearchPlace(loc.display_name);
    setLat(loc.lat);
    setLng(loc.lon);
    setPlaceSuggestions([]);
  };
`;

content = content.replace('const [searchPlace, setSearchPlace] = useState("");', 'const [searchPlace, setSearchPlace] = useState("");\n' + placeSearchState);

// 2. Query period override
content = content.replace('const { data, isLoading, isFetching, refetch } = useGetOrgAttendanceQuery(`period=${period}`);', 
  'const queryString = period === "custom" ? `period=custom&from=${customFrom}&to=${customTo}` : `period=${period}`;\n  const { data, isLoading, isFetching, refetch } = useGetOrgAttendanceQuery(queryString);');

// 3. Export PDF/Excel override
content = content.replace(/downloadOrgAttendancePdf\(\`period=\\?\$\{period\}\`\)/g, 'downloadOrgAttendancePdf(queryString)');
content = content.replace(/downloadOrgAttendanceExcel\(\`period=\\?\$\{period\}\`\)/g, 'downloadOrgAttendanceExcel(queryString)');


// 4. Update the Report Period Filter UI to match Web layout precisely
const periodFilterRegex = /<View className="flex-1 min-w-\[140px\]">\s*<Text className="text-\[10px\] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Report Period<\/Text>\s*<DropdownFilter[\s\S]*?\]\}\s*\/>\s*<\/View>/;

const newPeriodFilter = `
            <View className="flex-[1.5] min-w-[200px]">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Report Period</Text>
              <View className="flex-row gap-2">
                <Pressable 
                  onPress={() => setPeriod('custom')} 
                  className={\`px-4 py-3.5 rounded-xl border flex-row items-center justify-center \${period === 'custom' ? 'bg-blue-600 border-blue-600 shadow-sm shadow-blue-500/30' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 active:bg-slate-100 dark:active:bg-slate-800'}\`}
                >
                  <Text className={\`text-[11px] font-black uppercase tracking-widest \${period === 'custom' ? 'text-white' : 'text-slate-700 dark:text-slate-400'}\`}>Custom</Text>
                </Pressable>
                <View className="flex-1">
                  <DropdownFilter
                    label="Standard Periods"
                    value={period}
                    onSelect={setPeriod}
                    options={[
                      { label: "Weekly", value: "weekly" },
                      { label: "Monthly", value: "monthly" }
                    ]}
                  />
                </View>
              </View>
            </View>`;
            
content = content.replace(periodFilterRegex, newPeriodFilter);

// 5. Add Custom Date Pickers below the filters if period === 'custom'
const afterFiltersRegex = /(<View className="mt-4">\s*<Text className="text-\[10px\] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Search Member<\/Text>[\s\S]*?<\/View>\s*<\/View>)/;

const customDatePickers = `
          {period === 'custom' && (
            <View className="mt-4 flex-row gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
              <View className="flex-1">
                <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">From Date</Text>
                <TextInput 
                  value={customFrom} onChangeText={setCustomFrom} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-3.5 text-[13px] font-semibold text-slate-900 dark:text-white"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-2">To Date</Text>
                <TextInput 
                  value={customTo} onChangeText={setCustomTo} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-3.5 text-[13px] font-semibold text-slate-900 dark:text-white"
                />
              </View>
            </View>
          )}
`;

content = content.replace(afterFiltersRegex, '$1' + customDatePickers);

// 6. Fix Place Search AutoComplete UI
const placeSearchUIRegex = /<View className="relative mb-4 z-40">\s*<Search size=\{16\} className="absolute left-4 top-3.5 text-slate-400 z-10" \/>\s*<TextInput\s*value=\{searchPlace\}\s*onChangeText=\{setSearchPlace\}[\s\S]*?className="bg-slate-50 dark:bg-slate-800\/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"\s*\/>\s*<\/View>/;

const newPlaceSearchUI = `
              <View className="relative mb-4 z-40">
                <Search size={16} className="absolute left-4 top-3.5 text-slate-400 z-10" />
                <TextInput 
                  value={searchPlace}
                  onChangeText={handlePlaceSearch}
                  placeholder="Search for a place (e.g. Pune Station)"
                  placeholderTextColor="#94a3b8"
                  editable={canSetWorkspaceLocation || (canManageTeamAttendance && !!teamId)}
                  className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm font-semibold text-slate-900 dark:text-white"
                />
                {searchingPlace && <ActivityIndicator size="small" color="#94a3b8" className="absolute right-4 top-3" />}
                
                {placeSuggestions.length > 0 && (
                  <View className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xl z-50">
                    <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" className="max-h-48">
                      {placeSuggestions.map((loc, i) => (
                        <Pressable 
                          key={i} 
                          onPress={() => handleSelectPlace(loc)}
                          className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 active:bg-slate-50 dark:active:bg-slate-700/50"
                        >
                          <Text className="text-[13px] font-semibold text-slate-900 dark:text-white" numberOfLines={2}>
                            {loc.display_name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>`;

content = content.replace(placeSearchUIRegex, newPlaceSearchUI);

fs.writeFileSync('/home/akshay/Desktop/attendee/mobile-app/src/app/org/attendance.jsx', content);
console.log('Done patching attendance.jsx');
