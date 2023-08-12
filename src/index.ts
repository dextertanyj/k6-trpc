import { type AnyProcedure, type AnyRouter } from "@trpc/server";
import SuperJSON from "superjson";

import { get, post } from "k6/http";

// We need this to polyfill the URL class that is used in SuperJSON.
require("https://jslib.k6.io/url/1.0.0/index.js");

export const NONE = Symbol();

type GetRouterKeys<T extends AnyRouter> = Exclude<keyof T, keyof AnyRouter>;

type GetProcedureType<T extends AnyProcedure> = T["_type"];

type ProcedurePaths<
  R extends AnyRouter,
  T extends GetProcedureType<AnyProcedure>,
> = GetRouterKeys<R> extends infer K
  ? K extends string & keyof R
    ? R[K] extends AnyProcedure
      ? GetProcedureType<R[K]> extends T
        ? K
        : never
      : never
    : never
  : never;

type RouterPaths<R extends AnyRouter> = GetRouterKeys<R> extends infer K
  ? K extends string & keyof R
    ? R[K] extends AnyRouter
      ? RouterPaths<R[K]> extends infer Child
        ? Child extends string
          ? Child extends ""
            ? K
            : `${K}.${Child}`
          : never
        : never
      : R[K] extends AnyProcedure
      ? ""
      : never
    : never
  : never;

type GetInputType<P extends string, R extends AnyRouter> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof R
    ? R[K] extends AnyRouter
      ? GetInputType<Rest, R[K]>
      : never
    : never
  : P extends keyof R
  ? R[P] extends infer T
    ? T extends AnyProcedure
      ? T["_def"]["_input_in"] extends infer input
        ? input extends symbol
          ? typeof NONE
          : input
        : never
      : never
    : never
  : never;

type Router<R extends AnyRouter, P extends RouterPaths<R>> = P extends `${infer K extends
  string}.${infer Rest}`
  ? K extends keyof R
    ? R[K] extends AnyRouter
      ? Rest extends RouterPaths<R[K]>
        ? Router<R[K], Rest>
        : never
      : never
    : never
  : P extends keyof R
  ? R[P] extends AnyRouter
    ? R[P]
    : never
  : P extends ""
  ? R
  : never;

export const createClient = <R extends AnyRouter>(url: string) => {
  const createRouter = <P extends RouterPaths<R>>(path: P) => {
    const routerURL = new URL(path, url).toString();

    const createQuery =
      <K extends ProcedurePaths<Router<R, P>, "query">>(name: K) =>
      (payload: GetInputType<K, Router<R, P>>, options: Parameters<typeof get>[1]) => {
        const endpoint = `${routerURL}.${name}`;
        if (payload === NONE) {
          return get(endpoint, options);
        }

        return get(
          `${endpoint}?input=${encodeURIComponent(SuperJSON.stringify(payload))}`,
          options,
        );
      };

    const createMutation =
      <K extends ProcedurePaths<Router<R, P>, "mutation">>(name: K) =>
      (payload: GetInputType<K, Router<R, P>>, options: Parameters<typeof post>[2]) => {
        const endpoint = `${routerURL}.${name}`;
        if (payload === NONE) {
          return post(endpoint, undefined, options);
        }

        return post(endpoint, SuperJSON.stringify(payload), options);
      };

    return {
      createQuery,
      createMutation,
    };
  };

  return {
    createRouter,
  };
};
