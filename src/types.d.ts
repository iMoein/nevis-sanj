declare namespace JSX {
  interface IntrinsicElements { [elemName: string]: any; }
  interface Element {}
  interface ElementChildrenAttribute { children: {}; }
}
declare namespace React {
  class Component<P = {}, S = {}> {
    constructor(props: P);
    props: Readonly<P>;
    state: Readonly<S>;
    setState(state: Partial<S> | ((state: Readonly<S>) => Partial<S>), callback?: () => void): void;
    forceUpdate(callback?: () => void): void;
  }
  function createElement(type: any, props?: any, ...children: any[]): any;
}
declare const ReactDOM: {
  render(component: any, container: Element | null): void;
};
