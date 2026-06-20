// esbuild inlines `*.glb` imports as base64 data URLs (loader: { '.glb': 'dataurl' }) so the mobile
// viewer is one fully-offline HTML file. tsc needs this ambient declaration to typecheck main.ts.
declare module '*.glb' {
  const url: string;
  export default url;
}
