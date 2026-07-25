const fs = require('fs');
const path = require('path');

const filesToFix = [
  'mobile-app/src/app/org/settings.jsx',
  'mobile-app/src/app/member/settings.jsx',
  'mobile-app/src/app/team-leader/settings.jsx',
  'mobile-app/src/app/super-admin/settings.jsx',
  'mobile-app/src/components/settings/OrgDetailsSettings.jsx'
];

function refactorPressable(content) {
  // We want to find <Pressable ... className="something" ...> and change it to <Pressable ...><View className="something" ...>
  // and correspondingly change </Pressable> to </View></Pressable>
  // This is a bit tricky with regex, so we'll do some specific replacements for the known ones.
  
  let newContent = content;
  
  // 1. Org/settings back button
  newContent = newContent.replace(
    /<Pressable \s*onPress=\{\(\) => \{\s*if \(router\.canGoBack\(\)\) \{\s*router\.back\(\);\s*\} else \{\s*router\.replace\(\"\/org\/dashboard\"\);\s*\}\s*\}\}\s*className=\"(.*?)\">/s,
    `<Pressable onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/org/dashboard");
            }
          }}>
          <View className="$1">`
  );
  
  // Back buttons for others
  newContent = newContent.replace(
    /<Pressable onPress=\{\(\) => router\.back\(\)\} className=\"(.*?)\"\s*>/g,
    `<Pressable onPress={() => router.back()}><View className="$1">`
  );
  newContent = newContent.replace(
    /<Pressable onPress=\{\(\) => router\.canGoBack\(\) \? router\.back\(\) : router\.replace\('\/super-admin\/dashboard'\)\} className=\"(.*?)\"\s*>/g,
    `<Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/super-admin/dashboard')}><View className="$1">`
  );
  
  // handleUpdate
  newContent = newContent.replace(
    /<Pressable\s*onPress=\{handleUpdate\}\s*disabled=\{isLoading\}\s*className=\{`(.*?)`\}>/s,
    `<Pressable onPress={handleUpdate} disabled={isLoading}><View className={\`$1\`}>`
  );
  
  // copyCodeToClipboard
  newContent = newContent.replace(
    /<Pressable \s*onPress=\{copyCodeToClipboard\}\s*className=\"(.*?)\"\s*>/s,
    `<Pressable onPress={copyCodeToClipboard}><View className="$1">`
  );
  
  // copyToClipboard
  newContent = newContent.replace(
    /<Pressable \s*onPress=\{copyToClipboard\}\s*className=\"(.*?)\"\s*>/s,
    `<Pressable onPress={copyToClipboard}><View className="$1">`
  );
  
  // handleResetPassword
  newContent = newContent.replace(
    /<Pressable\s*onPress=\{handleResetPassword\}\s*disabled=\{isResetting\}\s*className=\{`(.*?)`\}>/s,
    `<Pressable onPress={handleResetPassword} disabled={isResetting}><View className={\`$1\`}>`
  );
  
  // OrgDetailsSettings.jsx handleSave
  newContent = newContent.replace(
    /<Pressable\s*onPress=\{handleSave\}\s*disabled=\{isUpdating\}\s*className=\{`(.*?)`\}>/s,
    `<Pressable onPress={handleSave} disabled={isUpdating}><View className={\`$1\`}>`
  );

  // Now we need to fix the closing tags.
  // For each of the specific buttons, let's just do a manual replace of their closing tags based on their contents.
  
  // ChevronLeft (back button)
  newContent = newContent.replace(
    /<ChevronLeft size=\{20\} className=\"text-slate-700 dark:text-slate-300\" \/>\s*<\/Pressable>/s,
    `<ChevronLeft size={20} className="text-slate-700 dark:text-slate-300" />\n        </View></Pressable>`
  );
  
  // ArrowLeft (other back buttons)
  newContent = newContent.replace(
    /<ArrowLeft size=\{20\} className=\"text-slate-700 dark:text-white\" \/>\s*<\/Pressable>/g,
    `<ArrowLeft size={20} className="text-slate-700 dark:text-white" />\n            </View></Pressable>`
  );
  
  // Save Profile Changes
  newContent = newContent.replace(
    /<\/Text>\s*<\/>\s*\)\}\s*<\/Pressable>/s,
    `</Text>\n                  </>\n                )}\n              </View></Pressable>`
  );
  
  // Copied Referral Code
  newContent = newContent.replace(
    /Copy Code<\/Text>\s*<\/>\s*\)\}\s*<\/Pressable>/g,
    `Copy Code</Text>\n                          </>\n                        )}\n                      </View></Pressable>`
  );
  
  // Copied Referral Link
  newContent = newContent.replace(
    /Copy Link<\/Text>\s*<\/>\s*\)\}\s*<\/Pressable>/g,
    `Copy Link</Text>\n                          </>\n                        )}\n                      </View></Pressable>`
  );
  
  // Request Password Reset
  newContent = newContent.replace(
    /Request Password Reset<\/Text>\s*\)\}\s*<\/Pressable>/s,
    `Request Password Reset</Text>\n                )}\n              </View></Pressable>`
  );
  
  // Save Details
  newContent = newContent.replace(
    /Save Details<\/Text>\s*\)\}\s*<\/Pressable>/s,
    `Save Details</Text>\n            )}\n          </View></Pressable>`
  );

  return newContent;
}

filesToFix.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const newContent = refactorPressable(content);
    if (content !== newContent) {
      fs.writeFileSync(fullPath, newContent);
      console.log(`Updated ${file}`);
    }
  }
});