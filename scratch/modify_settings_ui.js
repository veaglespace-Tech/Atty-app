const fs = require('fs');
const path = require('path');

const filesToModify = [
  path.join(__dirname, '../mobile-app/src/app/org/settings.jsx'),
  path.join(__dirname, '../mobile-app/src/app/super-admin/settings.jsx'),
  path.join(__dirname, '../mobile-app/src/app/team-leader/settings.jsx'),
  path.join(__dirname, '../mobile-app/src/app/member/settings.jsx')
];

for (const file of filesToModify) {
  if (!fs.existsSync(file)) {
    console.log(`Skipping ${file}`);
    continue;
  }

  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Add removeProfileImage state
  if (!content.includes('const [removeProfileImage, setRemoveProfileImage] = useState(false);')) {
    content = content.replace(
      'const [profileImageDataUrl, setProfileImageDataUrl] = useState("");',
      'const [profileImageDataUrl, setProfileImageDataUrl] = useState("");\n  const [removeProfileImage, setRemoveProfileImage] = useState(false);'
    );
  }

  // 2. Add toggleProfileImageRemoval function
  if (!content.includes('const toggleProfileImageRemoval = () => {')) {
    const fnToAdd = `
  const toggleProfileImageRemoval = () => {
    if (removeProfileImage) {
      setRemoveProfileImage(false);
    } else {
      if (profileImageDataUrl) {
        setProfileImageDataUrl("");
      } else if (user?.profileImageUrl) {
        setRemoveProfileImage(true);
      }
    }
  };
`;
    content = content.replace('const handlePickDocument =', fnToAdd + '\n  const handlePickDocument =');
  }

  // 3. Update pickImage function to clear removeProfileImage flag
  content = content.replace(
    'setProfileImageDataUrl(base64Img);',
    'setProfileImageDataUrl(base64Img);\n        setRemoveProfileImage(false);'
  );

  // 4. Update handleUpdate payload for profileImageDataUrl and removeProfileImage
  if (!content.includes('payload.removeProfileImage = true;')) {
    content = content.replace(
      'if (profileImageDataUrl) payload.profileImageDataUrl = profileImageDataUrl;',
      'if (profileImageDataUrl) payload.profileImageDataUrl = profileImageDataUrl;\n      else if (removeProfileImage) payload.removeProfileImage = true;'
    );
  }
  
  if (!content.includes('setRemoveProfileImage(false);', content.indexOf('setProfileImageDataUrl("");'))) {
    content = content.replace(
      'setProfileImageDataUrl("");\n      Alert.alert("Success", "Profile updated successfully!");',
      'setProfileImageDataUrl("");\n      setRemoveProfileImage(false);\n      Alert.alert("Success", "Profile updated successfully!");'
    );
  }

  // 5. Replace Profile Header UI to remove Pressable (make it view-only)
  const profileHeaderRegex = /<Pressable onPress=\{pickImage\} className="relative mb-4 active:scale-95 transition-transform">(.*?)<\/Pressable>/s;
  const newProfileHeader = `<View className="relative mb-4">
            {currentProfileImageUrl ? (
              <Image source={{ uri: currentProfileImageUrl }} resizeMode="contain" className="h-24 w-24 rounded-[2rem] border-4 border-white dark:border-slate-800 bg-white shadow-sm" />
            ) : (
              <View className="h-24 w-24 rounded-[2rem] bg-blue-100 dark:bg-blue-900/30 items-center justify-center border-4 border-white dark:border-slate-800 shadow-sm">
                <User size={40} className="text-blue-600 dark:text-blue-400" />
              </View>
            )}
          </View>`;
  content = content.replace(profileHeaderRegex, newProfileHeader);

  // 6. Insert Profile Photo section before Document Uploader
  const profilePhotoUI = `
              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Profile Photo</Text>
                <View className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                  <Text className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Upload a clear square image to personalize your profile. Max file size: 10 MB.
                  </Text>
                  
                  <View className="flex-row items-center gap-4 mb-3">
                    <View className="flex-1">
                      <View className="flex-row flex-wrap items-center gap-2 mb-3">
                        <Pressable onPress={pickImage} className="flex-row items-center justify-center gap-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl px-4 py-3 active:bg-blue-100 dark:active:bg-blue-500/20">
                          <ImageUp size={16} className="text-blue-600 dark:text-blue-400" />
                          <Text className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                            {currentProfileImageUrl && !removeProfileImage ? "Change Photo" : "Upload Photo"}
                          </Text>
                        </Pressable>

                        {(removeProfileImage || profileImageDataUrl || user?.profileImageUrl) && (
                          <Pressable onPress={toggleProfileImageRemoval} className="flex-row items-center justify-center gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl px-4 py-3 active:bg-rose-100 dark:active:bg-rose-500/20">
                            <Trash2 size={16} className="text-rose-600 dark:text-rose-400" />
                            <Text className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                              {removeProfileImage ? "Keep Current" : profileImageDataUrl ? "Clear Selection" : "Remove"}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                      <Text className="text-[11px] font-semibold text-slate-400">
                        {removeProfileImage ? "Your current profile photo will be removed when you save." : profileImageDataUrl ? "New profile photo is ready. Save changes to publish it." : "Supported formats: JPG, PNG, WEBP. Max: 10 MB."}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5">Document Uploader`;

  if (!content.includes('Upload a clear square image to personalize your profile')) {
    content = content.replace(
      /<View>\s*<Text className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1\.5">Document Uploader/s,
      profilePhotoUI
    );
  }

  // 7. Make sure imports have ImageUp and Trash2
  if (!content.includes('ImageUp,')) {
    content = content.replace('Camera,', 'Camera, ImageUp, Trash2,');
  }

  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
}
console.log('Done!');
