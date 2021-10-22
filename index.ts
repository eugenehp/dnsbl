"use strict";

import { Resolver } from 'dns';
import pMap from 'p-map'
import { promisify } from 'util';
import ptr from './ptr'

const CISCO_OPEN_DNS = `208.67.220.220`
const DEFAULT_TIMEOUT = 5000 // 5 seconds
const DEFAULT_CONCURRENCY = 64

type Options = {
  timeout: number;
  servers: string[];
  concurrency: number;
  includeTxt: boolean;
}

type Item = {
  blacklist: string;
  address: string;

  listed?: boolean;
  txt?: string[][];
}

export type Response = {
  listed: boolean;
  txt: string[][]
}

const defaults = {
  timeout: DEFAULT_TIMEOUT,
  servers: [CISCO_OPEN_DNS],
  concurrency: DEFAULT_CONCURRENCY,
  includeTxt: false,
};

const noop = ():Promise<string[][]> => new Promise((res, rej) => {
  const s:string[][] = []

  res(s)
})

const query = (addr:string, blacklist:string, opts:Partial<Options> = defaults):Promise<Response> =>
new Promise(async (resolve, reject) => {
  const servers:string[] = opts.servers ? Array.isArray(opts.servers) ? opts.servers : [opts.servers] : []
  const resolver = new Resolver()
  resolver.setServers(servers);

  const resolve4 = promisify(resolver.resolve4.bind(resolver))
  const resolveTxt = promisify(resolver.resolveTxt.bind(resolver))

  const name = ptr(addr).replace(/\.i.+/, "") + "." + blacklist;

  const timeout = setTimeout(() => {
    resolver.cancel();
    opts.includeTxt ? resolve({listed: false, txt: []}) : noop()
  }, opts.timeout);

  try {
    const [addrs, txt] = await Promise.all([
      resolve4(name),
      resolveTxt(name),
    ]);

    clearTimeout(timeout);

    const listed = Boolean(addrs.length);
    resolve(opts.includeTxt ? {listed, txt} : {listed, txt:[]})
  } catch (err) {
    resolve({listed: false, txt: []})
  }
})

export const lookup = async (addr:string, blacklist:string) => {
  const result = await query(addr, blacklist, defaults);
  return result.listed;
};

export const lookupWithTxt = async (addr:string, blacklist:string) => {
  const result = await query(addr, blacklist, {...defaults, includeTxt:  true});
  return result;
};

export const batch = async (addrs:string, lists:string[], opts:Partial<Options> = defaults) => {
  opts = Object.assign({}, defaults, opts);

  const items:Item[] = [];
  (Array.isArray(addrs) ? addrs : [addrs]).forEach(address => {
    (Array.isArray(lists) ? lists : [lists]).forEach(blacklist => {
      items.push({blacklist, address});
    });
  });

  const concurrency = opts.concurrency
  const results = await pMap(items, item => {
    return query(item.address, item.blacklist, opts);
  }, {concurrency});

  return items.map((item, i) => {
    const result = results[i] as Item
    item.listed = result.listed;
    item.txt = result.txt;
    return item;
  });
};

export default {
  lookup,
  lookupWithTxt,
  batch
}
