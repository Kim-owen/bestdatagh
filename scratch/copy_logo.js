import fs from 'fs';

const src = `C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\0378f60e-dc43-4321-8bcf-866892f24380\\bestdata_treasure_logo_1784869648438.png`;
const destLogo = `c:\\Users\\hp\\Downloads\\Ghana Data Hub\\public\\logo.png`;
const destIcon = `c:\\Users\\hp\\Downloads\\Ghana Data Hub\\public\\favicon.png`;

fs.copyFileSync(src, destLogo);
fs.copyFileSync(src, destIcon);
console.log("Logo successfully copied to public/logo.png and public/favicon.png!");
