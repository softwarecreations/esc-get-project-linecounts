declare module 'esc-get-project-linecounts' {
  const defaultSuffixTypesO: {
      code: string;
      scripts: string;
      text: string;
  };

  interface SpecialDir {
      type: 'ignore' | 'code' | 'text' | 'scripts';
      label?: string;
      pathsA: string[];
  }

  interface GetProjectLineCountsOptions {
      projectDir: string;
      fmt?: 'traditional' | 'dense' | 'both';
      suffixTypesO?: typeof defaultSuffixTypesO;
      specialDirsA?: SpecialDir[];
      cssLibsA?: string[];
  }

  export const getProjectLineCountsP: (options: GetProjectLineCountsOptions) => Promise<string>;
}
