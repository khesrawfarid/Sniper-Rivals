const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<span className={\`text-xl font-bold truncate w-full text-center \${p.id === myId ? 'text-yellow-400' : 'text-white'}\`}>`;
const replacement = `<div className={\`text-xl font-bold w-full flex justify-center \${p.id === myId ? 'text-yellow-400' : 'text-white'}\`}>
                        <div className="truncate relative max-w-full inline-flex">`;

content = content.replace(target, replacement);

content = content.replace(
  `}
                      </span>`,
  `}
                        </div>
                      </div>`
);

fs.writeFileSync('src/App.tsx', content);
