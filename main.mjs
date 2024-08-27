#!/usr/bin/env node
'use strict';

import fs from 'fs'
import path from 'path'
import { glob as globP } from 'glob';

const kN = n => n.toLocaleString('en-US');
const matchCount = (s, pattern, plus=0, multiply=1) => { const m = s.match(pattern); return m===null ? 0 : (m.length + plus) * multiply; }

const defaultSuffixTypesO = {
  code: 'css,scss,js,php,jsx,mjs,json,html',
  scripts: 'bash,sh,env,json,yaml,yml,js,mjs,rb,php,pl,py,env,cfg,conf',
  text: 'txt,md',
};

export const getProjectStatsP = async ({
    projectDir,
    fmt = 'traditional',
    suffixTypesO = defaultSuffixTypesO,
    specialDirsA = [],
  }) => {
  try {
    const getTextLineCountS = (filesA, label) => `${kN(filesA.reduce( (sum, filePath) => sum + fs.readFileSync(filePath,'utf8').split('\n').length, 0))} lines of ${label}`;
    const getCodeLineCountS = (filesA, label) => {
      let totalDenseLineCount = 0, totalTraditionalLineCount = 0;
      filesA.forEach( filePath => {
        const filename = path.basename(filePath);
        const buf = fs.readFileSync(filePath, 'utf8').replace(/&[a-z]+;/g, ''); // remove html codes &gt;
        const linesA = buf.split('\n');
        if (fmt!=='dense') {
          const addlLongLines = linesA.reduce( (sum, line) => sum += Math.floor(line.length / 80), 0);
          const denseBuf = buf.replace(/[ \t]/g,'');
          const denseLinesA = denseBuf.split('\n')
          let addlStatements = 0, isCss = filename.endsWith('css');
          for (let i=0; i<denseLinesA.length; ++i) {
            let line = denseLinesA[i];
            addlStatements += matchCount(line, /;[^;]/g, 1); // multiple statements on a line separated by semicolons
            if (isCss) {
              addlStatements += matchCount(line, /{[a-z]/g);    // CSS openbracket followed by CSS rule on the same line
              addlStatements += matchCount(line, /,[a-z.&:]/g); // CSS multiple selectors on same line
            } else {
              addlStatements += matchCount(line, /,[^,]/g, 2);                                  // multiple properties or elements separated by commas, would be on multiple lines in code of typical density; add 2 lines for open and close brackets
              addlStatements += matchCount(line, /(&&|\|\|).+(&&|\|\|)/g, 3);                   // complex boolean expressions, adds 2 lines for brackets + 1 line for the first expression
              addlStatements += matchCount(line, /(\+|-|\*|\/|%).+(\+|-|\*|\/|%)/g, 3);         // complex math expressions, adds 2 lines for brackets + 1 line for the first expression
              addlStatements += matchCount(line, /\b(case|default)[^:]+:.+/g);                  // case statements followed by an expression would traditionally be on separate lines
              addlStatements += (line.includes('if(') && line.includes('){')===false) ? 2 : 0;  // expands single line if statements to traditional 3 lines with brace
              const jsxObjPropsMatches = matchCount(line, /={[^}]+}.+?/g); // spreads multiple JSX object props over multiple lines
              const jsxSqPropsMatches  = matchCount(line, /='[^']+'.+?/g); // spreads multiple JSX string props over multiple lines
              const jsxDqPropsMatches  = matchCount(line, /="[^"]+".+?/g); // spreads multiple JSX string props over multiple lines
              if (jsxObjPropsMatches + jsxSqPropsMatches + jsxDqPropsMatches > 1) addlStatements += jsxObjPropsMatches + jsxSqPropsMatches + jsxDqPropsMatches + 2;
            }
          }
          const extraEmptyLines = matchCount(denseBuf, /[})].*\n[^\n]/g); // traditionally a close-bracket would be followed by an empty line
          const extraIfLines = matchCount(denseBuf, /if\([^)]+\)[^{]/g); // traditionally if statement would be followed by
          const emptyLinesNeededBeforeCtrlStructure = matchCount(denseBuf, /[^\n]\n(if|else|switch|for|while|do|break|continue|return|try|catch|finally|throw|Promise|export|const|let|\/\/)/g, 0, 2); // adds 2 lines per control structure found that lacks empty line above assuming it wouldn't have empty line below either
          const addlTagLines = filename.includes('.js') ? matchCount(denseBuf, /<[^>]*>(?=<)/g) : 0;  // <div><p> would be split over multiple lines traditionally.
          const addlDenseFunc = matchCount(denseBuf, /function\([^)]*\){[^\n]/g, 0, 4); // for every one-line function () { return 1; } that we find we multiply that match (1) by 4 for 4 additional lines so it's \nfunction(){\nreturn 1;\n}\n so there is an empty line before and after
          totalTraditionalLineCount += denseLinesA.length + addlStatements + extraEmptyLines + addlLongLines + emptyLinesNeededBeforeCtrlStructure + addlTagLines + addlDenseFunc;
        }
        totalDenseLineCount += linesA.length;
      });
      switch (fmt) {
        case 'both'       : return `${kN(totalDenseLineCount)} dense, ${kN(totalTraditionalLineCount)} traditional lines of ${label}`;
        case 'dense'      : return `${kN(totalDenseLineCount)} lines of ${label}`;
        case 'traditional': return `${kN(totalTraditionalLineCount)} lines of ${label}`;
      }
    };
    const getIgnorePathsA = specialDirsA => specialDirsA.map( ({ pathsA }) => pathsA ).flat().map( dir => `${projectDir}${dir}/**`);
    const allIgnorePathsA = getIgnorePathsA(specialDirsA.filter( ({ type }) => type==='ignore' ));
    const specialDirsWithoutIgnoreA = specialDirsA.filter( ({ type }) => type!=='ignore' );
    const mainIgnoreFilesA = getIgnorePathsA(specialDirsA).concat(`${projectDir}/node_modules/**`, `${projectDir}/package-lock.json`);
    const allLineCountsS = (await Promise.all( [ globP(projectDir + `/**/*.{${suffixTypesO.code}}`, { ignore:mainIgnoreFilesA }).
      then( filesA => ({ specialDirIndex:-1, linesS:getCodeLineCountS(filesA, 'code') }) )
    ].concat(specialDirsWithoutIgnoreA.map( async ({ type, label, pathsA }, specialDirIndex) => {
      const ignorePathsA = allIgnorePathsA.concat(getIgnorePathsA(specialDirsWithoutIgnoreA.filter( (o, index) => index!==specialDirIndex )));
      const suffixTypes = suffixTypesO[type];
      if (suffixTypes===undefined) throw new Error(`suffixTypesO['${type}'] is undefined. specialDir label:'${label}' [${pathsA.join(', ')}]`);
      const filesA = ( await Promise.all( pathsA.map( dirPath => globP(projectDir + dirPath + `/**/*.{${suffixTypes}}`, { ignore:ignorePathsA }) ) ) ).flat();
      switch (type) {
        case 'code':
        case 'scripts':
          return { specialDirIndex, linesS:getCodeLineCountS(filesA, label) };
        case 'text':
          return { specialDirIndex, linesS:getTextLineCountS(filesA, label) };
        default: throw new Error(`Unknown type:'${type}' for specialDir label:'${label}' [${pathsA.join(', ')}]`);
      }
    }))))
    .sort( ({ specialDirIndex:a },{ specialDirIndex:b }) => a - b )
    .map( ({ linesS }) => linesS )
    .join(', ');
    return `Project has [ ${allLineCountsS} ]` + (fmt==='both' ? '' : ` (with ${fmt} formatting)`);
  } catch (err) {
    return `Error getting project info: ${err.message}`;
  }
};
