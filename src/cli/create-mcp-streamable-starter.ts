import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

interface CliOptions {
  projectName: string;
  projectDescription: string;
  targetDir: string;
}

const TEXT_FILE_EXTENSIONS = new Set([
  '.ts',
  '.mts',
  '.cts',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.txt',
  '.gitignore'
]);

const getOptionValue = (args: string[], name: string): string | undefined => {
  const prefixed = `--${name}=`;
  const fromEquals = args.find((arg) => arg.startsWith(prefixed));
  if (fromEquals) {
    return fromEquals.slice(prefixed.length);
  }

  const index = args.findIndex((arg) => arg === `--${name}`);
  if (index >= 0) {
    return args[index + 1];
  }

  return undefined;
};

const normalizeName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '') || 'mcp-streamable-starter';

const parseCliArgs = (args: string[]): CliOptions => {
  const positional = args.filter((arg) => !arg.startsWith('--'));

  const rawName = getOptionValue(args, 'name') ?? positional[0] ?? 'mcp-streamable-starter';
  const projectName = normalizeName(rawName);
  const targetDir = getOptionValue(args, 'target') ?? projectName;
  const projectDescription =
    getOptionValue(args, 'description') ??
    `MCP v2 Streamable HTTP migration starter generated from ${projectName}`;

  return {
    projectName,
    targetDir,
    projectDescription
  };
};

const ensureEmptyDir = async (dir: string): Promise<void> => {
  await mkdir(dir, { recursive: true });
  const entries = await readdir(dir);
  if (entries.length > 0) {
    throw new Error(`Target directory is not empty: ${dir}`);
  }
};

const isTextFile = (filePath: string): boolean => {
  const extension = path.extname(filePath);
  return TEXT_FILE_EXTENSIONS.has(extension) || path.basename(filePath) === '.gitignore';
};

const replaceTokensInDir = async (dir: string, replacements: Record<string, string>): Promise<void> => {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await replaceTokensInDir(fullPath, replacements);
      continue;
    }

    if (!entry.isFile() || !isTextFile(fullPath)) {
      continue;
    }

    let content = await readFile(fullPath, 'utf8');
    for (const [token, value] of Object.entries(replacements)) {
      content = content.split(token).join(value);
    }

    await writeFile(fullPath, content);
  }
};

const copyVendorTarballs = async (vendorSource: string, vendorTarget: string): Promise<void> => {
  await mkdir(vendorTarget, { recursive: true });
  await cp(vendorSource, vendorTarget, { recursive: true });
};

const run = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const options = parseCliArgs(args);

  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  const repoRoot = path.resolve(currentDir, '..', '..');

  const templateDir = path.join(repoRoot, 'templates', 'starter-streamable-v2');
  const vendorSourceDir = path.join(repoRoot, 'vendor');
  const targetDir = path.resolve(process.cwd(), options.targetDir);

  const templateStats = await stat(templateDir).catch(() => null);
  if (!templateStats || !templateStats.isDirectory()) {
    throw new Error(`Template directory not found: ${templateDir}`);
  }

  await ensureEmptyDir(targetDir);

  await cp(templateDir, targetDir, { recursive: true });
  await copyVendorTarballs(vendorSourceDir, path.join(targetDir, 'vendor'));

  await replaceTokensInDir(targetDir, {
    __PROJECT_NAME__: options.projectName,
    __PROJECT_DESCRIPTION__: options.projectDescription,
    '@@PROJECT_NAME@@': options.projectName,
    '@@PROJECT_DESCRIPTION@@': options.projectDescription
  });

  console.log(`Created '${options.projectName}' in ${targetDir}`);
  console.log('Next steps:');
  console.log(`  cd ${options.targetDir}`);
  console.log('  npm install');
  console.log('  npm run dev');
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
