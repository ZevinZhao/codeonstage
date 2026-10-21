import { skills } from '../src/data/index';
const out = skills.map((s) => ({ id: s.id, sourceUrl: s.sourceUrl }));
process.stdout.write(JSON.stringify(out));
