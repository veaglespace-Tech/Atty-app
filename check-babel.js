const fs = require('fs');
const glob = require('glob');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const files = glob.sync('mobile-app/src/**/*.{js,jsx,ts,tsx}');

let updatedCount = 0;

files.forEach(file => {
  const code = fs.readFileSync(file, 'utf-8');
  if (!code.includes('<Pressable') && !code.includes('<TouchableOpacity')) return;

  try {
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });

    let modified = false;

    traverse(ast, {
      JSXOpeningElement(path) {
        const name = path.node.name.name;
        if (name === 'Pressable' || name === 'TouchableOpacity') {
          // Find className attribute
          const classNameIndex = path.node.attributes.findIndex(attr => 
            attr.type === 'JSXAttribute' && attr.name.name === 'className'
          );

          if (classNameIndex !== -1) {
            const classNameAttr = path.node.attributes[classNameIndex];
            
            // Remove className from Pressable
            path.node.attributes.splice(classNameIndex, 1);
            
            // For now, if the element is self-closing, we need to wrap it
            if (path.node.selfClosing) {
                // Too complex for AST quickly, but we can do it:
                // <Pressable onPress={...} className="X" /> 
                // becomes <Pressable onPress={...}><View className="X" /></Pressable>
            } else {
                // If it has children, we wrap all children in a View
                // <Pressable className="X"> ... </Pressable>
                // becomes <Pressable><View className="X"> ... </View></Pressable>
                const parent = path.parent; // JSXElement
                
                // Create opening View
                const viewOpening = t.jsxOpeningElement(t.jsxIdentifier('View'), [classNameAttr], false);
                const viewClosing = t.jsxClosingElement(t.jsxIdentifier('View'));
                
                // Wrap children
                const viewElement = t.jsxElement(viewOpening, viewClosing, parent.children, false);
                parent.children = [viewElement];
            }
            modified = true;
          }
        }
      }
    });

    if (modified) {
      const newCode = generate(ast, { retainLines: false }).code;
      // Note: Babel generator can mess up some formatting, but it is safe.
      // Wait, retaining formatting is better. Let's just use string replacement carefully.
    }
  } catch (e) {
    // console.log("Parse error in", file);
  }
});
