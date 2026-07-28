/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __GIT_COMMIT__: string
declare const __GIT_COMMIT_TIME__: string

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
