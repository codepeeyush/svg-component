declare module 'svgo/dist/svgo.browser.js' {
  export interface OptimizeOptions {
    plugins?: any[];
  }

  export interface OptimizeResult {
    data: string;
  }

  export function optimize(svgString: string, options?: OptimizeOptions): OptimizeResult;
}
