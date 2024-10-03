'use strict';

import fs from 'fs'
import path from 'path'
import { glob as globP } from 'glob';

const kN = n => n.toLocaleString('en-US');
const matchCount = (s, pattern, plus=0, multiply=1) => { const m = s.match(pattern); return m===null ? 0 : (m.length + plus) * multiply; }
const getCleanFileName = fileName => fileName.toLowerCase().replace(/[\d _.-]+.+?$/,'');
const defaultCssLibNamesA = [
  'reset', 'normalize', 'reboot', 'base', 'modern-normalize', 'sanitize',
  'bootstrap', 'foundation', 'bulma', 'tailwind', 'semantic', 'materialize', 'skeleton', 'pure', 'milligram', 'tachyons',
 ];
const cssFileTypesA = ['css', 'scss', 'less'];

const defaultSuffixTypesO = {
  code: 'css,scss,less,js,php,jsx,mjs,json,html',                        // can't add spaces between commas
  scripts: 'bash,sh,env,json,yaml,yml,js,mjs,rb,php,pl,py,env,cfg,conf',
  text: 'txt,md',
};

export const getProjectLineCountsP = async ({
    projectDir,
    fmt = 'traditional',
    suffixTypesO = defaultSuffixTypesO,
    specialDirsA = [],
    cssLibsA = defaultCssLibNamesA,
  }) => {
  try {
    const getTextLineCountS = (filesA, label) => `${kN(filesA.reduce( (sum, filePath) => sum + fs.readFileSync(filePath,'utf8').split('\n').length, 0))} lines of ${label}`;
    const getCodeLineCountS = (filesA, label, type) => {
      let totalCodeDenseLineCount=0, totalCodeTraditionalLineCount=0, totalCssDenseLineCount=0, totalCssTraditionalLineCount=0;
      const foundCssTypesA=[], foundCssLibsA=[];
      filesA.forEach( filePath => {
        const fileName=path.basename(filePath), lcFileName=fileName.toLowerCase(), fileType=path.extname(lcFileName).substr(1);
        const buf = fs.readFileSync(filePath, 'utf8').replace(/&[a-z]+;/g, ''); // remove html codes &gt;
        const linesA = buf.split('\n');
        let isCss = 0;
        if (cssFileTypesA.includes(fileType)) {
          isCss = 1;
          if (!foundCssTypesA.includes(fileType)) foundCssTypesA.push(fileType);
          const cleanFilename = getCleanFileName(lcFileName);
          if (cssLibsA.includes(cleanFilename)) {
            if (!foundCssLibsA.includes(cleanFilename)) foundCssLibsA.push(cleanFilename);
            return; // we don't count CSS reset lines
          }
        }
        if (fmt!=='dense') {
          const addlLongLines = linesA.reduce( (sum, line) => sum += Math.floor(line.length / 80), 0);
          const denseBuf = buf.replace(/[ \t]/g,'');
          const denseLinesA = denseBuf.split('\n')
          let addlStatements = 0;
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
          const addlTagLines = fileName.includes('.js') ? matchCount(denseBuf, /<[^>]*>(?=<)/g) : 0;  // <div><p> would be split over multiple lines traditionally.
          const addlDenseFunc = matchCount(denseBuf, /function\([^)]*\){[^\n]/g, 0, 4); // for every one-line function () { return 1; } that we find we multiply that match (1) by 4 for 4 additional lines so it's \nfunction(){\nreturn 1;\n}\n so there is an empty line before and after
          const traditionalLineCount = denseLinesA.length + addlStatements + extraEmptyLines + addlLongLines + extraIfLines + emptyLinesNeededBeforeCtrlStructure + addlTagLines + addlDenseFunc;
          if (isCss) totalCssTraditionalLineCount += traditionalLineCount; else totalCodeTraditionalLineCount += traditionalLineCount;;
        }
        if (isCss) totalCssDenseLineCount += linesA.length; else totalCodeDenseLineCount += linesA.length;;
      });
      const outputA = [];
      const cssSuffix = foundCssLibsA.length===0 ? '' : ` (excl ${foundCssLibsA.join(', ')})`;
      switch (fmt) {
        case 'both':
          outputA.push(`${kN(totalCodeDenseLineCount)} dense, ${kN(totalCodeTraditionalLineCount)} traditional lines of ${label}`);
          if (foundCssTypesA.length!==0) {
            outputA.push(`${kN(totalCssDenseLineCount)} dense, ${kN(totalCssTraditionalLineCount)} traditional lines of ${foundCssTypesA.map(s=>s.toUpperCase()).join('/')} ` + label + cssSuffix);
          }
          break;
        case 'dense':
          outputA.push(`${kN(totalCodeDenseLineCount)} lines of ${label}`);
          if (foundCssTypesA.length!==0) {
            outputA.push(`${kN(totalCssDenseLineCount)} lines of ${foundCssTypesA.map(s=>s.toUpperCase()).join('/')} ` + label + cssSuffix);
          }
          break;
        case 'traditional':
          outputA.push(`${kN(totalCodeTraditionalLineCount)} lines of ${label}`);
          if (foundCssTypesA.length!==0) {
            outputA.push(`${kN(totalCssTraditionalLineCount)} lines of ${foundCssTypesA.map(s=>s.toUpperCase()).join('/')} ` + label + cssSuffix);
          }
          break;
      }
      return outputA.join(', ');
    };
    const getIgnorePathsA = specialDirsA => specialDirsA.map( ({ pathsA }) => pathsA ).flat().map( dir => `${projectDir}${dir}/**`);
    const allIgnorePathsA = getIgnorePathsA(specialDirsA.filter( ({ type }) => type==='ignore' ));
    const specialDirsWithoutIgnoreA = specialDirsA.filter( ({ type }) => type!=='ignore' );
    const mainIgnoreFilesA = getIgnorePathsA(specialDirsA).concat(`${projectDir}/node_modules/**`, `${projectDir}/package-lock.json`);
    const allLineCountsS = (await Promise.all( [ globP(projectDir + `/**/*.{${suffixTypesO.code}}`, { ignore:mainIgnoreFilesA }).
      then( filesA => ({ specialDirIndex:-1, linesS:getCodeLineCountS(filesA, 'code', 'code') }) )
    ].concat(specialDirsWithoutIgnoreA.map( async ({ type, label, pathsA }, specialDirIndex) => {
      const ignorePathsA = allIgnorePathsA.concat(getIgnorePathsA(specialDirsWithoutIgnoreA.filter( (o, index) => index!==specialDirIndex )));
      const suffixTypes = suffixTypesO[type];
      if (suffixTypes===undefined) throw new Error(`suffixTypesO['${type}'] is undefined. specialDir label:'${label}' [${pathsA.join(', ')}]`);
      const filesA = ( await Promise.all( pathsA.map( dirPath => globP(projectDir + dirPath + `/**/*.{${suffixTypes}}`, { ignore:ignorePathsA }) ) ) ).flat();
      switch (type) {
        case 'code':
        case 'scripts':
          return { specialDirIndex, linesS:getCodeLineCountS(filesA, label, type) };
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

export default getProjectLineCountsP;
