import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import pluralize from 'pluralize';

const entityName = process.argv[2];
if (!entityName) {
  console.error('Usage: npm run make:entity <Name>');
  process.exit(1);
}

function splitWords(str: string): string[] {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

function toKebabCase(str: string) {
  return splitWords(str).join('-');
}

function toSnakeCase(str: string) {
  return splitWords(str).join('_');
}

const snake = toSnakeCase(entityName);
const kebab = toKebabCase(entityName);

const lower = entityName.charAt(0).toLowerCase() + entityName.slice(1);
const plural = pluralize(lower);

const snakePlural = pluralize(snake);
const kebabPlural = pluralize(kebab);

const folder = resolve(__dirname, '..', 'src', kebab);
const dtoFolder = resolve(folder, 'dto');
const repositoriesFolder = resolve(folder, 'repositories');
const interfacesFolder = resolve(folder, 'interfaces');

mkdirSync(folder, { recursive: true });
mkdirSync(dtoFolder, { recursive: true });
mkdirSync(repositoriesFolder, { recursive: true });
mkdirSync(interfacesFolder, { recursive: true });

const templates = [
  {
    file: 'controller.ts.hbs',
    folder: folder,
  },
  {
    file: 'controller.spec.ts.hbs',
    folder: folder,
  },
  {
    file: 'service.ts.hbs',
    folder: folder,
  },
  {
    file: 'service.spec.ts.hbs',
    folder: folder,
  },
  {
    file: 'repository.ts.hbs',
    folder: repositoriesFolder,
  },
  {
    file: 'interface.ts.hbs',
    folder: interfacesFolder,
  },
  {
    file: 'entity.ts.hbs',
    folder: folder,
  },
  {
    file: 'module.ts.hbs',
    folder: folder,
  },
  {
    file: 'create-__entity__-dto.ts.hbs',
    folder: dtoFolder,
  },
  {
    file: 'update-__entity__-dto.ts.hbs',
    folder: dtoFolder,
  },
];

for (const file of templates) {
  const templatePath = resolve(__dirname, '..', 'templates/entity', file.file);
  const template = readFileSync(templatePath, 'utf-8');

  const output = template
    .replace(/__Entity__/g, entityName)
    .replace(/__entity__/g, lower)
    .replace(/__entities__/g, plural)
    .replace(/__kebab__/g, kebab)
    .replace(/__snake__/g, snake)
    .replace(/__snakePlural__/g, snakePlural)
    .replace(/__kebabPlural__/g, kebabPlural);

  if (file.file.includes('dto')) {
    const dtoFile = file.file.replace('__entity__', kebab).replace('.hbs', '');
    const outFile = resolve(file.folder, dtoFile);

    writeFileSync(outFile, output, 'utf-8');
    console.log(`Created dto/${dtoFile}`);
    continue;
  }

  const outFile = resolve(file.folder, `${kebab}.${file.file.replace('.hbs', '')}`);
  writeFileSync(outFile, output, 'utf-8');
  console.log(`Created ${kebab}.${file.file.replace('.hbs', '')}`);
}

const caslFile = resolve(__dirname, '..', 'src/casl/casl-ability.factory.ts');
let content = readFileSync(caslFile, 'utf-8');
const importLine = `import { ${entityName} } from '@/${kebab}/${kebab}.entity';`;
if (!content.includes(importLine)) {
  content = content.replace(/import { User.*;/, (match) => `${match}\n${importLine}`);
}
const subjectsRegex = /InferSubjects<([^>]*)>/;
content = content.replace(subjectsRegex, (match, group) => {
  if (group.includes(entityName)) return match;
  return `InferSubjects<${group} | typeof ${entityName}>`;
});

writeFileSync(caslFile, content, 'utf-8');
console.log(`Updated CASL with ${entityName}`);

const appModuleFile = resolve(__dirname, '..', 'src/app.module.ts');
let appContent = readFileSync(appModuleFile, 'utf-8');

const moduleName = `${entityName}Module`;
const importLineApp = `import { ${moduleName} } from './${kebab}/${kebab}.module';`;

if (!appContent.includes(importLineApp)) {
  appContent = appContent.replace(
    /(import .*\n)(?=[^import])/,
    (match) => `${match}${importLineApp}\n`,
  );
}

const importsRegex = /imports:\s*\[([^\]]*)\]/s;
appContent = appContent.replace(importsRegex, (match, group) => {
  if (group.includes(moduleName)) return match;

  let cleaned = group.trim();

  if (cleaned.endsWith(',')) {
    return `imports: [${cleaned} ${moduleName}]`;
  }

  if (cleaned.length > 0) {
    return `imports: [${cleaned}, ${moduleName}]`;
  }

  return `imports: [${moduleName}]`;
});

writeFileSync(appModuleFile, appContent, 'utf-8');
console.log(`Updated AppModule with ${moduleName}`);
