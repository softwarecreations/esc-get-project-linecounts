#!/usr/bin/env node
'use strict';

import { getProjectLineCountsP } from './main.mjs';

const exitError = s => console.error(s) & process.exit(1);

const getCliOptions = argsA => {
  const options = {
    fmt: undefined, 
    projectDir: '',
    specialDirsA: [],
    cssLibsA: undefined,
  };
  argsA.forEach(arg => {
    if (!arg.startsWith('--')) return; // ignore runtime path or name of the file being run etc
    const argA = arg.substr(2).split('=');
    if (argA.length < 2) exitError(`Unknown argument: ${arg}`);
    const [ key, value ] = argA;
    switch (key) {
      case 'projectDir': options.projectDir = value;            break; // eg: --projectDir=/home/bob/my-project
      case 'fmt':        options.fmt        = value;            break; // eg: --fmt=traditional --fmt=dense --fmt=both
      case 'cssLibs':    options.cssLibsA   = value.split(','); break; // eg: --cssLibs=reset,bootstrap
      case 'specialDir':
        // assume specialDir argument format is: --specialDir=ignore,path1,path2,... or --specialDir=type,label,path1,path2,...
        const sdvA = value.split(',').map(s => s.trim() );
        if (sdvA.length<(sdvA[0]==='ignore'?2:3) || sdvA.some(s => s.length===0)) exitError(`Unknown argument: ${arg}`);
        if (sdvA[0]==='ignore') {
          const [ type, ...pathsA] = sdvA;
          options.specialDirsA.push({ type, pathsA });
        } else {
          const [ type, label, ...pathsA] = sdvA;
          options.specialDirsA.push({ type, label, pathsA });
        }
        break;
      default:
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
