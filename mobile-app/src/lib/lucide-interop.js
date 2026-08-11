import { cssInterop } from 'nativewind';
import * as LucideIcons from 'lucide-react-native';

// Dynamically patch all Lucide icons to support the className prop for color and styles in NativeWind v4
// Only patch actual React forward-ref components (which all Lucide icons are).
// Skipping plain objects, factory functions, or non-component exports prevents
// the interop map from being poisoned with broken wrappers on the web renderer.
for (const key in LucideIcons) {
  const IconComponent = LucideIcons[key];
  // Lucide icons are forwardRef components — they are objects with a $$typeof symbol
  const isForwardRef =
    IconComponent !== null &&
    typeof IconComponent === 'object' &&
    (IconComponent.$$typeof === Symbol.for('react.forward_ref') ||
      IconComponent.$$typeof === Symbol.for('react.memo'));
  if (!isForwardRef) continue;
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
