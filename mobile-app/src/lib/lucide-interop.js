import { cssInterop } from 'nativewind';
import * as LucideIcons from 'lucide-react-native';

// Dynamically patch all Lucide icons to support the className prop for color and styles in NativeWind v4
for (const key in LucideIcons) {
  const IconComponent = LucideIcons[key];
  if (typeof IconComponent === 'function' || (typeof IconComponent === 'object' && IconComponent !== null)) {
    try {
      cssInterop(IconComponent, {
        className: {
          target: 'style',
          nativeStyleToProp: { color: true }
        }
      });
    } catch (e) {
      // Ignore components that cannot be patched
    }
  }
}
