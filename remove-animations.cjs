const fs = require('fs');
const path = require('path');

function removeAnimations(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace <motion.div> with <div>
    content = content.replace(/<motion\.([a-zA-Z]+)/g, '<$1');
    content = content.replace(/<\/motion\.([a-zA-Z]+)>/g, '</$1>');
    
    // Remove motion imports
    content = content.replace(/import\s*\{\s*motion\s*(?:,\s*AnimatePresence\s*)?\}\s*from\s*['"]framer-motion['"];?\n?/g, '');
    content = content.replace(/import\s*\{\s*AnimatePresence\s*(?:,\s*motion\s*)?\}\s*from\s*['"]framer-motion['"];?\n?/g, '');
    
    // Remove common framer-motion props
    // We use a regex that handles basic nested braces or simple props
    // Like initial={{ opacity: 0 }}
    const propsToRemove = ['initial', 'animate', 'whileInView', 'viewport', 'transition', 'exit', 'whileHover', 'whileTap', 'variants'];
    for (const prop of propsToRemove) {
        // match prop={{ ... }} or prop={...}
        // This regex is rudimentary and might need multiple passes or just match the outer braces
        const regex = new RegExp(`\\s+${prop}=\\{(\\{[^}]*\\}|[^}]+)\\}`, 'g');
        content = content.replace(regex, '');
        // also try matching prop={variants} where variants is just an object reference
        const regex2 = new RegExp(`\\s+${prop}=\\{[a-zA-Z0-9_]+\\}`, 'g');
        content = content.replace(regex2, '');
    }

    // Remove tailwind animation classes
    const classesToRemove = [
        'animate-in', 'fade-in', 'zoom-in', 'zoom-in-95', 'slide-in-from-top-2', 'slide-in-from-bottom-4',
        'duration-150', 'duration-200', 'duration-300', 'duration-500', 'duration-700', 'delay-100', 'delay-200'
    ];
    for (const cls of classesToRemove) {
        const regex = new RegExp(`\\b${cls}\\b`, 'g');
        content = content.replace(regex, '');
    }
    
    // clean up multiple spaces inside className
    content = content.replace(/className=(["`])([^"`]+)\1/g, (match, quote, inner) => {
        return `className=${quote}${inner.replace(/\s+/g, ' ').trim()}${quote}`;
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Processed ${filePath}`);
}

function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            removeAnimations(fullPath);
        }
    }
}

const targetDir = path.join(__dirname, 'src');
processDirectory(targetDir);
