"use strict";

import { Resolver } from "dns/promises"
import pMap from 'p-map'
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

const query = (addr:string, blacklist:string, opts:Partial<Options> = defaults) =>
new Promise(async (resolve, reject) => {
  const servers:string[] = opts.servers ? Array.isArray(opts.servers) ? opts.servers : [opts.servers] : []
  const resolver = new Resolver()
  resolver.setServers(servers);

  const name = ptr(addr).replace(/\.i.+/, "") + "." + blacklist;

  const timeout = setTimeout(() => {
    resolver.cancel();
    resolve(opts.includeTxt ? {listed: false, txt: []} : false)
  }, opts.timeout);

  try {
    const [addrs, txt] = await Promise.all([
      resolver.resolve4(name),
      opts.includeTxt ? resolver.resolveTxt(name) : noop(),
    ]);

    clearTimeout(timeout);

    const listed = Boolean(addrs.length);
    resolve(opts.includeTxt ? {listed, txt} : listed)
  } catch (err) {
    resolve(opts.includeTxt ? {listed: false, txt: []} : false)
  }
})

export const lookup = async (addr:string, blacklist:string, opts:Partial<Options> = defaults) => {
  opts = Object.assign({}, defaults, opts);
  const result = await query(addr, blacklist, opts);
  return result;
};

type Item = {
  blacklist: string;
  address: string;

  listed?: boolean;
  txt?: string[][];
}

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
    if (opts.includeTxt!) {
      const result = results[i] as Item
      item.listed = result.listed;
      item.txt = result.txt;
    } else {
      item.listed = results[i] as boolean;
    }
    return item;
  });
};

export default {
  lookup,
  batch
}