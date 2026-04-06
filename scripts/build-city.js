const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const outputDir = path.join(rootDir, 'data', 'demo');
const outputFile = path.join(outputDir, 'tfg_codebase.json');

// We only process extensions relevant to the platform
const extensions = ['.js', '.html', '.css', '.json'];
// High level folders to categorize the "city districts"
const validDistricts = ['css', 'js', 'scenes', 'server', 'root', 'data'];

let cityData = [];

function countLines(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data.split('\n').length;
    } catch (e) {
        return 1;
    }
}

function scanDir(currentDir, relativePath = '') {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
        const fullPath = path.join(currentDir, file);
        
        let stat;
        try { stat = fs.statSync(fullPath); } catch (e) { continue; }

        if (stat.isDirectory()) {
            // Ignore heavy boilerplate and build dirs
            if (file !== 'node_modules' && file !== '.git' && file !== '.gemini' && file !== 'dist') {
                scanDir(fullPath, relativePath ? relativePath + '/' + file : file);
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            if (extensions.includes(ext) && file !== 'package-lock.json') {
                const loc = countLines(fullPath);
                
                // Root files will be assigned to the 'root' district
                let district = relativePath ? relativePath.split('/')[0] : 'root';
                
                // Keep only main architecture folders to avoid a massive messy grid
                if(!validDistricts.includes(district)) {
                     district = 'other';
                }

                cityData.push({
                    filename: file,
                    folder: district,
                    loc: loc,
                    ext: ext.replace('.', '')
                });
            }
        }
    }
}

console.log("🏙️ Scanning architecture to build Software City...");
scanDir(rootDir);

// Ensure output dir exists
if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputFile, JSON.stringify(cityData, null, 2));
console.log(`✅ Success! Generated JSON for ${cityData.length} files (buildings).`);
