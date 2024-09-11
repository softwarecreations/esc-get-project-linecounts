#!/usr/bin/env node
'use strict';

import { getProjectLineCountsP } from './main.mjs';

const projectDir = process.argv[process.argv.length -1];

const exitError = s => console.error(s) & process.exit(1);

const getCliOptions = argsA => {
  const options = {
      projectDir: '',
      specialDirsA: []
  };
  argsA.forEach(arg => {
    if (arg.startsWith('--projectDir=')) {
        options.projectDir = arg.split('=')[1];
    } else if (arg.startsWith('--specialDir=')) {
      // assume specialDir argument format is: --specialDir=ignore,path1,path2,... or --specialDir=type,label,path1,path2,...
      const sdvA = arg.split('=')[1].split(',').map(s => s.trim() );
      if (sdvA.length<(sdvA[0]==='ignore'?2:3) || sdvA.some(s => s.length===0)) exitError(`Unknown argument: ${arg}`);
      if (sdvA[0]==='ignore') {
        const [ type, ...pathsA] = sdvA;
        options.specialDirsA.push({ type, pathsA });
      } else {
        const [ type, label, ...pathsA] = sdvA;
        options.specialDirsA.push({ type, label, pathsA });
      }
    } else if (arg.startsWith('--')) {
      exitError(`Unknown argument: ${arg}`);
    }
  });
  return options;
};

( async () => {
  const options = getCliOptions(process.argv);
  const projectStatsS = await getProjectLineCountsP(options);
  console.log(projectStatsS);
})();
