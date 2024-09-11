# esc-get-project-linecounts
Gets linecounts of node.js project for code and text, categorized as specified.

## Example usage from cli
Simple
```sh
./get-project-linecounts.mjs --projectDir=/home/bob/my-project
```

Advanced
```sh
./get-project-linecounts.mjs \
  --projectDir=/home/bob/my-project \
  --specialDir=ignore,/logs \
  --specialDir=code,mockup-data,/imports/mockup-data \
  --specialDir=text,code-docs,/code-docs \
  --specialDir=scripts,scripts,/scripts \
  --specialDir=code,test-code,/imports/ui/pages/_Special/manual-component-tests,/imports/ui/pages/_Special/MultiPageTests,/imports/ui/pages/_Special/Tests
```

## Example usage from code
```JavaScript
import { getProjectLineCountsP } from 'esc-get-project-linecounts';

const { projectDir } = process.env;

setTimeout( () => getProjectLineCountsP({
  projectDir,
  specialDirsA: [
    { type:'ignore'                      , pathsA:['/logs']                },
    { type:'code'   , label:'mockup-data', pathsA:['/imports/mockup-data'] },
    { type:'text'   , label:'code-docs'  , pathsA:['/code-docs']           },
    { type:'scripts', label:'scripts'    , pathsA:['/scripts']             },
    { type:'code'   , label:'test-code'  , pathsA:[
      '/imports/ui/pages/_Special/manual-component-tests',
      '/imports/ui/pages/_Special/MultiPageTests',
      '/imports/ui/pages/_Special/Tests',
    ]},
  ],
}).then( projectStatsS => console.log(projectStatsS) ), 100);
```

## Example output
`Project has [ 247,790 lines of code, 5,111 lines of mockup-data, 4,550 lines of code-docs, 1,850 lines of scripts, 16,004 lines of test-code ] (with traditional formatting)`

## Why it exists
Occasionally it's necessary to quantify a project's size in discussions or when considering doing things like fine-tuning an LLM on your codebase.

Traditionally code is formatted sparsely, but deciding how sparse or densely to format code is a matter of personal preference.

What is considered _good formatting_ is subjective and contextual.

This script calculates how many lines a project's code _would_ consume _if_ it followed ChatGPT's recommendations for maximum-line-length and formatting etc _in terms of traditional readability recommendations_.

My personal (dense) coding style works out to be 23% of the number of lines of the traditional style that this script calculates.

## Why write dense code?
Sometimes you only need to write a bit of code once and will rarely ever need to edit or read it again, and are happy to scroll sideways on that one occasion when you edit it if the need arises in future... rather than constantly scrolling up and down past code that you don't need to edit, **hundreds of times**.

Obviously I write relatively dense code because I've found that it significantly improves my productivity significantly.

Ideally I want to see all of the code that's relevant for what I'm doing when I'm doing it.

So how densely I format a piece of code might depend on my perception of it's complexity and how soon or often I estimate the piece of code will need to be maintained.

Some people prefer to move cold code out into separate files, but that can also be problematic because then you have hundreds or thousands of additional files to manage. Then _finding_ relevant files and _switching files_ becomes a hassle, as well as setting up split-panes, managing where you position your split panes and how you resize them, every time you want to see some code that could simply fit on one or more dense lines.

## Taking a logical argument to extremes
You can minify a 500,000 line project down to a single line by simply removing the `\n` characters. That's what happens when you deploy it.

So should you say that it's 500,000 lines or 1 line?

Maybe you like very dense code style. Maybe you say that it's 50,000 lines of code...

So how can we have a meaningful conversation about "number of lines of code?"

## Separately quantify stuff that is not strictly 'code'
It seems reasonable to quantify the code up into test-code, scripts, mockup-data and code-docs separately from code.

## The reasonable solution
The most sensible thing seems to be formatting code into standard traditional sparse format before measuring line-count.

## Of course the rabbit-hole goes deeper
Really crap code might do something that could be more DRY by copy-pasting the same statements over and over again.

Even worse code might be excessively DRY making it unreadable and unmaintainable.

## I am NOT suggesting 'more lines' = 'better code' = 'more impressive' = 'more work done'
This exists to produce a number to have an apples/apples conversation. I'm not implying LOC (lines of code) is a good measure of anything or that it's fit for some purpose etc.

If some lines of code doesn't add much value and I can delete it, I generally delete it. I generally err on the side of less code is better. But I err more on the side of not making inaccurate generalizations. Everything is contextual.

## Why not use a linter to produce a line-count?
It's possible to do this with a linter but that linter is trying to produce perfect code, so that will most likely waste your time dealing with linter errors and it will consume **a lot** more CPU and RAM because it's actually changing the code or producing new perfectly executable code.

This script doesn't change the code or produce new strings of code at all. It simply calculates how many lines each line or feature would be in traditional formatting.

I'm reasonably confident it's plenty accurate enough for it's purpose.

## PR's welcome
If you see any errors in my code please make a PR demonstrating the problem and your fix. A regex101 link might be helpful and relevant to include with your PR.

## Project goals
* Minimal dependencies: only 'glob'
* Small and simple
* Fast, low CPU and memory usage
* Reasonably asynchronous

## Installation
1. `npm install esc-get-project-linecounts`

### Say thanks
Star the repo
https://github.com/softwarecreations/esc-get-project-linecounts

### License
MIT
