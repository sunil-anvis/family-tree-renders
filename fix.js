const fs = require('fs');
let content = fs.readFileSync('index.css', 'utf8');

// Fix 1: Properly close .control-panel and move .mobile-menu-btn out of the way
content = content.replace(
    /background: rgba\(40,\s*40,\s*44,\s*0\.7\);\s*\}\s*\.mobile-menu-btn\s*\{\s*display:\s*none;\s*\}\s*backdrop-filter:\s*blur\(15px\);/g,
    'background: rgba(40, 40, 44, 0.7);\n    backdrop-filter: blur(15px);'
);

content = content.replace(
    /max-width: 95vw;\s*\}/,
    'max-width: 95vw;\n}\n\n.mobile-menu-btn {\n    display: none;\n}'
);

// Fix 2: Close the missing @media block
content = content.replace(
    /\.control-panel-mobile,\s*\.member-sidebar-mobile\s*\{\s*position:\s*static\s*!important;\s*\}\s*\/\*\s*Tablet\s*styles\s*\*\//g,
    '.control-panel-mobile,\n    .member-sidebar-mobile {\n        position: static !important;\n    }\n}\n\n/* Tablet styles */'
);

fs.writeFileSync('index.css', content);
console.log('Fixed syntax in index.css');
