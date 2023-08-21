import {
  type AnyProcedure,
  type AnyRouter,
  type CombinedDataTransformer,
  type DataTransformer,
  defaultTransformer,
} from "@trpc/server";

import http, { type get, type Params, type post } from "k6/http";

// We need this to polyfill the URL class.
require("https://jslib.k6.io/url/1.0.0/index.js");

const NONE = Symbol();
const OPTION = Symbol();

export function options(options: Omit<Params, "responseCallback">) {
  return { [OPTION]: "OPTION", ...options };
}

type RouterKeys<T extends AnyRouter> = Exclude<keyof T, keyof AnyRouter>;

type ProcedureType<T extends AnyProcedure> = T["_type"];

type InputType<P extends AnyProcedure> = P["_def"]["_input_in"] extends infer input
  ? input extends symbol
    ? typeof NONE
    : input
  : never;

type Handler<R extends AnyRouter, K extends keyof R> = R[K] extends AnyRouter
  ? Client<R[K]>
  : R[K] extends AnyProcedure
  ? ProcedureType<R[K]> extends infer T
    ? InputType<R[K]> extends infer I
      ? T extends "query"
        ? {
            query: I extends typeof NONE
              ? (opts?: ReturnType<typeof options>) => ReturnType<typeof get>
              : (input: I, opts?: ReturnType<typeof options>) => ReturnType<typeof get>;
          }
        : T extends "mutation"
        ? {
            mutate: I extends typeof NONE
              ? (opts?: ReturnType<typeof options>) => ReturnType<typeof post>
              : (input: I, opts?: ReturnType<typeof options>) => ReturnType<typeof post>;
          }
        : never
      : never
    : never
  : never;

export type Client<R extends AnyRouter> = {
  [K in RouterKeys<R>]: Handler<R, K>;
};

const isCombinedDataTransformer = (
  transformer: CombinedDataTransformer | DataTransformer,
): transformer is CombinedDataTransformer => {
  return Object.prototype.hasOwnProperty.call(transformer, "input");
};

const isOptions = (opts: unknown): opts is ReturnType<typeof options> => {
  return (
    typeof opts === "object" && opts !== null && Object.prototype.hasOwnProperty.call(opts, OPTION)
  );
};

const createFunctionHandler = (
  url: string,
  property: string,
  transformer: CombinedDataTransformer | DataTransformer,
) => {
  return (...args: unknown[]) => {
    let opts: ReturnType<typeof options> | undefined;
    let input: unknown = NONE;

    if (args.length === 2) {
      input = args[0];
      if (isOptions(args[1])) {
        opts = args[1];
      }
    }
    if (args.length === 1) {
      if (isOptions(args[0])) {
        opts = args[0];
      } else {
        input = args[0];
      }
    }

    let trimmedOpts: Params | undefined;
    if (opts) {
      const { [OPTION]: _, ...rest } = opts;
      trimmedOpts = rest;
    }

    let serializedInput: string | undefined;
    if (input !== NONE) {
      if (isCombinedDataTransformer(transformer)) {
        serializedInput = JSON.stringify(transformer.input.serialize(input));
      } else {
        serializedInput = JSON.stringify(transformer.serialize(input));
      }
    }

    if (property === "query" && serializedInput === undefined) {
      return http.get(url, trimmedOpts);
    }
    if (property === "query") {
      return http.get(`${url}?input=${serializedInput}`, opts);
    }

    return http.post(url, serializedInput, trimmedOpts);
  };
};

const createProxyHandler = (
  {
    url,
    transformer = defaultTransformer,
  }: {
    url: string;
    transformer?: CombinedDataTransformer | DataTransformer;
  },
  path = "",
) => {
  return {
    // @ts-expect-error: Proxy is not typed
    get(_: unknown, property: string) {
      const base = new URL(path, url).toString();
      const resource = path === "" ? property : path + "." + property;

      if (property === "query" || property === "mutate") {
        const target = createFunctionHandler(base, property, transformer);
        const handler = createProxyHandler({ url, transformer }, resource);

        return new Proxy(target, handler);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return createClientImplementation({ url, transformer }, resource);
    },
  };
};

// @ts-expect-error: Proxy is not typed
const createClientImplementation = (
  {
    url,
    transformer = defaultTransformer,
  }: {
    url: string;
    transformer?: CombinedDataTransformer | DataTransformer;
  },
  path = "",
) => {
  const handler = createProxyHandler({ url, transformer }, path);

  return new Proxy({}, handler);
};

export const createClient = <R extends AnyRouter>(
  url: string,
  transformer?: CombinedDataTransformer | DataTransformer,
) => {
  // Ensure that the URL ends with a slash.
  if (!url.endsWith("/")) {
    url.concat("/");
  }

  return createClientImplementation({ url, transformer }) as Client<R>;
};
