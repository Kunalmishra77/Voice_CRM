import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'data', 'api.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Add import if not exists
if (!content.includes('import { SafeQuery }')) {
  content = content.replace("import { supabase } from './supabase';", "import { supabase } from './supabase';\nimport { SafeQuery } from './SafeQuery';");
}

const pattern = /const\s+\{\s*data:\s*([a-zA-Z0-9_]+)\s*,\s*error:\s*([a-zA-Z0-9_]+)\s*\}\s*=\s*await\s+supabase\s*\.from\(([^)]+)\)([^;]+);/g;

content = content.replace(pattern, (match, p1, p2, p3, p4) => {
  // Check if it's an insert, update or select based on p4
  let action = 'select';
  if (p4.includes('.insert(')) action = 'insert';
  if (p4.includes('.update(')) action = 'update';
  if (p4.includes('.delete(')) action = 'delete';

  return `const { data: ${p1}, error: ${p2} } = await SafeQuery(supabase.from(${p3})${p4}, { table: ${p3}, action: '${action}' });`;
});

// Replace "const { data, error } = await supabase.from(xxx)..."
const pattern2 = /const\s+\{\s*data\s*,\s*error\s*\}\s*=\s*await\s+supabase\s*\.from\(([^)]+)\)([^;]+);/g;
content = content.replace(pattern2, (match, p1, p2) => {
  let action = 'select';
  if (p2.includes('.insert(')) action = 'insert';
  if (p2.includes('.update(')) action = 'update';
  if (p2.includes('.delete(')) action = 'delete';

  return `const { data, error } = await SafeQuery(supabase.from(${p1})${p2}, { table: ${p1}, action: '${action}' });`;
});

// We need to also catch where it just says `const { error } = await supabase.from...`
const pattern3 = /const\s+\{\s*error\s*\}\s*=\s*await\s+supabase\s*\.from\(([^)]+)\)([^;]+);/g;
content = content.replace(pattern3, (match, p1, p2) => {
  let action = 'select';
  if (p2.includes('.insert(')) action = 'insert';
  if (p2.includes('.update(')) action = 'update';
  if (p2.includes('.delete(')) action = 'delete';

  return `const { error } = await SafeQuery(supabase.from(${p1})${p2}, { table: ${p1}, action: '${action}' });`;
});

// Also replace await supabase.from(...) without assignment but just awaiting
const pattern4 = /await\s+supabase\s*\.from\(([^)]+)\)([^;]+);/g;
content = content.replace(pattern4, (match, p1, p2) => {
    if (match.includes('const {') || match.includes('let {') || match.includes('return await')) return match;
    let action = 'select';
    if (p2.includes('.insert(')) action = 'insert';
    if (p2.includes('.update(')) action = 'update';
    if (p2.includes('.delete(')) action = 'delete';
    return `await SafeQuery(supabase.from(${p1})${p2}, { table: ${p1}, action: '${action}' });`;
});

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Replacements complete');